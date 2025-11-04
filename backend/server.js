// ...existing code...
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcrypt');
const db = require('./config/db'); // Debe exportar pool de mysql2/promise
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

const app = express();

// Extraemos el pool de la conexión de la base de datos para usarlo directamente
// Asumo que 'db' exporta algo como { pool: <el_pool_de_mysql> }
const pool = db.pool;

// --- Middlewares ---

// CORS (Configuración simple para desarrollo. Si necesitas orígenes específicos, modifícalo)
// Nota: La configuración por defecto de cors() permite cualquier origen, lo cual es útil en desarrollo.
// Si deseas restringir, usa la configuración avanzada como en el ejemplo anterior.
app.use(cors({
    origin: ['http://localhost:3001', 'http://localhost:5173'], // Orígenes permitidos específicos
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

app.use(bodyParser.json());

// --- RUTAS API ---

/**
 * @route POST /api/register
 * @desc Registra un nuevo usuario
 */
app.post('/api/register', async (req, res) => {
    const { usuari, correu, password } = req.body;
    console.log(`[API] Registro: ${usuari}, ${correu}`);

    if (!usuari || !correu || !password) {
        return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        // Uso de 'pool.query' corregido
        await pool.query(
            'INSERT INTO Usuaris (usuari, correu, contrasenya) VALUES (?, ?, ?)',
            [usuari, correu, hashedPassword]
        );
        res.json({ success: true, message: 'Usuari registrat correctament' });
    } catch (err) {
        console.error('[REGISTER ERROR]', err);
        // Código 1062 es para entradas duplicadas (ej. correo ya existe)
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'El correu o usuari ja està registrat' });
        }
        res.status(500).json({ error: 'Error al registrar usuari' });
    }
});

/**
 * @route POST /api/login
 * @desc Autentica un usuario
 */
app.post('/api/login', async (req, res) => {
    const { correu, password } = req.body;
    console.log(`[API] Login: ${correu}`);

    try {
        // Uso de 'pool.query' corregido
        const [rows] = await pool.query('SELECT * FROM Usuaris WHERE correu = ?', [correu]);
        if (rows.length === 0) return res.status(401).json({ error: 'Usuari no trobat' });

        const user = rows[0];
        const match = await bcrypt.compare(password, user.contrasenya);
        if (!match) return res.status(401).json({ error: 'Contrasenya incorrecta' });

        res.json({ success: true, userId: user.id, usuari: user.usuari });
    } catch (err) {
        console.error('[LOGIN ERROR]', err);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

/**
 * @route POST /api/session/save
 * @desc Crea una nueva sesión Versus
 */
app.post('/api/session/save', async (req, res) => {
    const { creadorId } = req.body;
    const sessionId = uuidv4().slice(0, 8);
    console.log(`[API] Creando sesión Versus: ${sessionId} por ${creadorId}`);

    try {
        // Uso de 'pool.query' corregido
        await pool.query(
            'INSERT INTO SessionsVersus (codi_acces, estat, creador_id) VALUES (?, ?, ?)',
            [sessionId, 'oberta', creadorId]
        );
        res.json({ success: true, sessionId });
    } catch (err) {
        console.error('[SESSION SAVE ERROR]', err);
        res.status(500).json({ error: 'Error al crear la sessió' });
    }
});

/**
 * @route POST /api/boss/create
 * @desc Crea una nueva sesión de Boss
 */
app.post('/api/boss/create', async (req, res) => {
    const { jefeVidaMax = 300, maxParticipants = 10 } = req.body;
    console.log('[API] Creando sesión de Boss');

    try {
        // Uso de 'pool.query' corregido
        const [result] = await pool.query(
            'INSERT INTO Boss_Sessions (jefe_vida_max, jefe_vida_actual, max_participants) VALUES (?, ?, ?)',
            [jefeVidaMax, jefeVidaMax, maxParticipants]
        );
        res.json({ success: true, bossId: result.insertId });
    } catch (err) {
        console.error('[BOSS CREATE ERROR]', err);
        res.status(500).json({ error: 'Error al crear la sessió de boss' });
    }
});

/**
 * @route POST /api/boss/join
 * @desc Une un usuario a una sesión de Boss
 */
app.post('/api/boss/join', async (req, res) => {
    const { bossId, usuariId } = req.body;
    console.log(`[API] Unir a Boss: Boss ${bossId}, Usuario ${usuariId}`);

    try {
        // Uso de 'pool.query' corregido
        const [exists] = await pool.query(
            'SELECT * FROM Boss_Participants WHERE id_boss_sessio = ? AND id_usuari = ?',
            [bossId, usuariId]
        );

        if (exists.length > 0) return res.status(400).json({ error: 'Ja estàs inscrit a aquesta sessió' });

        // Uso de 'pool.query' corregido
        await pool.query(
            'INSERT INTO Boss_Participants (id_boss_sessio, id_usuari) VALUES (?, ?)',
            [bossId, usuariId]
        );
        res.json({ success: true, message: 'Participant afegit' });
    } catch (err) {
        console.error('[BOSS JOIN ERROR]', err);
        res.status(500).json({ error: 'Error al unir-se a la sessió de boss' });
    }
});

/**
 * @route POST /api/boss/attack
 * @desc Registra un ataque a un Boss
 */
app.post('/api/boss/attack', async (req, res) => {
    const { bossId, usuariId, damage = 8 } = req.body;
    console.log(`[API] Ataque a Boss ${bossId}: Usuario ${usuariId}, Daño ${damage}`);

    try {
        // 1. Sumar damage del participant (Uso de 'pool.query' corregido)
        await pool.query(
            'UPDATE Boss_Participants SET damage = damage + ? WHERE id_boss_sessio = ? AND id_usuari = ?',
            [damage, bossId, usuariId]
        );

        // 2. Restar vida del boss (Uso de 'pool.query' corregido)
        await pool.query(
            'UPDATE Boss_Sessions SET jefe_vida_actual = jefe_vida_actual - ? WHERE id = ?',
            [damage, bossId]
        );

        // 3. Obtener nueva vida del boss (Uso de 'pool.query' corregido)
        const [rows] = await pool.query('SELECT jefe_vida_actual FROM Boss_Sessions WHERE id = ?', [bossId]);
        res.json({ success: true, vidaActual: rows[0].jefe_vida_actual });
    } catch (err) {
        console.error('[BOSS ATTACK ERROR]', err);
        res.status(500).json({ error: 'Error al atacar el boss' });
    }
});

/**
 * @route GET /api/boss/:bossId
 * @desc Obtiene el estado de un Boss y sus participantes
 */
app.get('/api/boss/:bossId', async (req, res) => {
    const { bossId } = req.params;
    console.log(`[API] Estado de Boss: ${bossId}`);

    try {
        // Uso de 'pool.query' corregido
        const [bossRows] = await pool.query('SELECT * FROM Boss_Sessions WHERE id = ?', [bossId]);
        if (bossRows.length === 0) return res.status(404).json({ error: 'Sessió de boss no trobada' });

        // Uso de 'pool.query' corregido
        const [participants] = await pool.query(
            'SELECT u.id, u.usuari, bp.damage FROM Boss_Participants bp JOIN Usuaris u ON bp.id_usuari = u.id WHERE bp.id_boss_sessio = ?',
            [bossId]
        );

        res.json({ boss: bossRows[0], participants });
    } catch (err) {
        console.error('[BOSS STATE ERROR]', err);
        res.status(500).json({ error: 'Error obtenint estat del boss' });
    }
});


/**
 * @route GET /
 * @desc Ruta base del servidor
 */
app.get('/', (req, res) => {
    res.send('Servidor Express actiu! APIs: /api/register, /api/login, /api/session/save, /api/boss/create, /api/boss/join, /api/boss/attack, /api/boss/:bossId');
});

// --- Configuración y Lógica de WebSocket ---

const wss = new WebSocket.Server({ port: process.env.WS_PORT || 8080 }, () => {
    console.log(`Servidor WebSocket en marxa al port ${process.env.WS_PORT || 8080}`);
});

const clients = new Map();
const sessions = new Map();
const userSessions = new Map();
const userStates = new Map(); // Guarda { sessionId: { clientId: reps } }

<<<<<<< HEAD
wss.on('connection', (ws) => {
    const clientId = uuidv4();
    clients.set(clientId, ws);
    ws.send(JSON.stringify({ type: 'welcome', clientId }));
    console.log(`[WS] Nuevo cliente conectado: ${clientId}`);

    ws.on('message', (message) => {
        let data;
        try {
            data = JSON.parse(message);
        } catch (e) {
            console.error('[WS ERROR] No se pudo parsear el mensaje JSON:', message.toString().substring(0, 50) + '...');
            // Ignoramos el mensaje malformado en lugar de dejar que el servidor caiga
            return;
        }

        const type = data.type;
        console.log(`[WS] Mensaje recibido de ${clientId}: ${type}`);

        if (type === 'JOIN_SESSION') {
            const sessionId = data.sessionId;
            if (!sessionId) return;

            if (!sessions.has(sessionId)) sessions.set(sessionId, new Set());
            sessions.get(sessionId).add(clientId);
            userSessions.set(clientId, sessionId);

            // Inicializar o enviar el estado actual de la sesión
            if (!userStates.has(sessionId)) userStates.set(sessionId, {});
            ws.send(JSON.stringify({ type: 'SESSION_STATE', state: userStates.get(sessionId) }));
            console.log(`[WS] Cliente ${clientId} unido a la sesión ${sessionId}. Total: ${sessions.get(sessionId).size}`);
        }
        else if (type === 'REPS_UPDATE') {
            const sessionId = userSessions.get(clientId); // Usamos userSessions para asegurar que está en una sesión
            if (!sessionId || !sessions.has(sessionId)) return;

            const state = userStates.get(sessionId);
            // Asegurarse de que data.reps es un número válido si es necesario
            state[clientId] = data.reps;

            // Broadcast del estado a todos los clientes de la sesión
            for (const id of sessions.get(sessionId)) {
                const client = clients.get(id);
                if (client && client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify({ type: 'SESSION_STATE', state }));
                }
            }
        }
    });

    ws.on('close', () => {
        console.log(`[WS] Cliente desconectado: ${clientId}`);
        const sessionId = userSessions.get(clientId);
        
        if (sessionId && sessions.has(sessionId)) {
            sessions.get(sessionId).delete(clientId);
            
            // Eliminar el estado del usuario de la sesión
            const sessionState = userStates.get(sessionId);
            if(sessionState) {
                delete sessionState[clientId];
            }

            // Si la sesión queda vacía, se elimina
            if (sessions.get(sessionId).size === 0) {
                sessions.delete(sessionId);
                userStates.delete(sessionId);
                console.log(`[WS] Sesión eliminada por estar vacía: ${sessionId}`);
            } else {
                // Notificar a los clientes restantes sobre la desconexión
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

// --- Inicio del Servidor Express ---
app.listen(process.env.API_PORT || 3000, () => {
    console.log(`Servidor Express en el puerto ${process.env.API_PORT || 3000}`);
    console.log('----------------------------------------------------');
});
=======
wss.on('connection', ws => {
  const clientId = uuidv4();
  clients.set(clientId, ws);
  ws.send(JSON.stringify({ type: 'welcome', clientId }));

  ws.on('message', message => {
    let data;
    try { data = JSON.parse(message); } catch { data = { type: 'text', message }; }
    const type = data.type;

    if (type === 'JOIN_SESSION') {
      const sessionId = data.sessionId;
      if (!sessions.has(sessionId)) sessions.set(sessionId, new Set());
      sessions.get(sessionId).add(clientId);
      userSessions.set(clientId, sessionId);
      if (!userStates.has(sessionId)) userStates.set(sessionId, {});
      ws.send(JSON.stringify({ type: 'SESSION_STATE', state: userStates.get(sessionId) }));
    } else if (type === 'REPS_UPDATE') {
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
      const state = userStates.get(sessionId);
      if (state) delete state[clientId];
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

// -------------------- INICIAR SERVIDOR --------------------
const httpServer = app.listen(API_PORT, () => console.log(`Servidor Express en puerto ${API_PORT}`));

// Graceful shutdown para evitar puertos ocupados tras CTRL+C
async function shutdown() {
  console.log('Cerrando servidores...');
  try {
    // cerrar WebSocket
    wss.close(() => console.log('WebSocket cerrado.'));
    // cerrar HTTP
    httpServer.close(() => console.log('HTTP server cerrado.'));
    // cerrar pool mysql
    if (db && db.pool && typeof db.pool.end === 'function') {
      await db.pool.end();
      console.log('Pool MySQL cerrado.');
    }
    process.exit(0);
  } catch (err) {
    console.error('Error en shutdown', err);
    process.exit(1);
  }
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
//
>>>>>>> 33ccb00d990a446f1ec4425022e77456edeaa652
