require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcrypt');
const db = require('./config/db'); // exporta pool mysql2/promise
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

const app = express();

const API_PORT = process.env.API_PORT || 9000;
const WS_PORT = process.env.WS_PORT || 8081;

const allowedOrigins = (process.env.FRONTEND_ORIGINS || 'http://localhost:3000,http://localhost:3001')
  .split(',')
  .map(s => s.trim());

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,Origin,X-Requested-With');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(bodyParser.json());

// -------------------- RUTAS API --------------------

// Ruta raíz
app.get('/', (req, res) => {
  res.send('Servidor Express activo! Rutas: /api/register, /api/login, /api/session/save, /api/boss/create, /api/boss/join, /api/boss/attack, /api/boss/:bossId');
});

// Registrar usuario
app.post('/api/register', async (req, res) => {
  const { usuari, correu, password } = req.body;
  try {
    const hashed = await bcrypt.hash(password, 10);
    await db.pool.query(
      'INSERT INTO Usuaris (usuari, correu, contrasenya) VALUES (?,?,?)',
      [usuari, correu, hashed]
    );
    res.json({ success: true, message: 'Usuario registrado correctamente' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ success: false, error: 'El correo o usuario ya está registrado' });
    res.status(500).json({ success: false, error: 'Error al registrar usuario' });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  const { correu, password } = req.body;
  try {
    const [rows] = await db.pool.query('SELECT * FROM Usuaris WHERE correu=?', [correu]);
    if (rows.length === 0) return res.status(401).json({ success: false, error: 'Usuario no encontrado' });

    const user = rows[0];
    const match = await bcrypt.compare(password, user.contrasenya);
    if (!match) return res.status(401).json({ success: false, error: 'Contraseña incorrecta' });

    res.json({ success: true, userId: user.id, usuari: user.usuari });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Error del servidor' });
  }
});

// -------------------- SESIONES 2vs2 --------------------

// ...existing code...
// Crear sesión Versus
app.post('/api/session/save', async (req, res) => {
  // acepta { creadorId, codigo } desde el frontend
  const { creadorId, codigo } = req.body;

  // Si no viene creadorId o viene "invitado" lo tratamos como NULL en la BD
  const creadorDb = (!creadorId || creadorId === 'invitado') ? null : creadorId;

  // si el frontend pasa un código, lo usamos; si no, generamos uno nuevo
  const sessionId = codigo && String(codigo).trim() ? String(codigo).trim() : uuidv4().slice(0, 8);

  try {
    await db.pool.query(
      'INSERT INTO SessionsVersus (codi_acces, estat, creador_id) VALUES (?,?,?)',
      [sessionId, 'oberta', creadorDb]
    );
    res.json({ success: true, sessionId });
  } catch (err) {
    console.error('Error al crear sessió 2vs2:', err);
    res.status(500).json({ success: false, error: 'Error al crear sessió 2vs2' });
  }
});
// Nuevo endpoint para iniciar sesión
app.post('/api/session/start', async (req, res) => {
  const { codigo, iniciadorId } = req.body;
  if (!codigo) return res.status(400).json({ success: false, error: 'Falta el código de sesión' });

  try {
    // Actualiza el estado a 'iniciada'. Si necesitas guardar iniciador, añade columna y query.
    const [result] = await db.pool.query(
      'UPDATE SessionsVersus SET estat = ? WHERE codi_acces = ?',
      ['iniciada', String(codigo).trim()]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Sesión no encontrada' });
    }

    res.json({ success: true, message: 'Sesión iniciada' });
  } catch (err) {
    console.error('Error al iniciar sessió:', err);
    res.status(500).json({ success: false, error: 'Error al iniciar sessió' });
  }
});
// -------------------- BOSS --------------------

// Crear Boss
app.post('/api/boss/create', async (req, res) => {
  const { jefeVidaMax = 300, maxParticipants = 10 } = req.body;
  try {
    const [result] = await db.pool.query(
      'INSERT INTO Boss_Sessions (jefe_vida_max, jefe_vida_actual, max_participants) VALUES (?,?,?)',
      [jefeVidaMax, jefeVidaMax, maxParticipants]
    );
    res.json({ success: true, bossId: result.insertId });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Error al crear boss' });
  }
});

// Unirse al Boss
app.post('/api/boss/join', async (req, res) => {
  const { bossId, usuariId } = req.body;
  try {
    const [exists] = await db.pool.query(
      'SELECT * FROM Boss_Participants WHERE id_boss_sessio=? AND id_usuari=?',
      [bossId, usuariId]
    );
    if (exists.length > 0) return res.status(400).json({ error: 'Ya estás inscrito a esta sesión' });

    await db.pool.query(
      'INSERT INTO Boss_Participants (id_boss_sessio, id_usuari) VALUES (?,?)',
      [bossId, usuariId]
    );
    res.json({ success: true, message: 'Participante agregado' });
  } catch (err) {
    res.status(500).json({ error: 'Error al unirse a la sesión de boss' });
  }
});

// -------------------- WEBSOCKET --------------------
const wss = new WebSocket.Server({ port: WS_PORT });
const clients = new Map();
const sessions = new Map();
const userSessions = new Map();
const userStates = new Map();

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

async function shutdown() {
  console.log('Cerrando servidores...');
  try {
    wss.close(() => console.log('WebSocket cerrado.'));
    httpServer.close(() => console.log('HTTP server cerrado.'));
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
