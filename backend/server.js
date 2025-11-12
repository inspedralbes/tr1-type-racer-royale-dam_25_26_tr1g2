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
const API_PORT = process.env.API_PORT || 9000;
const WS_PORT = process.env.WS_PORT || 8081;
app.use(cors({
  origin: 'http://localhost:3001', // tu frontend
  credentials: true
}));
app.set('etag', false);
app.use(express.json());
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
    if (err.code === 'ER_DUP_ENTRY') return res
      .status(409)
      .json({ success: false, error: 'El correo o usuario ya está registrado' });
    res.status(500).json({ success: false, error: 'Error al registrar usuario' });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  const { correu, password } = req.body;
  try {
    // 1️ Buscar usuario real
    const [rows] = await db.pool.query('SELECT * FROM Usuaris WHERE correu=?', [correu]);
    if (rows.length === 0) return res.status(401).json({ success: false, error: 'Usuario no encontrado' });
    const user = rows[0];
    const match = await bcrypt.compare(password, user.contrasenya);
    if (!match) return res.status(401).json({ success: false, error: 'Contraseña incorrecta' });

    // 2️Buscar si existe el usuario invitado
    const [guestRows] = await db.pool.query('SELECT id FROM Usuaris WHERE usuari = ?', ['invitado']);
    if (guestRows.length > 0) {
      const invitadoId = guestRows[0].id;
      // 3️ Transferir todas las rutinas del invitado al usuario real
      await db.pool.query(
        'UPDATE Rutines SET id_usuari = ? WHERE id_usuari = ?',
        [user.id, invitadoId]
      );
      // 4. Eliminar el usuario 'invitado' para que no queden rutinas huérfanas en el futuro
      await db.pool.query(
        'DELETE FROM Usuaris WHERE id = ?',
        [invitadoId]
      );
    }

    // Devolver datos del usuario logueado
    res.json({
      success: true,
      id: user.id,
      usuari: user.usuari,
      message: 'Inicio de sesión correcto',
    });
  } catch (err) {
    console.error('Error en /api/login:', err);
    res.status(500).json({ success: false, error: 'Error del servidor' });
  }
});


app.post('/api/salas/crear', async (req, res) => {
  const { codigo, creadorId, nombreCreador, tipo, modo, jugadores, opciones } = req.body;

  if (!codigo || !creadorId) {
    return res.status(400).json({ success: false, error: 'El código y el creadorId son obligatorios.' });
  }

  try {
    // Aquí iría la lógica para guardar la sala en la base de datos.
    // Por ahora, simulamos que se guarda y devolvemos el código como ID de sesión.
    // Ejemplo de inserción (deberás adaptarlo a tu tabla de salas/sesiones):
    /*
    const [result] = await db.pool.query(
      'INSERT INTO Sesiones (codigo, creador_id, nombre_creador, tipo, modo, opciones) VALUES (?, ?, ?, ?, ?, ?)',
      [codigo, creadorId, nombreCreador, tipo, modo, JSON.stringify(opciones)]
    );
    const sessionId = result.insertId;
    */

    // Simulación: devolvemos el código generado en el frontend como si fuera el ID.
    const sessionId = codigo;
    res.json({ success: true, sessionId: sessionId });
  } catch (err) {
    console.error('Error en /api/salas/crear:', err);
    res.status(500).json({ success: false, error: 'Error al crear la sala.' });
  }
});

app.post('/api/session/start', (req, res) => {
  const { codigo } = req.body;

  if (!codigo) {
    return res.status(400).json({ success: false, error: 'El código de la sala es obligatorio.' });
  }

  // Aquí podrías actualizar el estado de la sala en la base de datos a 'iniciada'
  // Por ejemplo: await db.pool.query('UPDATE Sesiones SET estado = "iniciada" WHERE codigo = ?', [codigo]);

  // Notificar a todos los clientes en la sala que la partida ha comenzado
  if (sessions.has(codigo)) {
    broadcastToSession(codigo, { type: 'SESSION_STARTED' });
  }

  res.json({ success: true, message: `Sala ${codigo} iniciada.` });
});

// ...existing code...

// Crear sesión Versus
app.post('/api/session/save', async (req, res) => {
  const { userId, nom, descripcio, exercicis } = req.body;
  let finalUserId = userId;

  try {
    // validar si el userId existe
    if (finalUserId) {
      const [rows] = await db.pool.query('SELECT id FROM Usuaris WHERE id = ?', [finalUserId]);
      if (rows.length === 0) finalUserId = null; // si no existe, tratar como invitado
    }

    // si no hay userId válido, usar o crear invitado
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

    // crear rutina
    const [result] = await db.pool.query(
      'INSERT INTO Rutines (id_usuari, nom, descripcio) VALUES (?, ?, ?)',
      [finalUserId, nom, descripcio]
    );

    const rutinaId = result.insertId;

    // insertar ejercicios
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
    res.status(500).json({ success: false, error: err.message });
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

// -------------------- BOSS --------------------

// 1. Obtener estado del Boss
app.get('/api/boss/:bossId', async (req, res) => {
  const { bossId } = req.params;
  try {
    const [rows] = await db.pool.query(
      'SELECT jefe_vida_max, jefe_vida_actual, max_participants, estat FROM Boss_Sessions WHERE id=?',
      [bossId]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, error: 'Boss no encontrado' });
    res.json({ success: true, boss: rows[0] });
  } catch (err) {
    console.error('Error al obtener estado del boss:', err);
    res.status(500).json({ success: false, error: 'Error del servidor' });
  }
});

// 2. Aplicar Ataque al Boss (Actualizar vida)
app.post('/api/boss/attack', async (req, res) => {
  const { bossId, danoAplicado } = req.body;
  if (!bossId || danoAplicado == null) {
    return res.status(400).json({ success: false, error: 'bossId y danoAplicado son requeridos.' });
  }
  try {
    // 1. Obtener vida actual
    const [rows] = await db.pool.query('SELECT jefe_vida_actual FROM Boss_Sessions WHERE id = ?', [bossId]);
    if (rows.length === 0) return res.status(404).json({ success: false, error: 'Boss no encontrado' });

    const vidaActual = rows[0].jefe_vida_actual;
    const nuevaVida = Math.max(0, vidaActual - danoAplicado);

    // 2. Actualizar vida
    await db.pool.query(
      'UPDATE Boss_Sessions SET jefe_vida_actual = ? WHERE id = ?',
      [nuevaVida, bossId]
    );

    // Opcional: Actualizar el estado a 'finalitzada' si la vida llega a 0
    if (nuevaVida === 0) {
      await db.pool.query(
        'UPDATE Boss_Sessions SET estat = "finalitzada" WHERE id = ?',
        [bossId]
      );
    }

    res.json({ success: true, nuevaVida });
  } catch (err) {
    console.error('Error al aplicar daño al boss:', err);
    res.status(500).json({ success: false, error: 'Error al actualizar vida del boss' });
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
  `SELECT 
      r.id AS rutina_id,
      r.nom,
      r.descripcio,
      r.data_creacio,
      er.id AS ejercicio_id,
      er.nom_exercicis,
      er.n_repeticions
   FROM Rutines r
   LEFT JOIN Exercicis_Rutina er ON er.id_rutina = r.id
   WHERE r.id_usuari = ?
   ORDER BY r.data_creacio DESC`,
  [userId]
);

    const map = new Map();
    for (const row of rows) {
      if (!map.has(row.rutina_id)) {
        map.set(row.rutina_id, { id: row.rutina_id, nom: row.nom, descripcio: row.descripcio, data_creacio: row.data_creacio, exercicis: [] });
      }
      if (row.ejercicio_id) {
        map.get(row.rutina_id).exercicis.push({ id: row.ejercicio_id, nom_exercicis: row.nom_exercicis, n_repeticions: row.n_repeticions });
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

// Estructuras de datos mejoradas
// sessions: Map<sessionId, Map<userId, clientId>>
// clientMetadata: Map<clientId, { ws: WebSocket, userId: string, sessionId: string }>
const sessions = new Map();
const clientMetadata = new Map();

function broadcastToSession(sessionId, message) {
  if (!sessions.has(sessionId)) return;
  const userMap = sessions.get(sessionId);

  // Enviar el mensaje a todos los clientes de la sesión
  userMap.forEach(clientId => {
    const metadata = clientMetadata.get(clientId);
    if (metadata && metadata.ws.readyState === WebSocket.OPEN) {
      metadata.ws.send(JSON.stringify(message));
    }
  });
}

wss.on('connection', ws => {
  const clientId = uuidv4();
  clientMetadata.set(clientId, { ws }); // Almacenamiento inicial solo con el objeto ws
  ws.send(JSON.stringify({ type: 'welcome', clientId }));

  ws.on('message', message => {
    let data;
    try {
      data = JSON.parse(message);
    } catch {
      data = { type: 'text', message };
    }
    const { type, sessionId, userId } = data;
    switch (type) {
      case 'JOIN_SESSION': {
        if (!sessionId || !userId) return;
        // 1. Crear la sesión si no existe
        if (!sessions.has(sessionId)) {
          sessions.set(sessionId, new Map());
        }
        const userMap = sessions.get(sessionId);
        // 2. Si el usuario ya está en la sesión, desconectar la conexión antigua
        if (userMap.has(userId) && userMap.get(userId) !== clientId) {
          console.log(`Usuario ${userId} ya está en la sesión ${sessionId}. Rechazando nueva conexión.`);
          ws.send(JSON.stringify({ type: 'JOIN_ERROR', message: 'Ya estás en esta sala desde otro dispositivo o pestaña.' }));
          ws.terminate();
          return;
        }
        // 3. Registrar al cliente
        userMap.set(userId, clientId);
        clientMetadata.set(clientId, { ws, userId, sessionId, reps: 0 });
        // 4. Enviar estado actualizado a todos en la sesión
        const sessionState = {};
        userMap.forEach((cId, uId) => {
          const meta = clientMetadata.get(cId);
          sessionState[uId] = {
            reps: meta?.reps || 0,
            // Aquí puedes añadir más datos del usuario si los tienes
          };
        });

        broadcastToSession(sessionId, { type: 'SESSION_STATE', state: sessionState });
        break;
      }
      case 'REPS_UPDATE': {
        const metadata = clientMetadata.get(clientId);
        if (!metadata || !metadata.sessionId) return;
        // Actualizar las repeticiones del usuario
        metadata.reps = data.reps;
        clientMetadata.set(clientId, metadata);
        
        // Notificar a todos en la sesión
        const userMap = sessions.get(metadata.sessionId);
        const sessionState = {};
        userMap.forEach((cId, uId) => {
          const meta = clientMetadata.get(cId);
          sessionState[uId] = { reps: meta?.reps || 0 };
        });

        broadcastToSession(metadata.sessionId, { type: 'SESSION_STATE', state: sessionState });
        break;
      }
    }
  });

  ws.on('close', () => {
    const metadata = clientMetadata.get(clientId);
    if (metadata && metadata.sessionId) {
      const { sessionId, userId } = metadata;
      const userMap = sessions.get(sessionId);
      // Solo eliminar si el clientId coincide (para evitar eliminar una nueva conexión del mismo usuario)
      if (userMap && userMap.get(userId) === clientId) {
        userMap.delete(userId);
      }
      if (userMap && userMap.size === 0) {
        sessions.delete(sessionId);
      } else {
        // Notificar a los restantes que alguien se fue
        const sessionState = {};
        userMap.forEach((cId, uId) => {
          const meta = clientMetadata.get(cId);
          sessionState[uId] = { reps: meta?.reps || 0 };
        });

        broadcastToSession(sessionId, { type: 'SESSION_STATE', state: sessionState });
      }
    }
    clientMetadata.delete(clientId);
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
