// server.js
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcrypt');
const db = require('./config/db');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// --- API de registre d'usuaris ---
app.post('/api/register', async (req, res) => {
    const { usuari, correu, password } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query(
            'INSERT INTO Usuaris (usuari, correu, contrasenya) VALUES (?, ?, ?)',
            [usuari, correu, hashedPassword]
        );
        res.json({ success: true, message: 'Usuari registrat correctament' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al registrar usuari' });
    }
});

// --- API de login ---
app.post('/api/login', async (req, res) => {
    const { correu, password } = req.body;

    try {
        const [rows] = await pool.query('SELECT * FROM Usuaris WHERE correu = ?', [correu]);
        if (rows.length === 0) return res.status(401).json({ error: 'Usuari no trobat' });

        const user = rows[0];
        const match = await bcrypt.compare(password, user.contrasenya);
        if (!match) return res.status(401).json({ error: 'Contrasenya incorrecta' });

        res.json({ success: true, userId: user.id, usuari: user.usuari });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

// --- API per guardar sessió (exemple SessionsVersus) ---
app.post('/api/session/save', async (req, res) => {
    const { creadorId } = req.body;
    const sessionId = uuidv4().slice(0, 8);

    try {
        await pool.query(
            'INSERT INTO SessionsVersus (codi_acces, estat, creador_id) VALUES (?, ?, ?)',
            [sessionId, 'oberta', creadorId]
        );
        res.json({ success: true, sessionId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al crear la sessió' });
    }
});
// crear sessió de boss
app.post('/api/boss/create', async (req, res) => {
    const { jefeVidaMax = 300, maxParticipants = 10 } = req.body;

    try {
        const [result] = await pool.query(
            'INSERT INTO Boss_Sessions (jefe_vida_max, jefe_vida_actual, max_participants) VALUES (?, ?, ?)',
            [jefeVidaMax, jefeVidaMax, maxParticipants]
        );
        res.json({ success: true, bossId: result.insertId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al crear la sessió de boss' });
    }
});
// unir-se a sessió de boss
app.post('/api/boss/join', async (req, res) => {
    const { bossId, usuariId } = req.body;

    try {
        // comprovar si el jugador ja està inscrit
        const [exists] = await pool.query(
            'SELECT * FROM Boss_Participants WHERE id_boss_sessio = ? AND id_usuari = ?',
            [bossId, usuariId]
        );

        if (exists.length > 0) return res.status(400).json({ error: 'Ja estàs inscrit a aquesta sessió' });

        // inserir participant
        await pool.query(
            'INSERT INTO Boss_Participants (id_boss_sessio, id_usuari) VALUES (?, ?)',
            [bossId, usuariId]
        );
        res.json({ success: true, message: 'Participant afegit' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al unir-se a la sessió de boss' });
    }
});
// atacar el boss
app.post('/api/boss/attack', async (req, res) => {
    const { bossId, usuariId, damage = 8 } = req.body;

    try {
        // sumar damage del participant
        await pool.query(
            'UPDATE Boss_Participants SET damage = damage + ? WHERE id_boss_sessio = ? AND id_usuari = ?',
            [damage, bossId, usuariId]
        );

        // restar vida del boss
        await pool.query(
            'UPDATE Boss_Sessions SET jefe_vida_actual = jefe_vida_actual - ? WHERE id = ?',
            [damage, bossId]
        );

        // obtenir nova vida del boss
        const [rows] = await pool.query('SELECT jefe_vida_actual FROM Boss_Sessions WHERE id = ?', [bossId]);
        res.json({ success: true, vidaActual: rows[0].jefe_vida_actual });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al atacar el boss' });
    }
});
app.get('/api/boss/:bossId', async (req, res) => {
    const { bossId } = req.params;

    try {
        const [bossRows] = await pool.query('SELECT * FROM Boss_Sessions WHERE id = ?', [bossId]);
        if (bossRows.length === 0) return res.status(404).json({ error: 'Sessió de boss no trobada' });

        const [participants] = await pool.query(
            'SELECT u.id, u.usuari, bp.damage FROM Boss_Participants bp JOIN Usuaris u ON bp.id_usuari = u.id WHERE bp.id_boss_sessio = ?',
            [bossId]
        );

        res.json({ boss: bossRows[0], participants });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error obtenint estat del boss' });
    }
});


app.get('/', (req, res) => {
    res.send('Servidor Express actiu! APIs: /api/register, /api/login, /api/session/save,/api/session/save,/api/boss/create,/api/boss/join,/api/boss/attack,/api/boss/:bossId');
});

// --- WebSocket ---
const wss = new WebSocket.Server({ port: process.env.WS_PORT || 8080 }, () => {
    console.log('Servidor WebSocket en marxa al port 8080');
});

const clients = new Map();
const sessions = new Map();
const userSessions = new Map();
const userStates = new Map();

wss.on('connection', (ws) => {
    const clientId = uuidv4();
    clients.set(clientId, ws);
    ws.send(JSON.stringify({ type: 'welcome', clientId }));

    ws.on('message', (message) => {
        let data;
        try { data = JSON.parse(message); } 
        catch { data = { type: 'text', message }; }

        const type = data.type;

        if (type === 'JOIN_SESSION') {
            const sessionId = data.sessionId;
            if (!sessions.has(sessionId)) sessions.set(sessionId, new Set());
            sessions.get(sessionId).add(clientId);
            userSessions.set(clientId, sessionId);
            if (!userStates.has(sessionId)) userStates.set(sessionId, {});
            ws.send(JSON.stringify({ type: 'SESSION_STATE', state: userStates.get(sessionId) }));
        }

        else if (type === 'REPS_UPDATE') {
            const sessionId = data.sessionId;
            if (!sessions.has(sessionId)) return;
            const state = userStates.get(sessionId);
            state[clientId] = data.reps;

            for (const id of sessions.get(sessionId)) {
                const client = clients.get(id);
                if (client && client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ type: 'SESSION_STATE', state }));
                }
            }
        }
    });

    ws.on('close', () => {
        const sessionId = userSessions.get(clientId);
        if (sessionId && sessions.has(sessionId)) {
            sessions.get(sessionId).delete(clientId);
            delete userStates[sessionId]?.[clientId];
            if (sessions.get(sessionId).size === 0) {
                sessions.delete(sessionId);
                userStates.delete(sessionId);
            } else {
                for (const id of sessions.get(sessionId)) {
                    const client = clients.get(id);
                    if (client && client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({ type: 'SESSION_STATE', state: userStates.get(sessionId) }));
                    }
                }
            }
        }
        clients.delete(clientId);
        userSessions.delete(clientId);
    });
});

app.listen(process.env.API_PORT || 3000, () => console.log('Servidor Express al port 3000'));
