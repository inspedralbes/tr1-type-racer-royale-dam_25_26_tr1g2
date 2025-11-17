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
    salasActivas[codigo] = { creadorId, nombreCreador, jugadores, createdAt: new Date(), maxJugadores: maxJugadores || 2, modo };

    // --- CORRECCIÓN: Guardar la sala en la tabla correcta 'SessionsVersus' ---
    await db_pool.query(
      'INSERT INTO SessionsVersus (codi_acces, creador_id, estat) VALUES (?, ?, ?)',
      [codigo, creadorId, 'oberta']
    );

    // Simulación: devolvemos el código generado en el frontend como si fuera el ID.
    const sessionId = codigo;
    res.json({ success: true, sessionId: sessionId });
  } catch (err) {
    console.error('Error en /api/salas/crear:', err);
    res.status(500).json({ success: false, error: 'Error al crear la sala.' });
  }
});

app.get('/api/salas/check/:codigo', (req, res) => {
  const { codigo } = req.params;
  // Primero, revisamos las salas activas de "Versus"
  if (salasActivas[codigo]) {
    return res.json({ success: true, exists: true, modo: salasActivas[codigo].modo || '2vs2' });
  }

  // Si no está en las salas activas, podría ser una sala de "Incursión" de la BDD
  db_pool.query('SELECT id FROM Boss_Sessions WHERE id = ?', [codigo])
    .then(([rows]) => {
      if (rows.length > 0) {
        res.json({ success: true, exists: true, modo: 'incursion' });
      } else {
        // Si no está en ningún lado, no existe.
        res.status(404).json({ success: false, error: 'La sala no existe o ha expirado.' });
      }
    })
    .catch(err => {
      console.error('Error en /api/salas/check/:codigo consultando la BDD:', err);
      res.status(500).json({ success: false, error: 'Error del servidor al verificar la sala.' });
    });
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
      // La lógica de inicio de incursión ahora se maneja por WebSocket
    }
  }

  // Notificar a todos los clientes en la sala que la partida ha comenzado
  if (sessions.has(codigo)) {
    broadcastToSession(codigo, { type: 'SESSION_STARTED' });
  }

  res.json({ success: true, message: `Sala ${codigo} iniciada.` });
});

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

// -------------------- BOSS (Mantenido para BDD, pero lógica principal en WS) --------------------

// Crear Boss
app.post('/api/boss/create', async (req, res) => {
  const { jefeVidaMax = 300, maxParticipants = 10 } = req.body;
  try {
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
  try {
    const [exists] = await db_pool.query(
      'SELECT * FROM Boss_Participants WHERE id_boss_sessio=? AND id_usuari=?',
      [bossId, usuariId]
    );
    if (exists.length > 0) return res.status(400).json({ error: 'Ya estás inscrito a esta sesión' });

    await db_pool.query(
      'INSERT INTO Boss_Participants (id_boss_sessio, id_usuari) VALUES (?,?)',
      [bossId, usuariId]
    );
    res.json({ success: true, message: 'Participante agregado' });
  } catch (err) {
    res.status(500).json({ error: 'Error al unirse a la sesión de boss' });
  }
});

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

async function broadcastIncursionState(sessionId) {
  if (!sessions.has(sessionId)) {
    console.log(`broadcastIncursionState: No se encontró la sesión en memoria: ${sessionId}`);
    return;
  }

  try {
    // 1. Obtener datos de la sesión del Boss desde la BDD
    const [sessionRows] = await db_pool.query(
      'SELECT id, creador_id, jefe_vida_max, jefe_vida_actual, estat FROM Boss_Sessions WHERE id = ?',
      [sessionId]
    );

    if (sessionRows.length === 0) {
      console.log(`broadcastIncursionState: No se encontró la sesión ${sessionId} en la BDD.`);
      return;
    }
    const bossSession = sessionRows[0];

    // 2. Obtener la lista de participantes y sus nombres de la BDD
    const [participantRows] = await db_pool.query(
      'SELECT bp.id_usuari, u.usuari as nombre FROM Boss_Participants bp JOIN Usuaris u ON bp.id_usuari = u.id WHERE bp.id_boss_sessio = ?',
      [sessionId]
    );

    const message = {
      type: 'INCURSION_STATE',
      sessionId: bossSession.id,
      creadorId: bossSession.creador_id,
      jefeVidaMax: bossSession.jefe_vida_max,
      jefeVidaActual: bossSession.jefe_vida_actual,
      participantes: participantRows.map(p => ({ id: p.id_usuari, nombre: p.nombre, damageDealt: 0 })), // Inicializamos damageDealt
      message: 'Estado de la incursión actualizado.'
    };

    broadcastToSession(sessionId, message);
  } catch (error) {
    console.error('Error en broadcastIncursionState:', error);
  }
}

// --- LÓGICA DE INCURSIÓN: RULETA DE EJERCICIOS (NUEVO) ---
const INCURSION_TIMER_DURATION = 60; // 60 segundos por ronda
const INCURSION_EXERCISES = ['Sentadillas', 'Flexiones', 'Abdominales', 'Zancadas', 'Jumping Jacks', 'Mountain Climbers'];

function startIncursionRuleta(sessionId) {
    const metadata = clientMetadata.get(sessions.get(sessionId)?.values().next().value);
    if (!metadata) return;

    // Si ya hay un timer, no crear otro
    if (metadata.incursionTimer) {
        clearInterval(metadata.incursionTimer);
    }

    let tiempoRestante = INCURSION_TIMER_DURATION;

    // Asignación inicial de ejercicios al empezar
    const userMapOnStart = sessions.get(sessionId);
    if (userMapOnStart) {
        userMapOnStart.forEach(clientId => {
            const randomExercise = INCURSION_EXERCISES[Math.floor(Math.random() * INCURSION_EXERCISES.length)];
            broadcastToSession(sessionId, { type: 'NEW_EXERCISE', userId: clientMetadata.get(clientId).userId, exercise: randomExercise });
        });
    }
    const timer = setInterval(() => {
        if (!sessions.has(sessionId) || sessions.get(sessionId).size === 0) {
            clearInterval(timer);
            return;
        }

        tiempoRestante--;

        if (tiempoRestante <= 0) {
            // Asignar un nuevo ejercicio a cada participante
            const userMap = sessions.get(sessionId);
            userMap.forEach(clientId => {
                const randomExercise = INCURSION_EXERCISES[Math.floor(Math.random() * INCURSION_EXERCISES.length)];
                broadcastToSession(sessionId, { type: 'NEW_EXERCISE', userId: clientMetadata.get(clientId).userId, exercise: randomExercise });
            });
            tiempoRestante = INCURSION_TIMER_DURATION; // Reiniciar timer
        } else {
            broadcastToSession(sessionId, { type: 'TIMER_UPDATE', tiempo: tiempoRestante });
        }
    }, 1000);

    clientMetadata.forEach(meta => { if(meta.sessionId === sessionId) meta.incursionTimer = timer; });
}

wss.on('connection', ws => {
  const clientId = uuidv4();
  clientMetadata.set(clientId, { ws }); // Almacenamiento inicial solo con el objeto ws
  ws.send(JSON.stringify({ type: 'welcome', clientId }));

  // CORRECCIÓN 1: Hacemos la función 'async' para poder usar await dentro de 'INCURSION_JOIN'
  ws.on('message', async message => { 
    let data;
    try {
      data = JSON.parse(message);
    } catch {
      data = { type: 'text', message };
    }
    const { type, sessionId, userId } = data;
    switch (type) {
      case 'JOIN_SESSION': {
        if  (!userId) return;
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
      case 'INCURSION_JOIN':
        try {
          let sessionId = data.sessionId;
          const userId = data.userId;
          const nombreUsuario = data.nombre;

          if (!userId) {
            ws.send(JSON.stringify({ type: 'JOIN_ERROR', message: 'Se requiere un ID de usuario para unirse.' }));
            ws.terminate();
            return;
          }

        // Si no se proporciona un sessionId, SIEMPRE creamos una nueva sala.
          if (!sessionId) {
            sessionId = `BOSS-${uuidv4().slice(0, 6)}`;
            console.log(`Creando nueva sala de incursión: ${sessionId} por usuario ${userId}`);
            await db_pool.query(
              "INSERT INTO Boss_Sessions (id, creador_id, jefe_vida_max, jefe_vida_actual, estat, max_participants) VALUES (?, ?, ?, ?, ?, ?)",
              [sessionId, userId, 300, 300, 'esperant', 10]
            );
            // CORRECCIÓN: Añadir al creador como primer participante en la BDD
            await db_pool.query("INSERT INTO Boss_Participants (id_boss_sessio, id_usuari) VALUES (?, ?)", [sessionId, userId]);
          }

          // Validar si la sala está llena ANTES de añadir al nuevo participante
          const [sessionInfo] = await db_pool.query("SELECT max_participants FROM Boss_Sessions WHERE id = ?", [sessionId]);
          const maxParticipants = sessionInfo[0]?.max_participants || 10; // Usar 10 como fallback

          const [participantCount] = await db_pool.query("SELECT COUNT(*) as count FROM Boss_Participants WHERE id_boss_sessio = ?", [sessionId]);
          const currentParticipants = participantCount[0].count;

          const [existingParticipant] = await db_pool.query("SELECT id FROM Boss_Participants WHERE id_boss_sessio = ? AND id_usuari = ?", [sessionId, userId]);

          if (currentParticipants >= maxParticipants && existingParticipant.length === 0) {
            ws.send(JSON.stringify({ type: 'JOIN_ERROR', message: 'La sala de incursión está llena.' }));
            ws.terminate();
            return;
          }

          // Añadimos al cliente a la estructura de sesiones en memoria
          if (!sessions.has(sessionId)) {
            sessions.set(sessionId, new Map());
          }
          const userMap = sessions.get(sessionId);
          userMap.set(userId, clientId);

          // Actualizamos los metadatos del cliente
          clientMetadata.set(clientId, { ws, userId, sessionId, nombre: nombreUsuario, damageDealt: 0 });

          // Añadimos al participante a la BDD si no está ya
          const [existingParticipants] = await db_pool.query("SELECT id FROM Boss_Participants WHERE id_boss_sessio = ? AND id_usuari = ?", [sessionId, userId]);
          if (existingParticipants.length === 0) {
            await db_pool.query("INSERT INTO Boss_Participants (id_boss_sessio, id_usuari) VALUES (?, ?)", [sessionId, userId]);
          }

          // Enviamos el estado actualizado a todos en la sala
          await broadcastIncursionState(sessionId); // Esta llamada ahora funcionará
        } catch (err) {
          console.error('Error en INCURSION_JOIN:', err);
          ws.send(JSON.stringify({ type: 'JOIN_ERROR', message: 'Error del servidor al unirse a la incursión.' }));
        }
      break;
      case 'INCURSION_START': {
        const metadata = clientMetadata.get(clientId);
        if (metadata && metadata.sessionId) {
            const sessionId = metadata.sessionId;
            const [sessionRows] = await db_pool.query('SELECT creador_id FROM Boss_Sessions WHERE id = ?', [sessionId]);

            if (sessionRows.length > 0 && String(sessionRows[0].creador_id) === String(metadata.userId)) {
                console.log(`Partida ${sessionId} iniciada por el creador ${metadata.userId}`);
                await db_pool.query("UPDATE Boss_Sessions SET estat = 'en curs' WHERE id = ?", [sessionId]);

                // Notificar a todos los jugadores en la sala que la partida ha comenzado
                broadcastToSession(sessionId, { type: 'INCURSION_STARTED' }); 

                // Iniciar la ruleta de ejercicios en el servidor
                startIncursionRuleta(sessionId);
            } else {
                console.log(`Intento no autorizado de iniciar partida por ${metadata.userId}`);
            }
        }
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
          if (meta) { // CORRECCIÓN: Asegurarse de que meta existe
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
      case 'INCURSION_ATTACK': {
        const metadata = clientMetadata.get(clientId);
        if (!metadata || !metadata.sessionId) return;

        const { sessionId, nombre: attackerName } = metadata;
        const { damage } = data;

        try {
            // 1. Obtener vida actual y actualizarla en la BDD
            const [rows] = await db_pool.query('SELECT jefe_vida_actual FROM Boss_Sessions WHERE id = ?', [sessionId]);
            if (rows.length === 0) return;

            const vidaActual = rows[0].jefe_vida_actual;
            const nuevaVida = Math.max(0, vidaActual - damage);

            await db_pool.query('UPDATE Boss_Sessions SET jefe_vida_actual = ? WHERE id = ?', [nuevaVida, sessionId]);

            // 2. Notificar a todos del nuevo estado del jefe
            broadcastToSession(sessionId, {
                type: 'BOSS_HEALTH_UPDATE',
                jefeVidaActual: nuevaVida,
                attackerName: attackerName
            });
        } catch (err) {
            console.error('Error en INCURSION_ATTACK:', err);
        }
        break;
      }
    }
  });

  // Lógica de cierre mejorada
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

  // 1. Eliminar al jugador de la sesión
  userMap.delete(userId);
  clientMetadata.delete(clientId); // Eliminar metadatos del cliente
  console.log(`Jugador ${userId} ha salido de la sala ${sessionId}.`);

  // 2. Lógica de cierre y re-escalado (solo si es incursión)
  if (sala.modo === 'incursion') {
    if (userMap.size === 0) {
      // Si la sala queda vacía, la cerramos
      sessions.delete(sessionId);
      delete salasActivas[sessionId];
      
      // Opcional: Marcar Boss como finalizada en BDD (asumiendo que sessionId es el id de Boss_Sessions)
      db_pool.query("UPDATE Boss_Sessions SET estat = 'finalitzada' WHERE id = ?", [sessionId]).catch(err => console.error("Error al cerrar Boss_Session en BDD:", err));
      
      broadcastToSession(sessionId, { type: 'LEADER_LEFT', message: 'El último jugador ha abandonado la incursión. Sesión cerrada.' });
      console.log(`La sala ${sessionId} ha quedado vacía y ha sido cerrada.`);
      return; 
    }

    // Si la incursión NO ha empezado, re-escalamos la vida del jefe
    if (!sala.partidaIniciada) {
      // Re-escalamos restando los 50 de vida que aportó este jugador. Mínimo 250 (vida base) + 50 (del primer jugador restante) = 300
      sala.jefeVidaMax = Math.max(300, sala.jefeVidaMax - 50); 
      sala.jefeVidaActual = Math.max(300, sala.jefeVidaActual - 50);
      console.log(`Vida de Boss re-escalada a: ${sala.jefeVidaActual}`);
    }

    // Actualizar creador si el anterior se fue y la partida NO ha iniciado
    if (String(userId) === String(sala.creadorId) && !sala.partidaIniciada) {
      const newCreatorId = userMap.keys().next().value; // El primer userId de la lista
      if (newCreatorId) {
        sala.creadorId = newCreatorId;
        console.log(`Nuevo creador de incursión: ${newCreatorId}`);
      }
    }
    
    // 3. Reconstruir estado y notificar a los restantes (lógica de incursión)
    const participantes = [];
    userMap.forEach((cId, uId) => {
      const meta = clientMetadata.get(cId);
      if (meta) participantes.push({ id: uId, nombre: meta.nombre, damageDealt: meta.damageDealt || 0 });
    });
    
    broadcastToSession(sessionId, {
      type: 'INCURSION_STATE',
      participantes: participantes,
      creadorId: sala.creadorId,
      jefeVidaMax: sala.jefeVidaMax,
      jefeVidaActual: sala.jefeVidaActual,
      message: `${metadata.nombre || 'Un jugador'} ha abandonado la incursión.`
    });
  } else {
    // Lógica original para sesiones Versus
    if (userMap.size === 0) {
      sessions.delete(sessionId);
      delete salasActivas[sessionId];
      console.log(`La sala ${sessionId} ha quedado vacía y ha sido cerrada.`);
      return;
    }

    // Reconstruir estado y notificar a los restantes (lógica de Versus)
    const participantesVersus = [];
    userMap.forEach((cId, uId) => {
      const meta = clientMetadata.get(cId);
      if (meta) participantesVersus.push({ id: uId, nombre: meta.nombre, reps: meta.reps, ready: meta.ready });
    });

    const salaSettings = salasActivas[sessionId] || {};
    broadcastToSession(sessionId, { 
      type: 'SESSION_STATE', 
      state: Object.fromEntries(participantesVersus.map(p => [p.id, { nombre: p.nombre, reps: p.reps, ready: p.ready }])),
      creatorId: salaSettings.creadorId,
      ejercicio: salaSettings.ejercicio,
      maxReps: salaSettings.maxReps,
      message: `${metadata.nombre || 'Un jugador'} ha abandonado la sala.`
    });
  }
});

}); // Cierre del wss.on('connection')

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