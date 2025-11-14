require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors'); // Ya importado
const bcrypt = require('bcrypt');
const db = require('./models'); // Canviem a la connexió de Sequelize
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

const app = express();

const API_PORT = process.env.API_PORT || 9000; // Puerto para el servidor HTTP
const WS_PORT = process.env.WS_PORT || 8082; // Puerto para el servidor WebSocket

// --- Configuración de CORS ---
// Esta es la única configuración de CORS necesaria.
// Permite peticiones desde los orígenes definidos en .env o los valores por defecto.
const allowedOrigins = (process.env.FRONTEND_ORIGINS || 'http://localhost:3000,http://localhost:3001')
  .split(',')
  .map(s => s.trim());

const corsOptions = {
  origin: function (origin, callback) {
    // Permitir peticiones sin origen (como Postman o server-to-server) y desde los orígenes permitidos
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
};
app.use(cors(corsOptions)); // Aplicar la configuración de CORS
app.use(express.json()); // Usar el parser de JSON integrado de Express (reemplaza a bodyParser.json())
app.set('etag', false); // Deshabilitar ETag para evitar problemas de caché con algunos proxies

// -------------------- RUTAS API --------------------

// Ruta raíz
app.get('/', (req, res) => { res.send('Servidor Express actiu!'); });

// Rutes d'usuari amb Sequelize
const userRoutes = require('./routes/userRoutes');
app.use('/api/users', userRoutes);

const db_pool = require('./config/db').pool; // Mantenim el pool per a les altres consultes

// Objeto en memoria para rastrear las salas activas
const salasActivas = {};

app.post('/api/salas/crear', async (req, res) => {
  const { codigo, creadorId, nombreCreador, tipo, modo, jugadores, opciones, maxJugadores } = req.body;

  if (!codigo || !creadorId) {
    return res.status(400).json({ success: false, error: 'El código y el creadorId son obligatorios.' });
  }

  try {
    // Guardar la sala en memoria, incluyendo el máximo de jugadores
    salasActivas[codigo] = { creadorId, nombreCreador, jugadores, createdAt: new Date(), maxJugadores: maxJugadores || 2 };

    // Aquí iría la lógica para guardar la sala en la base de datos.
    // Por ahora, simulamos que se guarda y devolvemos el código como ID de sesión.
    // Ejemplo de inserción (deberás adaptarlo a tu tabla de salas/sesiones):
    /*
    const [result] = await db_pool.query(
      'INSERT INTO Sesiones (codigo, creador_id, nombre_creador, tipo, modo, opciones) VALUES (?, ?, ?, ?, ?, ?)',
      [codigo, creadorId, nombreCreador, tipo, modo, JSON.stringify(opciones)]
    );
    const sessionId = result.insertId;
    */

    // Simulación: devolvemos el código generado en el frontend como si fuera el ID.
    const sessionId = codigo;
    res.json({ success: true, sessionId });
  } catch (err) {
    console.error('Error en /api/salas/crear:', err);
    res.status(500).json({ success: false, error: 'Error al crear la sala.' });
  }
});

app.get('/api/salas/check/:codigo', (req, res) => {
  const { codigo } = req.params;
  if (salasActivas[codigo]) {
    res.json({ success: true, exists: true });
  } else {
    res.status(404).json({ success: false, error: 'La sala no existe o ha expirado.' });
  }
});

app.get('/api/boss/find', async (req, res) => {
  try {
    // Busca sesiones de boss 'abiertas' en la BDD que no estén llenas
    const [rows] = await db_pool.query(
      `SELECT bs.id, COUNT(bp.id) as num_participants, bs.max_participants
       FROM Boss_Sessions bs
       LEFT JOIN Boss_Participants bp ON bs.id = bp.id_boss_sessio
       WHERE bs.estat = 'oberta'
       GROUP BY bs.id
       HAVING num_participants < bs.max_participants
       LIMIT 1`
    );

    if (rows.length > 0) {
      res.json({ success: true, sessionId: rows[0].id });
    } else {
      res.json({ success: true, sessionId: null });
    }
  } catch (err) {
    console.error('Error en /api/boss/find:', err);
    res.status(500).json({ success: false, error: 'Error del servidor al buscar incursión.' });
  }
});

app.post('/api/sessions/start', (req, res) => {
  const { codigo } = req.body;

  if (!codigo) {
    return res.status(400).json({ success: false, error: 'El código de la sala es obligatorio.' });
  }

  if (salasActivas[codigo]) {
    salasActivas[codigo].partidaFinalizada = false; // Reiniciar estado al iniciar
    // Para incursiones, marcamos la partida como iniciada para bloquearla
    if (salasActivas[codigo].modo === 'incursion') {
      salasActivas[codigo].partidaIniciada = true;
      // Actualizar estado en BDD
      db_pool.query(
        "UPDATE Boss_Sessions SET estat = 'en curs' WHERE id = ?",
        [codigo]
      ).catch(err => console.error("Error al actualizar estado de Boss_Session a 'en curs':", err));
    }
  }

  // Aquí podrías actualizar el estado de la sala en la base de datos a 'iniciada'
  // Por ejemplo: await db_pool.query('UPDATE Sesiones SET estado = "iniciada" WHERE codigo = ?', [codigo]);

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
      const [rows] = await db_pool.query('SELECT id FROM Usuaris WHERE id = ?', [finalUserId]);
      if (rows.length === 0) finalUserId = null; // si no existe, tratar como invitado
    }

    // si no hay userId válido, usar o crear invitado
    if (!finalUserId) {
      const [rows] = await db_pool.query('SELECT id FROM Usuaris WHERE usuari = ?', ['invitado']);
      if (rows.length > 0) {
        finalUserId = rows[0].id;
      } else {
        const hashed = await bcrypt.hash('invitado123', 10);
        const [createRes] = await db_pool.query(
          'INSERT INTO Usuaris (usuari, correu, contrasenya) VALUES (?,?,?)',
          ['invitado', 'invitado@local', hashed]
        );
        finalUserId = createRes.insertId;
      }
    }
    // crear rutina
    const [result] = await db_pool.query(
      'INSERT INTO Rutines (id_usuari, nom, descripcio) VALUES (?, ?, ?)',
      [finalUserId, nom, descripcio]
    );

    const rutinaId = result.insertId;

    // insertar ejercicios
    if (Array.isArray(exercicis)) {
      for (const ex of exercicis) {
        await db_pool.query(
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
  try { // La vida actual debe ser igual a la máxima al crear
    const [result] = await db_pool.query(
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
  try { // Comprobar si el usuario ya está en la sesión
    const [exists] = await db_pool.query(
      'SELECT * FROM Boss_Participants WHERE id_boss_sessio=? AND id_usuari=?',
      [bossId, usuariId]
    );
    if (exists.length > 0) return res.status(400).json({ error: 'Ya estás inscrito a esta sesión' });

    await db_pool.query(
      'INSERT INTO Boss_Participants (id_boss_sessio, id_usuari) VALUES (?,?)',
      [bossId, usuariId]
    );
    res.json({ success: true, message: 'Participante agregado correctamente.' });
  } catch (err) {
    res.status(500).json({ error: 'Error al unirse a la sesión de boss' });
  }
});

// -------------------- BOSS --------------------

// 1. Obtener estado del Boss
app.get('/api/boss/:bossId', async (req, res) => {
  const { bossId } = req.params;
  try {
    const [rows] = await db_pool.query(
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
    const [rows] = await db_pool.query('SELECT jefe_vida_actual FROM Boss_Sessions WHERE id = ?', [bossId]);
    if (rows.length === 0) return res.status(404).json({ success: false, error: 'Boss no encontrado' });

    const vidaActual = rows[0].jefe_vida_actual;
    const nuevaVida = Math.max(0, vidaActual - danoAplicado);

    // 2. Actualizar vida
    await db_pool.query(
      'UPDATE Boss_Sessions SET jefe_vida_actual = ? WHERE id = ?',
      [nuevaVida, bossId]
    );

    // Opcional: Actualizar el estado a 'finalitzada' si la vida llega a 0
    if (nuevaVida === 0) {
      await db_pool.query(
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
    const [result] = await db_pool.query(
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
    const [rows] = await db_pool.query(
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
    await db_pool.query('DELETE FROM Exercicis_Rutina WHERE id_rutina = ?', [id])
    // Luego eliminar la rutina
    await db_pool.query('DELETE FROM Rutines WHERE id = ?', [id])
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
        // Validar si la sala está llena
        const sala = salasActivas[sessionId];
        if (sala && sessions.get(sessionId).size >= sala.maxJugadores) {
          ws.send(JSON.stringify({ type: 'JOIN_ERROR', message: 'La sala está llena.' }));
          ws.terminate();
          return;
        }
        const userMap = sessions.get(sessionId);
        // 2. Validar si el usuario ya está en la sesión.
        if (userMap.has(userId)) {
          const oldClientId = userMap.get(userId);
          // Si el cliente anterior sigue conectado, rechazar la nueva conexión.
          if (clientMetadata.has(oldClientId) && clientMetadata.get(oldClientId).ws.readyState === WebSocket.OPEN) {
            console.log(`Usuario ${userId} ya está en la sesión ${sessionId}. Rechazando nueva conexión.`);
            ws.send(JSON.stringify({ type: 'JOIN_ERROR', message: 'Ya estás en esta sala desde otro dispositivo o pestaña.' }));
            ws.terminate();
            return;
          }
        }
        // 3. Registrar al cliente
        userMap.set(userId, clientId);
        // Añadimos nombre y estado 'ready' a los metadatos del cliente
        clientMetadata.set(clientId, { ws, userId, sessionId, reps: 0, nombre: data.nombre || `Jugador ${userId}`, ready: false });
        // 4. Enviar estado actualizado a todos en la sesión
        const sessionState = {};
        userMap.forEach((cId, uId) => {
          const meta = clientMetadata.get(cId);
          if (meta) {
            sessionState[uId] = {
              nombre: meta.nombre,
              reps: meta.reps,
              ready: meta.ready
            };
          }
        });

        const creatorId = salasActivas[sessionId]?.creadorId;
        const salaSettings = salasActivas[sessionId] || {};
        broadcastToSession(sessionId, { 
          type: 'SESSION_STATE', 
          state: sessionState, 
          creatorId,
          ejercicio: salaSettings.ejercicio,
          maxReps: salaSettings.maxReps
        });
        break;
      }
      case 'INCURSION_JOIN': {
        if (!sessionId || !userId) return;

        // Si la sala no existe en memoria, la creamos (el primer jugador la crea)
        if (!salasActivas[sessionId]) {
          salasActivas[sessionId] = {
            creadorId: userId,
            nombreCreador: data.nombre,
            jugadores: [],
            createdAt: new Date(),
            maxJugadores: 16,
            modo: 'incursion',
            partidaIniciada: false
          };
          sessions.set(sessionId, new Map());
        }

        const sala = salasActivas[sessionId];
        const userMap = sessions.get(sessionId);

        // Rechazar si la partida ya ha comenzado
        if (sala.partidaIniciada) {
          ws.send(JSON.stringify({ type: 'JOIN_ERROR', message: 'La incursión ya ha comenzado.' }));
          ws.terminate();
          return;
        }

        // Añadir al jugador
        userMap.set(userId, clientId);
        // Guardar en BDD
        db_pool.query(
          'INSERT INTO Boss_Participants (id_boss_sessio, id_usuari) VALUES (?, ?) ON DUPLICATE KEY UPDATE id_usuari=id_usuari',
          [sessionId, userId]
        ).catch(err => {
          console.error(`Error al registrar participante ${userId} en boss_session ${sessionId}:`, err);
        });
        clientMetadata.set(clientId, { ws, userId, sessionId, nombre: data.nombre });

        // Notificar a todos los de la sala del nuevo estado
        const participantes = [];
        userMap.forEach((cId, uId) => {
          const meta = clientMetadata.get(cId);
          if (meta) participantes.push({ id: uId, nombre: meta.nombre });
        });

        broadcastToSession(sessionId, {
          type: 'INCURSION_STATE',
          participantes: participantes,
          creadorId: sala.creadorId,
          message: `${data.nombre} se ha unido a la incursión.`
        });

        break;
      }
      case 'REPS_UPDATE': {
        const metadata = clientMetadata.get(clientId);
        if (!metadata || !metadata.sessionId) return;

        const sala = salasActivas[metadata.sessionId];
        if (!sala || sala.partidaFinalizada) return; // No procesar si la partida ya terminó

        // Actualizar las repeticiones del usuario
        metadata.reps = data.reps;
        clientMetadata.set(clientId, metadata);
        
        // Comprobar si el jugador ha ganado
        if (sala.maxReps && metadata.reps >= sala.maxReps) {
          sala.partidaFinalizada = true; // Marcar la partida como finalizada
          broadcastToSession(metadata.sessionId, {
            type: 'PLAYER_WINS',
            winnerId: metadata.userId,
            winnerName: metadata.nombre
          });
          break; // Salir para no enviar un SESSION_STATE normal
        }

        // Notificar a todos en la sesión
        const userMap = sessions.get(metadata.sessionId);
        const sessionState = {};
        userMap.forEach((cId, uId) => {
          const meta = clientMetadata.get(cId);
          sessionState[uId] = { nombre: meta?.nombre, reps: meta?.reps || 0, ready: meta?.ready || false };
        });

        const creatorId = salasActivas[metadata.sessionId]?.creadorId;
        const salaSettings = salasActivas[metadata.sessionId] || {};
        broadcastToSession(metadata.sessionId, { 
          type: 'SESSION_STATE', 
          state: sessionState, 
          creatorId,
          ejercicio: salaSettings.ejercicio,
          maxReps: salaSettings.maxReps
        });
        break;
      }
      case 'PLAYER_READY': {
        const metadata = clientMetadata.get(clientId);
        if (!metadata || !metadata.sessionId) return;

        // Actualizar el estado 'ready' del jugador
        metadata.ready = true;
        clientMetadata.set(clientId, metadata);

        // Notificar a todos en la sesión del cambio de estado
        const userMap = sessions.get(metadata.sessionId);
        const sessionState = {};
        userMap.forEach((cId, uId) => {
          const meta = clientMetadata.get(cId);
          if (meta) {
            sessionState[uId] = { nombre: meta.nombre, reps: meta.reps, ready: meta.ready };
          }
        });

        const creatorId = salasActivas[metadata.sessionId]?.creadorId;
        const salaSettings = salasActivas[metadata.sessionId] || {};
        broadcastToSession(metadata.sessionId, { 
          type: 'SESSION_STATE', 
          state: sessionState, 
          creatorId,
          ejercicio: salaSettings.ejercicio,
          maxReps: salaSettings.maxReps
        });
        break;
      }
      case 'SETTINGS_UPDATE': {
        const metadata = clientMetadata.get(clientId);
        if (!metadata || !metadata.sessionId) return;

        // Verificamos que quien envía el cambio es el creador de la sala
        const creatorId = salasActivas[metadata.sessionId]?.creadorId;
        if (String(metadata.userId) !== String(creatorId)) {
          console.log(`Intento no autorizado de cambiar ajustes por ${metadata.userId} en sala ${metadata.sessionId}`);
          return; // No hacer nada si no es el creador
        }

        // Guardamos la nueva configuración en la sala activa (en memoria)
        if (salasActivas[metadata.sessionId]) {
          salasActivas[metadata.sessionId].ejercicio = data.ejercicio;
          salasActivas[metadata.sessionId].maxReps = data.maxReps;
        }

        // Retransmitimos la nueva configuración a todos en la sesión
        broadcastToSession(metadata.sessionId, { type: 'SETTINGS_UPDATED', ejercicio: data.ejercicio, maxReps: data.maxReps });
        break;
      }
    }
  });

  ws.on('close', () => {
    const metadata = clientMetadata.get(clientId);
    if (!metadata || !metadata.sessionId) {
      clientMetadata.delete(clientId);
      return;
    }

    const { sessionId, userId } = metadata;
    const sala = salasActivas[sessionId];
    const userMap = sessions.get(sessionId);

    if (!userMap || !sala) {
      clientMetadata.delete(clientId);
      return;
    }

    // Si el que se va es el creador, terminamos la sesión para todos.
    if (String(sala.creadorId) === String(userId)) {
      broadcastToSession(sessionId, { type: 'LEADER_LEFT', message: 'El creador ha abandonado la sala. La sesión ha terminado.' });
      sessions.delete(sessionId);
      delete salasActivas[sessionId];
      console.log(`El creador ${userId} ha salido de la sala ${sessionId}. Sala cerrada.`);
    } else {
      // Si es un jugador normal, simplemente lo eliminamos.
      userMap.delete(userId);
      console.log(`Jugador ${userId} ha salido de la sala ${sessionId}.`);

      // Si la sala queda vacía, la eliminamos.
      if (userMap.size === 0) {
        sessions.delete(sessionId);
        delete salasActivas[sessionId];
        console.log(`La sala ${sessionId} ha quedado vacía y ha sido cerrada.`);
      } else {
        // Si aún quedan jugadores, actualizamos su estado.
        const sessionState = {};
        userMap.forEach((cId, uId) => {
          const meta = clientMetadata.get(cId);
          if (meta) {
            sessionState[uId] = { nombre: meta.nombre, reps: meta.reps || 0, ready: meta.ready || false };
          }
        });
        broadcastToSession(sessionId, { type: 'SESSION_STATE', state: sessionState, creatorId: sala.creadorId, ejercicio: sala.ejercicio, maxReps: sala.maxReps });
      }
    }

    clientMetadata.delete(clientId);
  });
});

// -------------------- INICIAR SERVIDOR --------------------
let httpServer;
db.sequelize.sync().then(() => {
  console.log('Base de dades sincronitzada amb Sequelize.');
  httpServer = app.listen(API_PORT, () => console.log(`Servidor Express en puerto ${API_PORT}`));
});

async function shutdown() {
  console.log('Cerrando servidores...');
  try {
    wss.close(() => console.log('WebSocket cerrado.'));
    httpServer.close(() => console.log('HTTP server cerrado.'));
    if (db_pool && typeof db_pool.end === 'function') {
      await db_pool.end();
      console.log('Pool MySQL (raw) cerrado.');
    }
    process.exit(0);
  } catch (err) {
    console.error('Error en shutdown', err);
    process.exit(1);
  }
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
