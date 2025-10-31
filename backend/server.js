// ...existing code...
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcrypt');
const db = require('./config/db'); // exporta pool mysql2/promise
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

const app = express();

// Leer puertos / origen desde .env con valores por defecto
const API_PORT = process.env.API_PORT || 9000;
const WS_PORT = process.env.WS_PORT || 8080;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:3000';

// -------------------- CORS CONFIG --------------------
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

  if (req.method === 'OPTIONS') {
    // responder preflight aquí sin usar app.options('*', ...)
    return res.sendStatus(204);
  }
  next();
});

// -------------------- BODY PARSER --------------------
app.use(bodyParser.json());

// -------------------- RUTAS API --------------------

// Ruta raíz
app.get('/', (req, res) => {
  console.log('[ROOT] Request desde:', req.headers.origin);
  res.send('Servidor Express activo! Rutas: /api/register, /api/login, /api/session/save, /api/boss/create, /api/boss/join, /api/boss/attack, /api/boss/:bossId');
});

// Registrar usuario
// ...existing code...
app.post('/api/register', async (req, res) => {
  console.log('[REGISTER] Origin:', req.headers.origin);
  console.log('[REGISTER] Body recibido:', req.body);
  const { usuari, correu, password } = req.body;
  try {
    const hashed = await bcrypt.hash(password, 10);
    await db.pool.query(
      'INSERT INTO Usuaris (usuari, correu, contrasenya) VALUES (?,?,?)',
      [usuari, correu, hashed]
    );
    console.log('[REGISTER] Usuario registrado correctamente');
    return res.json({ success: true, message: 'Usuario registrado correctamente' });
  } catch (err) {
    // Logging detallado para diagnosticar 500
    console.error('[REGISTER ERROR] message:', err.message);
    if (err.code) console.error('[REGISTER ERROR] code:', err.code);
    if (err.sqlMessage) console.error('[REGISTER ERROR] sqlMessage:', err.sqlMessage);
    console.error(err.stack);
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, error: 'El correo o usuario ya está registrado' });
    }
    return res.status(500).json({ success: false, error: 'Error al registrar usuario' });
  }
});
// ...existing code...
// Login
app.post('/api/login', async (req, res) => {
  console.log('[LOGIN] Origin:', req.headers.origin);
  console.log('[LOGIN] Body recibido:', req.body);
  const { correu, password } = req.body;
  try {
    const [rows] = await db.pool.query('SELECT * FROM Usuaris WHERE correu=?', [correu]);
    if (rows.length === 0) {
      console.log('[LOGIN] Usuario no encontrado');
      return res.status(401).json({ success: false, error: 'Usuario no encontrado' });
    }
    const user = rows[0];
    const match = await bcrypt.compare(password, user.contrasenya);
    if (!match) {
      console.log('[LOGIN] Contraseña incorrecta');
      return res.status(401).json({ success: false, error: 'Contraseña incorrecta' });
    }
    console.log('[LOGIN] Usuario logueado:', user.usuari);
    res.json({ success: true, userId: user.id, usuari: user.usuari });
  } catch (err) {
    console.error('[LOGIN ERROR]', err);
    res.status(500).json({ success: false, error: 'Error del servidor' });
  }
});

// Crear sesión Versus
app.post('/api/session/save', async (req, res) => {
  console.log('[SESSION SAVE] Origin:', req.headers.origin);
  console.log('[SESSION SAVE] Body recibido:', req.body);
  const { creadorId } = req.body;
  const sessionId = uuidv4().slice(0, 8);
  try {
    await db.pool.query(
      'INSERT INTO SessionsVersus (codi_acces, estat, creador_id) VALUES (?,?,?)',
      [sessionId, 'oberta', creadorId]
    );
    console.log('[SESSION SAVE] Sessió creada:', sessionId);
    res.json({ success: true, sessionId });
  } catch (err) {
    console.error('[SESSION SAVE ERROR]', err);
    res.status(500).json({ success: false, error: 'Error al crear sessió' });
  }
});

// Crear Boss
app.post('/api/boss/create', async (req, res) => {
  console.log('[BOSS CREATE] Origin:', req.headers.origin);
  console.log('[BOSS CREATE] Body recibido:', req.body);
  const { jefeVidaMax = 300, maxParticipants = 10 } = req.body;
  try {
    const [result] = await db.pool.query(
      'INSERT INTO Boss_Sessions (jefe_vida_max, jefe_vida_actual, max_participants) VALUES (?,?,?)',
      [jefeVidaMax, jefeVidaMax, maxParticipants]
    );
    console.log('[BOSS CREATE] Boss creado con id:', result.insertId);
    res.json({ success: true, bossId: result.insertId });
  } catch (err) {
    console.error('[BOSS CREATE ERROR]', err);
    res.status(500).json({ success: false, error: 'Error al crear boss' });
  }
});

// Unirse al Boss
app.post('/api/boss/join', async (req, res) => {
  console.log('[BOSS JOIN] Origin:', req.headers.origin);
  console.log('[BOSS JOIN] Body recibido:', req.body);
  const { bossId, usuariId } = req.body;
  try {
    const [exists] = await db.pool.query(
      'SELECT * FROM Boss_Participants WHERE id_boss_sessio=? AND id_usuari=?',
      [bossId, usuariId]
    );
    if (exists.length > 0) {
      console.log('[BOSS JOIN] Usuario ya inscrito');
      return res.status(400).json({ error: 'Ya estás inscrito a esta sesión' });
    }
    await db.pool.query(
      'INSERT INTO Boss_Participants (id_boss_sessio, id_usuari) VALUES (?,?)',
      [bossId, usuariId]
    );
    console.log('[BOSS JOIN] Usuario añadido a la sesión');
    res.json({ success: true, message: 'Participante agregado' });
  } catch (err) {
    console.error('[BOSS JOIN ERROR]', err);
    res.status(500).json({ error: 'Error al unirse a la sesión de boss' });
  }
});

// Atacar Boss
app.post('/api/boss/attack', async (req, res) => {
  console.log('[BOSS ATTACK] Origin:', req.headers.origin);
  console.log('[BOSS ATTACK] Body recibido:', req.body);
  const { bossId, usuariId, damage = 8 } = req.body;
  try {
    await db.pool.query(
      'UPDATE Boss_Participants SET damage=damage+? WHERE id_boss_sessio=? AND id_usuari=?',
      [damage, bossId, usuariId]
    );
    await db.pool.query(
      'UPDATE Boss_Sessions SET jefe_vida_actual=jefe_vida_actual-? WHERE id=?',
      [damage, bossId]
    );
    const [rows] = await db.pool.query('SELECT jefe_vida_actual FROM Boss_Sessions WHERE id=?', [bossId]);
    res.json({ success: true, vidaActual: rows[0].jefe_vida_actual });
  } catch (err) {
    console.error('[BOSS ATTACK ERROR]', err);
    res.status(500).json({ error: 'Error al atacar el boss' });
  }
});

// Estado Boss
app.get('/api/boss/:bossId', async (req, res) => {
  console.log('[BOSS STATE] Origin:', req.headers.origin);
  console.log('[BOSS STATE] Params recibidos:', req.params);
  const { bossId } = req.params;
  try {
    const [bossRows] = await db.pool.query('SELECT * FROM Boss_Sessions WHERE id=?', [bossId]);
    if (bossRows.length === 0) {
      console.log('[BOSS STATE] Boss no encontrado');
      return res.status(404).json({ error: 'Sesión de boss no encontrada' });
    }
    const [participants] = await db.pool.query(
      'SELECT u.id, u.usuari, bp.damage FROM Boss_Participants bp JOIN Usuaris u ON bp.id_usuari=u.id WHERE bp.id_boss_sessio=?',
      [bossId]
    );
    res.json({ boss: bossRows[0], participants });
  } catch (err) {
    console.error('[BOSS STATE ERROR]', err);
    res.status(500).json({ error: 'Error obteniendo estado del boss' });
  }
});

// -------------------- SERVIDOR WEBSOCKET --------------------
const wss = new WebSocket.Server({ port: WS_PORT }, () => {
  console.log(`Servidor WebSocket en marcha en el puerto ${WS_PORT}`);
});

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