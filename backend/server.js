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
    if (err.code === 'ER_DUP_ENTRY')
      return res
        .status(409)
        .json({ success: false, error: 'El correo o usuario ya está registrado' });
    res.status(500).json({ success: false, error: 'Error al registrar usuario' });
  }
});


// Login
app.post('/api/login', async (req, res) => {
  const { correu, password } = req.body;

  try {
    // 1️⃣ Buscar usuario real
    const [rows] = await db.pool.query('SELECT * FROM Usuaris WHERE correu=?', [correu]);
    if (rows.length === 0)
      return res.status(401).json({ success: false, error: 'Usuario no encontrado' });

    const user = rows[0];
    const match = await bcrypt.compare(password, user.contrasenya);
    if (!match)
      return res.status(401).json({ success: false, error: 'Contraseña incorrecta' });

    // 2️⃣ Buscar si existe el usuario invitado
    const [guestRows] = await db.pool.query('SELECT id FROM Usuaris WHERE usuari = ?', ['invitado']);
    if (guestRows.length > 0) {
      const invitadoId = guestRows[0].id;

      // 3️⃣ Transferir todas las rutinas del invitado al usuario real
      await db.pool.query(
        'UPDATE Rutines SET id_usuari = ? WHERE id_usuari = ?',
        [user.id, invitadoId]
      );
    }

    // 4️⃣ Devolver datos del usuario logueado
    res.json({
      success: true,
      userId: user.id,
      usuari: user.usuari,
      message: 'Inicio de sesión correcto',
    });
  } catch (err) {
    console.error('Error en /api/login:', err);
    res.status(500).json({ success: false, error: 'Error del servidor' });
  }
});
// -------------------- SESIONES 2vs2 --------------------

// ...existing code...
// Crear sesión Versus
app.post('/api/session/save', async (req, res) => {
  const { userId, nom, descripcio, exercicis } = req.body;
  let finalUserId = userId;

  try {
    // Si no hay userId, usar o crear el invitado
    if (!finalUserId) {
      const [rows] = await db.pool.query('SELECT id FROM Usuaris WHERE usuari = ?', ['invitado']);
      if (rows.length > 0) {
        finalUserId = rows[0].id;
      } else {
        const hashed = await bcrypt.hash('invitado123', 10);
        const [createRes] = await db.pool.query(
          'INSERT INTO Usuaris (usuari, correu, contrasenya) VALUES (?,?,?)',
          ['invitado', 'invitado@local', hashed]
        );
        finalUserId = createRes.insertId;
      }
    }

    // Crear rutina
    const [result] = await db.pool.query(
      'INSERT INTO Rutines (id_usuari, nom, descripcio) VALUES (?, ?, ?)',
      [finalUserId, nom, descripcio]
    );

    const rutinaId = result.insertId;

    // Insertar ejercicios
    if (Array.isArray(exercicis)) {
      for (const ex of exercicis) {
        await db.pool.query(
          'INSERT INTO Exercicis_Rutina (id_rutina, nom_exercicis, n_repeticions) VALUES (?, ?, ?)',
          [rutinaId, ex.nom_exercicis, ex.n_repeticions]
        );
      }
    }

    res.json({ success: true, message: 'Rutina guardada correctamente', rutinaId });
  } catch (err) {
    console.error('Error en /api/session/save:', err);
    res.status(500).json({ success: false, error: 'Error al guardar rutina' });
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
// ---------------------Rutina Crear---------------------
app.post('/api/rutines', async (req, res) => {
  const { id_usuari, nom, descripcio } = req.body;
  if (!nom || !String(nom).trim()) {
    return res.status(400).json({ success: false, error: 'El nombre de la rutina (nom) es requerido.' });
  }

  try {
    // Si no hay id_usuari, buscar o crear usuario 'invitado' para cumplir FK NOT NULL
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
    console.error('Error al insertar ejercicio en rutina:', err);
    res.status(500).json({ success: false, error: 'Error al insertar ejercicio.' });
  }
});
// ...existing code...
// Endpoint: obtener rutinas del usuario con ejercicios
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

    const rutines = Array.from(map.values());
    res.json({ success: true, rutines });
  } catch (err) {
    console.error('Error al obtener rutinas del usuario:', err);
    res.status(500).json({ success: false, error: 'Error del servidor' });
  }
});

// Endpoint: eliminar rutina (y sus ejercicios)
app.delete('/api/rutines/:id', async (req, res) => {
  const { id } = req.params
  try {
    // Eliminar los ejercicios relacionados primero
    await db.pool.query('DELETE FROM Exercicis_Rutina WHERE id_rutina = ?', [id])
    // Luego eliminar la rutina
    await db.pool.query('DELETE FROM Rutines WHERE id = ?', [id])
    res.json({ success: true })
  } catch (err) {
    console.error('Error al eliminar rutina:', err)
    res.status(500).json({ success: false })
  }
})

// ...existing code...
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
