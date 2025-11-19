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
const HOST_IP = '0.0.0.0'; // <<-- AÑADIDO: Definición global de la variable

// --- Configuración de CORS ---
// Esta es la única configuración de CORS necesaria.
// Permite peticiones desde los orígenes definidos en .env o los valores por defecto.
const allowedOrigins = (process.env.FRONTEND_ORIGINS || 'http://localhost:3000,http://localhost:3001')
  .split(',')
  .map(s => s.trim());

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
};
app.use(cors(corsOptions));
app.use(express.json());
app.set('etag', false);

// -------------------- RUTAS API --------------------
const userRoutes = require('./routes/userRoutes');
app.use('/api/users', userRoutes);

const { pool: db_pool, connectWithRetry } = require('./config/db');

// Objeto en memoria para rastrear las salas activas (USADO SÓLO PARA VERSUS)
const salasActivas = {}; 

app.get('/', (req, res) => { res.send('Servidor Express actiu!'); });

// Crear sala Versus
app.post('/api/salas/crear', async (req, res) => {
  const { codigo, creadorId, nombreCreador, tipo, modo, jugadores, opciones, maxJugadores } = req.body;

  if (!codigo || !creadorId) {
    return res.status(400).json({ success: false, error: 'El código y el creadorId son obligatorios.' });
  }

  try {
    // Guardar la sala en memoria (SÓLO PARA VERSUS)
    salasActivas[codigo] = { creadorId, nombreCreador, jugadores, createdAt: new Date(), maxJugadores: maxJugadores || 2, modo, partidaFinalizada: false };

    // Guardar la sala en la tabla 'SessionsVersus' 
    await db_pool.query(
      'INSERT INTO SessionsVersus (codi_acces, creador_id, estat) VALUES (?, ?, ?)',
      [codigo, creadorId, 'oberta']
    );

    const sessionId = codigo;
    res.json({ success: true, sessionId: sessionId });
  } catch (err) {
    console.error('Error en /api/salas/crear:', err);
    res.status(500).json({ success: false, error: 'Error al crear la sala.' });
  }
});

// Comprobar existencia de sala
app.get('/api/salas/check/:codigo', (req, res) => {
  const { codigo } = req.params;
  
  // 1. Revisamos las salas activas de "Versus"
  if (salasActivas[codigo]) {
    return res.json({ success: true, exists: true, modo: salasActivas[codigo].modo || '2vs2' });
  }

  // 2. Si no está en las salas activas, revisamos si es una sala de "Incursión" de la BDD
  db_pool.query('SELECT id FROM Boss_Sessions WHERE id = ? AND estat <> "finalitzada"', [codigo])
    .then(([rows]) => {
      if (rows.length > 0) {
        res.json({ success: true, exists: true, modo: 'incursion' });
      } else {
        res.status(404).json({ success: false, error: 'La sala no existe o ha expirado.' });
      }
    })
    .catch(err => {
      console.error('Error en /api/salas/check/:codigo consultando la BDD:', err);
      res.status(500).json({ success: false, error: 'Error del servidor al verificar la sala.' });
    });
});

// Iniciar sesión Versus
app.post('/api/sessions/start', (req, res) => {
  const { codigo } = req.body;

  if (!codigo) {
    return res.status(400).json({ success: false, error: 'El código de la sala es obligatorio.' });
  }

  if (salasActivas[codigo]) {
    salasActivas[codigo].partidaFinalizada = false;
  }

  if (sessions.has(codigo)) {
    broadcastToSession(codigo, { type: 'SESSION_STARTED' });
  }

  res.json({ success: true, message: `Sala ${codigo} iniciada.` });
});

// Guardar una nueva rutina y sus ejercicios
app.post('/api/rutinas', async (req, res) => {
  const { userId, nom, descripcio, exercicis } = req.body;

  if (!userId || !nom || !exercicis || !Array.isArray(exercicis)) {
    return res.status(400).json({ success: false, error: 'Faltan datos obligatorios: userId, nom, exercicis.' });
  }

  let connection;
  try {
    connection = await db_pool.getConnection();
    await connection.beginTransaction();

    // 1. Insertar la rutina principal
    const [rutinaResult] = await connection.query(
      'INSERT INTO Rutines (id_usuari, nom, descripcio) VALUES (?, ?, ?)',
      [userId, nom, descripcio]
    );
    const rutinaId = rutinaResult.insertId;

    // 2. Insertar los ejercicios de la rutina
    if (exercicis.length > 0) {
      const ejerciciosValues = exercicis.map(ex => [rutinaId, ex.nom_exercicis, ex.n_repeticions]);
      await connection.query(
        'INSERT INTO Exercicis_Rutina (id_rutina, nom_exercicis, n_repeticions) VALUES ?',
        [ejerciciosValues]
      );
    }

    await connection.commit();
    res.status(201).json({ success: true, rutinaId: rutinaId, message: 'Rutina guardada correctamente.' });

  } catch (err) {
    if (connection) {
      await connection.rollback();
    }
    console.error('Error en /api/rutines:', err);
    res.status(500).json({ success: false, error: 'Error del servidor al guardar la rutina.' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// Obtener todas las rutinas de un usuario
app.get('/api/rutinas/user/:userId', async (req, res) => {
  const { userId } = req.params;

  if (!userId) {
    return res.status(400).json({ success: false, error: 'Falta el ID de usuario.' });
  }

  try {
    // 1. Obtener todas las rutinas del usuario
    const [rutinas] = await db_pool.query(
      'SELECT * FROM Rutines WHERE id_usuari = ? ORDER BY data_creacio DESC',
      [userId]
    );

    if (rutinas.length === 0) {
      return res.json({ success: true, rutines: [] });
    }

    // 2. Para cada rutina, obtener sus ejercicios
    for (let i = 0; i < rutinas.length; i++) {
      const [exercicis] = await db_pool.query(
        'SELECT * FROM Exercicis_Rutina WHERE id_rutina = ?',
        [rutinas[i].id]
      );
      rutinas[i].exercicis = exercicis; // Añadir el array de ejercicios a cada objeto de rutina
    }

    res.json({ success: true, rutines: rutinas });

  } catch (err) {
    console.error(`Error en /api/rutinas/user/${userId}:`, err);
    res.status(500).json({ success: false, error: 'Error del servidor al obtener las rutinas.' });
  }
});

// -------------------- WEBSOCKET --------------------
const wss = new WebSocket.Server({ port: WS_PORT });
const sessions = new Map(); // Map<sessionId, Map<userId, clientId>>
const clientMetadata = new Map(); // Map<clientId, { ws, userId, sessionId, modo, ... }>

function broadcastToSession(sessionId, message) {
  if (!sessions.has(sessionId)) return;
  const userMap = sessions.get(sessionId);

  userMap.forEach(clientId => {
    const metadata = clientMetadata.get(clientId);
    if (metadata && metadata.ws.readyState === WebSocket.OPEN) {
      metadata.ws.send(JSON.stringify(message));
    }
  });
}

async function broadcastIncursionState(sessionId) {
  if (!sessions.has(sessionId)) return;

  try {
    const [sessionRows] = await db_pool.query(
      'SELECT id, creador_id, jefe_vida_max, jefe_vida_actual, estat FROM Boss_Sessions WHERE id = ?',
      [sessionId]
    );

    if (sessionRows.length === 0) return;
    const bossSession = sessionRows[0];

    const [participantRows] = await db_pool.query(
      `SELECT 
          bp.id_usuari, 
          u.usuari as nombre,
          bp.damage AS damageDealt
      FROM Boss_Participants bp 
      JOIN Usuaris u ON bp.id_usuari = u.id 
      WHERE bp.id_boss_sessio = ?`,
      [sessionId]
    );

    const message = {
      type: 'INCURSION_STATE',
      sessionId: bossSession.id,
      creadorId: bossSession.creador_id,
      jefeVidaMax: bossSession.jefe_vida_max,
      jefeVidaActual: bossSession.jefe_vida_actual,
      participantes: participantRows.map(p => ({ 
        id: p.id_usuari, 
        nombre: p.nombre, 
        damageDealt: p.damageDealt || 0 
      })), 
      message: 'Estado de la incursión actualizado.'
    };

    broadcastToSession(sessionId, message);
  } catch (error) {
    console.error('Error en broadcastIncursionState:', error);
  }
}


// --- LÓGICA DE INCURSIÓN: RULETA DE EJERCICIOS ---
const INCURSION_TIMER_DURATION = 60;
const INCURSION_EXERCISES = ['Sentadillas', 'Flexiones', 'Abdominales', 'Zancadas', 'Jumping Jacks', 'Mountain Climbers'];

function startIncursionRuleta(sessionId) {
    const sessionClients = Array.from(clientMetadata.values()).filter(meta => meta.sessionId === sessionId);
    if (sessionClients.length === 0) return;

    sessionClients.forEach(meta => {
        if (meta.incursionTimer) {
            clearInterval(meta.incursionTimer);
            delete meta.incursionTimer;
        }
    });

    let tiempoRestante = INCURSION_TIMER_DURATION;

    sessionClients.forEach(meta => {
        const randomExercise = INCURSION_EXERCISES[Math.floor(Math.random() * INCURSION_EXERCISES.length)];
        broadcastToSession(sessionId, { type: 'NEW_EXERCISE', userId: meta.userId, exercise: randomExercise });
    });
    
    const timer = setInterval(() => {
        if (!sessions.has(sessionId) || sessions.get(sessionId).size === 0) {
            clearInterval(timer);
            return;
        }

        tiempoRestante--;

        if (tiempoRestante <= 0) {
            sessions.get(sessionId).forEach((clientId) => {
                const meta = clientMetadata.get(clientId);
                if (meta) {
                    const randomExercise = INCURSION_EXERCISES[Math.floor(Math.random() * INCURSION_EXERCISES.length)];
                    broadcastToSession(sessionId, { type: 'NEW_EXERCISE', userId: meta.userId, exercise: randomExercise });
                }
            });
            tiempoRestante = INCURSION_TIMER_DURATION; 
        } else {
            broadcastToSession(sessionId, { type: 'TIMER_UPDATE', tiempo: tiempoRestante });
        }
    }, 1000);

    sessionClients.forEach(meta => { meta.incursionTimer = timer; });
}

wss.on('connection', ws => {
  const clientId = uuidv4();
  clientMetadata.set(clientId, { ws }); 
  ws.send(JSON.stringify({ type: 'welcome', clientId }));

  ws.on('message', async message => { 
    let data;
    try {
      data = JSON.parse(message);
    } catch {
      data = { type: 'text', message };
    }
    const { type, sessionId, userId } = data;
    
    let metadata = clientMetadata.get(clientId);
    if (!metadata) {
         metadata = { ws, userId, sessionId };
         clientMetadata.set(clientId, metadata);
    }

    switch (type) {
      case 'JOIN_SESSION': {
            metadata.modo = 'versus';
            metadata.userId = userId;
            metadata.sessionId = sessionId;
            clientMetadata.set(clientId, metadata); 

            if  (!userId) return;
            const sala = salasActivas[sessionId];
            if (!sala) {
                 ws.send(JSON.stringify({ type: 'JOIN_ERROR', message: 'Sala no encontrada' }));
                 return;
            }

            if (!sessions.has(sessionId)) sessions.set(sessionId, new Map());
            if (sessions.get(sessionId).size >= sala.maxJugadores) {
              ws.send(JSON.stringify({ type: 'JOIN_ERROR', message: 'La sala está llena.' }));
              return;
            }
        
            const userMap = sessions.get(sessionId);
            userMap.set(userId, clientId);
        
            metadata.reps = 0;
            metadata.nombre = data.nombre || `Jugador ${userId}`;
            metadata.ready = false;
            clientMetadata.set(clientId, metadata);

            const sessionState = {};
            userMap.forEach((cId, uId) => {
                const meta = clientMetadata.get(cId);
                if (meta) {
                    sessionState[uId] = { nombre: meta.nombre, reps: meta.reps, ready: meta.ready };
                }
            });

            broadcastToSession(sessionId, { 
                type: 'SESSION_STATE', 
                state: sessionState, 
                creatorId: sala.creadorId,
                ejercicio: sala.ejercicio,
                maxReps: sala.maxReps
            });
            break;
        }
      
      case 'INCURSION_JOIN':
        try {
          let bossSessionId = data.sessionId;
          const userId = data.userId;
          
          metadata.modo = 'incursion';
          metadata.userId = userId;
          metadata.nombre = data.nombre;
          metadata.damageDealt = 0;
          
          if (!userId) return;

          if (!bossSessionId) {
            bossSessionId = `BOSS-${uuidv4().slice(0, 6)}`;
            await db_pool.query(
              "INSERT INTO Boss_Sessions (id, creador_id, jefe_vida_max, jefe_vida_actual, estat, max_participants) VALUES (?, ?, ?, ?, ?, ?)",
              [bossSessionId, userId, 300, 300, 'oberta', 10]
            );
          }
          
          metadata.sessionId = bossSessionId;
          clientMetadata.set(clientId, metadata);

          const [sessionInfo] = await db_pool.query("SELECT max_participants, estat FROM Boss_Sessions WHERE id = ?", [bossSessionId]);
          if (sessionInfo.length === 0) {
               ws.send(JSON.stringify({ type: 'JOIN_ERROR', message: 'Incursión no encontrada.' }));
               return;
          }
          const estat = sessionInfo[0]?.estat;

          if (estat !== 'oberta' && estat !== 'en curs') {
            ws.send(JSON.stringify({ type: 'JOIN_ERROR', message: 'La incursión ha finalizado.' }));
            return;
          }

          const [existingParticipant] = await db_pool.query("SELECT id FROM Boss_Participants WHERE id_boss_sessio = ? AND id_usuari = ?", [bossSessionId, userId]);
          
          if (existingParticipant.length === 0) {
            await db_pool.query("INSERT INTO Boss_Participants (id_boss_sessio, id_usuari) VALUES (?, ?)", [bossSessionId, userId]);
          }

          if (!sessions.has(bossSessionId)) sessions.set(bossSessionId, new Map());
          sessions.get(bossSessionId).set(userId, clientId);

          await broadcastIncursionState(bossSessionId);
        } catch (err) {
          console.error('Error en INCURSION_JOIN:', err);
          ws.send(JSON.stringify({ type: 'JOIN_ERROR', message: 'Error del servidor al unirse a la incursión.' }));
        }
      break;

      case 'INCURSION_START': {
        if (metadata.modo !== 'incursion') return;
        const bossSessionId = metadata.sessionId;
        const [sessionRows] = await db_pool.query('SELECT creador_id FROM Boss_Sessions WHERE id = ?', [bossSessionId]);

        if (sessionRows.length > 0 && String(sessionRows[0].creador_id) === String(metadata.userId)) {
            await db_pool.query("UPDATE Boss_Sessions SET estat = 'en curs' WHERE id = ?", [bossSessionId]);
            broadcastToSession(bossSessionId, { type: 'INCURSION_STARTED' }); 
            startIncursionRuleta(bossSessionId);
        }
        break;
      }
      
      case 'INCURSION_ATTACK': {
        if (metadata.modo !== 'incursion') return;

        const { sessionId, userId } = metadata;
        const { damage } = data;

        try {
            const [rows] = await db_pool.query('SELECT jefe_vida_actual, estat FROM Boss_Sessions WHERE id = ?', [sessionId]);
            if (rows.length === 0 || rows[0].estat !== 'en curs') return;

            const vidaActual = rows[0].jefe_vida_actual;
            const nuevaVida = Math.max(0, vidaActual - damage);

            await db_pool.query(
                'UPDATE Boss_Participants SET damage = damage + ? WHERE id_boss_sessio = ? AND id_usuari = ?',
                [damage, sessionId, userId]
            );

            await db_pool.query('UPDATE Boss_Sessions SET jefe_vida_actual = ? WHERE id = ?', [nuevaVida, sessionId]);

            if (nuevaVida === 0) {
                await db_pool.query('UPDATE Boss_Sessions SET estat = "finalitzada" WHERE id = ?', [sessionId]);
                const sessionClients = Array.from(clientMetadata.values()).filter(meta => meta.sessionId === sessionId);
                sessionClients.forEach(meta => {
                    if (meta.incursionTimer) clearInterval(meta.incursionTimer);
                });
            }

            await broadcastIncursionState(sessionId);
            broadcastToSession(sessionId, { type: 'BOSS_HEALTH_UPDATE', jefeVidaActual: nuevaVida, attackerName: metadata.nombre });

        } catch (err) {
            console.error('Error en INCURSION_ATTACK:', err);
        }
        break;
      }
    
      case 'REPS_UPDATE': 
      case 'PLAYER_READY':
      case 'SETTINGS_UPDATE': {
        if (metadata.modo !== 'versus') return;
        
        const sala = salasActivas[metadata.sessionId];
        if (!sala) return;

        if (type === 'REPS_UPDATE') {
             if (sala.partidaFinalizada) return;
             metadata.reps = data.reps;
             clientMetadata.set(clientId, metadata);
             
             if (sala.maxReps && metadata.reps >= sala.maxReps) {
                sala.partidaFinalizada = true;
                broadcastToSession(metadata.sessionId, {
                    type: 'PLAYER_WINS',
                    winnerId: metadata.userId,
                    winnerName: metadata.nombre
                });
             }
        } else if (type === 'PLAYER_READY') {
             metadata.ready = true;
             clientMetadata.set(clientId, metadata);
        } else if (type === 'SETTINGS_UPDATE') {
             if (String(metadata.userId) === String(sala.creadorId)) {
                 sala.ejercicio = data.ejercicio;
                 sala.maxReps = data.maxReps;
                 broadcastToSession(metadata.sessionId, { type: 'SETTINGS_UPDATED', ejercicio: data.ejercicio, maxReps: data.maxReps });
                 return;
             }
        }

        const userMap = sessions.get(metadata.sessionId);
        const sessionState = {};
        userMap.forEach((cId, uId) => {
            const meta = clientMetadata.get(cId);
            sessionState[uId] = { nombre: meta?.nombre, reps: meta?.reps || 0, ready: meta?.ready || false };
        });

        broadcastToSession(metadata.sessionId, { 
            type: 'SESSION_STATE', 
            state: sessionState, 
            creatorId: sala.creadorId,
            ejercicio: sala.ejercicio,
            maxReps: sala.maxReps
        });
        break;
      }
    }
  });

  // --- LÓGICA DE CIERRE MEJORADA ---
  ws.on('close', () => { 
    const metadata = clientMetadata.get(clientId);
    if (!metadata || !metadata.sessionId) {
      clientMetadata.delete(clientId);
      return;
    }

    const { sessionId, userId, modo } = metadata;
    const userMap = sessions.get(sessionId);

    if (!userMap) {
      clientMetadata.delete(clientId);
      return;
    }

    userMap.delete(userId);
    clientMetadata.delete(clientId); 
    
    if (userMap.size === 0) {
      sessions.delete(sessionId);
      
      if (modo === 'versus') {
        delete salasActivas[sessionId]; 
        // --- ACTUALIZACIÓN EN BDD PARA VERSUS ---
        // Marcamos la sala como finalizada en la base de datos cuando se vacía
        db_pool.query("UPDATE SessionsVersus SET estat = 'finalitzada' WHERE codi_acces = ?", [sessionId])
            .catch(err => console.error("Error al cerrar SesionVersus en BDD:", err));

      } else if (modo === 'incursion') {
        db_pool.query("UPDATE Boss_Sessions SET estat = 'finalitzada' WHERE id = ?", [sessionId])
          .catch(err => console.error("Error al cerrar Boss_Session en BDD:", err));
        
        Array.from(clientMetadata.values()).filter(meta => meta.sessionId === sessionId).forEach(meta => {
            if (meta.incursionTimer) clearInterval(meta.incursionTimer);
        });
      }
      return; 
    }
    
    if (modo === 'incursion') {
      broadcastIncursionState(sessionId);
    } else if (modo === 'versus') {
      const salaSettings = salasActivas[sessionId] || {};
      const participantesVersus = {};
      userMap.forEach((cId, uId) => {
          const meta = clientMetadata.get(cId);
          participantesVersus[uId] = { nombre: meta.nombre, reps: meta.reps, ready: meta.ready };
      });
      
      broadcastToSession(sessionId, { 
          type: 'SESSION_STATE', 
          state: participantesVersus,
          creatorId: salaSettings.creadorId,
          ejercicio: salaSettings.ejercicio,
          maxReps: salaSettings.maxReps,
          message: `${metadata.nombre || 'Un jugador'} ha abandonado la sala.`
      });
    }
  });

}); 

// -------------------- INICIAR SERVIDOR --------------------
let httpServer;

// MODIFICACIÓN: Añadimos .catch() a Sequelize para atrapar errores de DB
db.sequelize.sync()
    .then(() => {
        console.log('Base de dades sincronitzada amb Sequelize.');
        // CORRECCIÓN CLAVE: El host debe ser el primer argumento de listen() para que
        // el servidor acepte conexiones externas dentro de la red de Docker.
        httpServer = app.listen(API_PORT, '0.0.0.0', () => console.log(`Servidor Express en 0.0.0.0:${API_PORT}`));
    })
    .catch(err => { 
        console.error("ERROR CRÍTICO AL SINCRONIZAR BASE DE DATOS:", err.message);
        shutdown(1); // Forzar cierre si la DB falla
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
