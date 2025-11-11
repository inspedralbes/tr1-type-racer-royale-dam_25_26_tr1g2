require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const db = require('./config/db'); // exporta pool mysql2/promise
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

const app = express();

// -------------------- PUERTOS --------------------
const API_PORT = process.env.API_PORT || 9000;
const WS_PORT_1 = process.env.WS_PORT_1 || 8080; // WS del código 1
const WS_PORT_2 = process.env.WS_PORT_2 || 8082; // WS del código 2

// -------------------- CORS --------------------
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

// -------------------- RUTA BASE --------------------
app.get('/', (req, res) => {
  res.send('Servidor Express activo! Endpoints: /api/register, /api/login, /api/session/save, /api/rutines, /api/boss/*, /api/multiplayer/*');
});

// -------------------- USUARIOS --------------------
app.post('/api/register', async (req, res) => {
  const { usuari, correu, password } = req.body;
  try {
    const hashed = await bcrypt.hash(password, 10);
    await db.pool.query('INSERT INTO Usuaris (usuari, correu, contrasenya) VALUES (?,?,?)', [usuari, correu, hashed]);
    res.json({ success: true, message: 'Usuario registrado correctamente' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY')
      return res.status(409).json({ success: false, error: 'El correo o usuario ya está registrado' });
    res.status(500).json({ success: false, error: 'Error al registrar usuario' });
  }
});

app.post('/api/login', async (req, res) => {
  const { correu, password } = req.body;
  try {
    const [rows] = await db.pool.query('SELECT * FROM Usuaris WHERE correu=?', [correu]);
    if (rows.length === 0)
      return res.status(401).json({ success: false, error: 'Usuario no encontrado' });

    const user = rows[0];
    const match = await bcrypt.compare(password, user.contrasenya);
    if (!match)
      return res.status(401).json({ success: false, error: 'Contraseña incorrecta' });

    // Transferir rutinas del invitado
    const [guestRows] = await db.pool.query('SELECT id FROM Usuaris WHERE usuari = ?', ['invitado']);
    if (guestRows.length > 0) {
      const invitadoId = guestRows[0].id;
      await db.pool.query('UPDATE Rutines SET id_usuari = ? WHERE id_usuari = ?', [user.id, invitadoId]);
    }

    res.json({ success: true, id: user.id, usuari: user.usuari, message: 'Inicio de sesión correcto' });
  } catch (err) {
    console.error('Error en /api/login:', err);
    res.status(500).json({ success: false, error: 'Error del servidor' });
  }
});

// -------------------- RUTINAS --------------------
app.post('/api/rutines', async (req, res) => {
  const { id_usuari, nom, descripcio } = req.body;
  if (!nom || !String(nom).trim()) {
    return res.status(400).json({ success: false, error: 'El nombre de la rutina (nom) es requerido.' });
  }

  try {
    let userId = id_usuari;
    if (!userId) {
      const [rows] = await db.pool.query('SELECT id FROM Usuaris WHERE usuari = ?', ['invitado']);
      if (rows.length > 0) {
        userId = rows[0].id;
      } else {
        const hashed = await bcrypt.hash('invitado123', 10);
        const [createRes] = await db.pool.query(
          'INSERT INTO Usuaris (usuari, correu, contrasenya) VALUES (?,?,?)',
          ['invitado', 'invitado@local', hashed]
        );
        userId = createRes.insertId;
      }
    }

    const [result] = await db.pool.query(
      'INSERT INTO Rutines (id_usuari, nom, descripcio) VALUES (?,?,?)',
      [userId, nom, descripcio || null]
    );
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    console.error('Error al crear rutina:', err);
    res.status(500).json({ success: false, error: 'Error al crear rutina.' });
  }
});

app.post('/api/exercicis_rutina', async (req, res) => {
  const { id_rutina, nom_exercicis, n_repeticions } = req.body;
  if (!id_rutina || !nom_exercicis || !String(nom_exercicis).trim()) {
    return res.status(400).json({ success: false, error: 'id_rutina y nom_exercicis son requeridos.' });
  }
  try {
    const [result] = await db.pool.query(
      'INSERT INTO Exercicis_Rutina (id_rutina, nom_exercicis, n_repeticions) VALUES (?,?,?)',
      [id_rutina, nom_exercicis, n_repeticions || null]
    );
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    console.error('Error al insertar ejercicio:', err);
    res.status(500).json({ success: false, error: 'Error al insertar ejercicio.' });
  }
});

app.get('/api/rutines/user/:id', async (req, res) => {
  const userId = req.params.id;
  try {
    const [rows] = await db.pool.query(
      `SELECT r.id AS rutina_id, r.nom, r.descripcio, r.data_creacio,
              er.id AS ejercicio_id, er.nom_exercicis, er.n_repeticions
       FROM Rutines r
       LEFT JOIN Exercicis_Rutina er ON er.id_rutina = r.id
       WHERE r.id_usuari = ?
       ORDER BY r.data_creacio DESC`,
      [userId]
    );

    const map = new Map();
    for (const row of rows) {
      if (!map.has(row.rutina_id)) {
        map.set(row.rutina_id, {
          id: row.rutina_id,
          nom: row.nom,
          descripcio: row.descripcio,
          data_creacio: row.data_creacio,
          exercicis: []
        });
      }
      if (row.ejercicio_id) {
        map.get(row.rutina_id).exercicis.push({
          id: row.ejercicio_id,
          nom_exercicis: row.nom_exercicis,
          n_repeticions: row.n_repeticions
        });
      }
    }
    res.json({ success: true, rutines: Array.from(map.values()) });
  } catch (err) {
    console.error('Error al obtener rutinas del usuario:', err);
    res.status(500).json({ success: false, error: 'Error del servidor' });
  }
});

app.delete('/api/rutines/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.pool.query('DELETE FROM Exercicis_Rutina WHERE id_rutina = ?', [id]);
    await db.pool.query('DELETE FROM Rutines WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error al eliminar rutina:', err);
    res.status(500).json({ success: false });
  }
});

// -------------------- MULTIPLAYER SIMPLE --------------------
const salas = {};
function generarCodigoCorto(longitud = 6) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let codigo = '';
  for (let i = 0; i < longitud; i++) codigo += chars.charAt(Math.floor(Math.random() * chars.length));
  return codigo;
}

app.post('/api/multiplayer/create', (req, res) => {
  const { creatorId, maxPlayers } = req.body;
  const sessionId = generarCodigoCorto();
  salas[sessionId] = { creatorId, players: [creatorId], maxPlayers: maxPlayers || 2 };
  res.json({ success: true, sessionId });
});

app.post('/api/multiplayer/join', (req, res) => {
  const { sessionId, userId } = req.body;
  const sala = salas[sessionId];
  if (!sala) return res.status(404).json({ success: false, error: 'Sala no existe.' });
  if (sala.players.length >= sala.maxPlayers) return res.status(403).json({ success: false, error: 'Sala llena.' });
  if (!sala.players.includes(userId)) sala.players.push(userId);
  res.json({ success: true, sessionId });
});

// -------------------- BOSS --------------------
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

app.post('/api/boss/join', async (req, res) => {
  const { bossId, usuariId } = req.body;
  try {
    const [exists] = await db.pool.query(
      'SELECT * FROM Boss_Participants WHERE id_boss_sessio=? AND id_usuari=?',
      [bossId, usuariId]
    );
    if (exists.length > 0)
      return res.status(400).json({ error: 'Ya estás inscrito a esta sesión' });

    await db.pool.query(
      'INSERT INTO Boss_Participants (id_boss_sessio, id_usuari) VALUES (?,?)',
      [bossId, usuariId]
    );
    res.json({ success: true, message: 'Participante agregado' });
  } catch (err) {
    res.status(500).json({ error: 'Error al unirse a la sesión de boss' });
  }
});

app.get('/api/boss/:bossId', async (req, res) => {
  const { bossId } = req.params;
  try {
    const [rows] = await db.pool.query(
      'SELECT jefe_vida_max, jefe_vida_actual, max_participants, estat FROM Boss_Sessions WHERE id=?',
      [bossId]
    );
    if (rows.length === 0)
      return res.status(404).json({ success: false, error: 'Boss no encontrado' });
    res.json({ success: true, boss: rows[0] });
  } catch (err) {
    console.error('Error al obtener boss:', err);
    res.status(500).json({ success: false, error: 'Error del servidor' });
  }
});

app.post('/api/boss/attack', async (req, res) => {
  const { bossId, danoAplicado } = req.body;
  if (!bossId || danoAplicado == null)
    return res.status(400).json({ success: false, error: 'Datos inválidos.' });

  try {
    const [rows] = await db.pool.query('SELECT jefe_vida_actual FROM Boss_Sessions WHERE id = ?', [bossId]);
    if (rows.length === 0)
      return res.status(404).json({ success: false, error: 'Boss no encontrado' });

    const nuevaVida = Math.max(0, rows[0].jefe_vida_actual - danoAplicado);
    await db.pool.query('UPDATE Boss_Sessions SET jefe_vida_actual=? WHERE id=?', [nuevaVida, bossId]);
    if (nuevaVida === 0)
      await db.pool.query('UPDATE Boss_Sessions SET estat="finalitzada" WHERE id=?', [bossId]);
    res.json({ success: true, nuevaVida });
  } catch (err) {
    console.error('Error en /api/boss/attack:', err);
    res.status(500).json({ success: false, error: 'Error al aplicar daño.' });
  }
});

// -------------------- WEBSOCKET SERVER 1 (8080) --------------------
const wss1 = new WebSocket.Server({ port: WS_PORT_1 });
const clients1 = new Map();
const sessions1 = new Map();
const userSessions1 = new Map();
const userStates1 = new Map();

function broadcast1(sessionId, msg) {
  const data = JSON.stringify(msg);
  if (!sessions1.has(sessionId)) return;
  for (const id of sessions1.get(sessionId)) {
    const client = clients1.get(id);
    if (client && client.readyState === WebSocket.OPEN) client.send(data);
  }
}

wss1.on('connection', ws => {
  const clientId = uuidv4();
  clients1.set(clientId, ws);
  ws.send(JSON.stringify({ type: 'welcome', clientId }));

  ws.on('message', message => {
    let data;
    try { data = JSON.parse(message); } catch { return; }

    const type = data.type;
    if (type === 'JOIN_SESSION') {
      const { sessionId } = data;
      if (!sessions1.has(sessionId)) sessions1.set(sessionId, new Set());
      sessions1.get(sessionId).add(clientId);
      userSessions1.set(clientId, sessionId);
      if (!userStates1.has(sessionId)) userStates1.set(sessionId, {});
      const state = userStates1.get(sessionId);
      state[clientId] = state[clientId] || { reps: 0, ready: false, clientId };
      ws.send(JSON.stringify({ type: 'SESSION_JOINED', sessionId, clientId }));
      broadcast1(sessionId, { type: 'SESSION_STATE', state });
    }

    if (type === 'READY_TOGGLE') {
      const sessionId = userSessions1.get(clientId);
      const state = userStates1.get(sessionId) || {};
      if (!state[clientId]) state[clientId] = { reps: 0, ready: false, clientId };
      state[clientId].ready = !!data.ready;
      broadcast1(sessionId, { type: 'SESSION_STATE', state });
    }

    if (type === 'UPDATE_REPS') {
      const sessionId = userSessions1.get(clientId);
      const state = userStates1.get(sessionId) || {};
      if (!state[clientId]) state[clientId] = { reps: 0, ready: false, clientId };
      state[clientId].reps = Number(data.reps) || 0;
      broadcast1(sessionId, { type: 'SESSION_STATE', state });
    }

    if (type === 'START_SESSION') {
      const sessionId = userSessions1.get(clientId);
      const state = userStates1.get(sessionId) || {};
      const allReady = Object.values(state).length > 0 && Object.values(state).every(p => p.ready);
      if (!allReady)
        ws.send(JSON.stringify({ type: 'START_DENIED', reason: 'Not all players ready' }));
      else broadcast1(sessionId, { type: 'SESSION_STARTED', startedBy: clientId });
    }
  });

  ws.on('close', () => {
    const sessionId = userSessions1.get(clientId);
    if (sessionId && sessions1.has(sessionId)) {
      sessions1.get(sessionId).delete(clientId);
      const state = userStates1.get(sessionId);
      if (state) delete state[clientId];
      if (sessions1.get(sessionId).size === 0) {
        sessions1.delete(sessionId);
        userStates1.delete(sessionId);
      } else {
        broadcast1(sessionId, { type: 'SESSION_STATE', state: userStates1.get(sessionId) });
      }
    }
    clients1.delete(clientId);
    userSessions1.delete(clientId);
  });
});

// -------------------- WEBSOCKET SERVER 2 (8081) --------------------
const wss2 = new WebSocket.Server({ port: WS_PORT_2 });
const sessions2 = new Map(); // Map<sessionId, Map<userId, clientId>>
const clientMeta2 = new Map(); // Map<clientId, { ws, userId, sessionId, reps }>

function broadcast2(sessionId) {
  if (!sessions2.has(sessionId)) return;
  const userMap = sessions2.get(sessionId);
  const state = {};
  userMap.forEach((clientId, userId) => {
    const meta = clientMeta2.get(clientId);
    state[userId] = meta?.reps || 0;
  });
  userMap.forEach(clientId => {
    const meta = clientMeta2.get(clientId);
    if (meta && meta.ws.readyState === WebSocket.OPEN)
      meta.ws.send(JSON.stringify({ type: 'SESSION_STATE', state }));
  });
}

wss2.on('connection', ws => {
  const clientId = uuidv4();
  clientMeta2.set(clientId, { ws });
  ws.send(JSON.stringify({ type: 'welcome', clientId }));

  ws.on('message', msg => {
    let data; try { data = JSON.parse(msg); } catch { return; }
    const { type, sessionId, userId } = data;

    if (type === 'JOIN') {
      if (!sessionId || !userId) return;
      if (!sessions2.has(sessionId)) sessions2.set(sessionId, new Map());
      sessions2.get(sessionId).set(userId, clientId);
      clientMeta2.set(clientId, { ws, userId, sessionId, reps: 0 });
      broadcast2(sessionId);
    }

    if (type === 'REPS') {
      const meta = clientMeta2.get(clientId);
      if (!meta) return;
      meta.reps = data.reps || 0;
      broadcast2(meta.sessionId);
    }

    if (type === 'LEAVE') {
      const meta = clientMeta2.get(clientId);
      if (!meta) return;
      const { sessionId, userId } = meta;
      if (sessions2.has(sessionId)) sessions2.get(sessionId).delete(userId);
      clientMeta2.delete(clientId);
      broadcast2(sessionId);
    }
  });

  ws.on('close', () => {
    const meta = clientMeta2.get(clientId);
    if (meta) {
      const { sessionId, userId } = meta;
      if (sessions2.has(sessionId)) sessions2.get(sessionId).delete(userId);
      broadcast2(sessionId);
    }
    clientMeta2.delete(clientId);
  });
});

// -------------------- SERVIDOR HTTP --------------------
app.listen(API_PORT, () => {
  console.log(`✅ API REST corriendo en puerto ${API_PORT}`);
  console.log(`🟢 WS1 (Código 1) corriendo en puerto ${WS_PORT_1}`);
  console.log(`🔵 WS2 (Código 2) corriendo en puerto ${WS_PORT_2}`);
});
