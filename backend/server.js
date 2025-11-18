// server.js
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser'); // Aunque Express ya lo incluye, lo mantengo por si acaso
const cors = require('cors'); 
const bcrypt = require('bcrypt');
const db = require('./models'); // Se mantiene, aunque el pool se usa más
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

const app = express();

const API_PORT = process.env.API_PORT || 9000; // Puerto para el servidor HTTP
const WS_PORT = process.env.WS_PORT || 8082; // Puerto para el servidor WebSocket

// --- Configuración de CORS ---
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
// ...existing code...
app.use(express.json());
app.set('etag', false);

// Compatibilidad: normalizar campos recibidos en snake_case a camelCase
app.use((req, res, next) => {
    if (req.body && typeof req.body === 'object') {
        // Aseguramos que creadorId siempre exista si se envía creador_id
        if (req.body.creador_id) {
            req.body.creadorId = req.body.creador_id;
        }
        // Añade más mapeos si encuentras otras inconsistencias
    }
    next();
});
// ...existing code...
// --- Dependencia del pool de MySQL ---
// NOTA: Asegúrate de que tu './config/db' exporta el pool.
const db_pool = require('./config/db').pool; 

// -------------------- ESTRUCTURAS DE DATOS EN MEMORIA (MEJORADAS) --------------------
// sessions: Map<sessionId, Map<userId, clientId>>
const sessions = new Map();

// clientMetadata: Map<clientId, { ws: WebSocket, userId: string, sessionId: string, reps: number, nombre: string, ready: boolean, damageDealt: number, incursionTimer: Interval }>
const clientMetadata = new Map();

// salasActivas: { sessionId: { creadorId, nombreCreador, createdAt, maxJugadores, modo, ejercicio: string, maxReps: number, partidaFinalizada: boolean, jefeVidaMax: number, jefeVidaActual: number } }
const salasActivas = {}; 

// --- CONSTANTES DE INCURSIÓN ---
const INCURSION_TIMER_DURATION = 60; 
const INCURSION_EXERCISES = ['Sentadillas', 'Flexiones', 'Abdominales', 'Zancadas', 'Jumping Jacks', 'Mountain Climbers'];

// Función para enviar mensajes a todos los clientes de una sesión
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

// -------------------- RUTAS API --------------------

// Ruta raíz
app.get('/', (req, res) => { res.send('Servidor Express actiu!'); });

/**
 * Endpoint: Crear incursión (Boss Showdown)
 * Se actualiza para usar una ID única (UUID simplificado) y guardarla en memoria/DB.
 */
app.post('/api/incursiones/crear', async (req, res) => {
    const { creadorId, jefeVidaMax = 300, maxParticipants = 10 } = req.body;
    if (!creadorId) return res.status(400).json({ error: 'Falta el ID del creador.' });

    const sessionId = Math.floor(Math.random() * 1000000); // ID numèric de 6 dígits

    try {
        const [users] = await db_pool.query('SELECT id FROM Usuaris WHERE id = ?', [creadorId]);
        if (users.length === 0) {
            return res.status(400).json({ error: `El creador amb ID ${creadorId} no existeix.` });
        }
        // Guardar en boss_sessions (Base de datos)
        // CORRECCIÓN: Usar `creadorId` (camelCase) para que coincida con schema.sql
        // CORRECCIÓN 2: Usar `creador_id` (snake_case) para que coincida con schema.sql actualizado
        await db_pool.query(
            "INSERT INTO boss_sessions (id, creador_id, jefe_vida_max, jefe_vida_actual, estat, max_participants) VALUES (?, ?, ?, ?, ?, ?)",
            [sessionId, creadorId, jefeVidaMax, jefeVidaMax, 'oberta', maxParticipants]
        );
        // Guardar en memoria
        salasActivas[sessionId] = { 
            creadorId, 
            createdAt: new Date(), 
            maxJugadores: maxParticipants, 
            modo: 'incursion',
            partidaFinalizada: false,
            jefeVidaMax: jefeVidaMax,
            jefeVidaActual: jefeVidaMax
        };

        res.status(201).json({ sessionId });
    } catch (error) {
        console.error('Error al crear la incursión:', error);
        res.status(500).json({ error: 'Error interno al crear la incursión.' });
    }
});

/**
 * Endpoint: Crear sala (SessionsVersus o Boss_Sessions).
 * Se actualiza para manejar ambos modos de creación, aunque Boss usa su propio endpoint.
 */
// ...existing code...
app.post('/api/salas/crear', async (req, res) => {
    const { codigo, creadorId, nombreCreador, modo, maxJugadores, ejercicio = 'Sentadillas', maxReps = 5 } = req.body;

    if (!codigo && modo !== 'incursion') {
        return res.status(400).json({ success: false, error: 'El código y el creadorId son obligatorios.' });
    }

    try {
        if (modo === 'multijugador') {
            // Guardar en SessionsVersus (BDD) - SessionsVersus usa columna `creador_id` en schema.sql
            await db_pool.query(
                'INSERT INTO SessionsVersus (codi_acces, creador_id, estat) VALUES (?, ?, ?)',
                [codigo, creadorId, 'oberta']
            );
            // CORRECCIÓN: La tabla SessionsVersus ya no tiene un ID numérico.
            // Simplemente registramos la sala en memoria. La persistencia se puede mejorar después.
            // await db_pool.query(
            //     'INSERT INTO SessionsVersus (codi_acces, creador_id, estat) VALUES (?, ?, ?)',
            //     [codigo, creadorId, 'oberta']
            // );

            salasActivas[codigo] = { 
                creadorId, 
                nombreCreador, 
                createdAt: new Date(), 
                maxJugadores: maxJugadores || 2, 
                modo,
                ejercicio,
                maxReps,
                partidaFinalizada: false 
            };
            return res.json({ success: true, sessionId: codigo });
        } else if (modo === 'incursion') {
            if (!creadorId) {
                return res.status(400).json({ success: false, error: 'El creadorId es obligatorio para incursiones.' });
            }
            const [users] = await db_pool.query('SELECT id FROM Usuaris WHERE id = ?', [creadorId]);
            if (users.length === 0) {
                return res.status(400).json({ error: `El creador amb ID ${creadorId} no existeix.` });
            }
            // Soporte: si el frontend crea la incursión vía /api/salas/crear, crear boss_sessions (BDD usa `creadorId` según schema.sql)
            const sessionId = Math.floor(Math.random() * 1000000); // ID numèric de 6 dígits
            const maxP = maxJugadores || 10;
            const jefeVida = 300;
            await db_pool.query(
                "INSERT INTO boss_sessions (id, creador_id, jefe_vida_max, jefe_vida_actual, estat, max_participants) VALUES (?, ?, ?, ?, ?, ?)",
                [sessionId, creadorId, jefeVida, jefeVida, 'oberta', maxP]
            );

            salasActivas[sessionId] = { 
                creadorId, 
                createdAt: new Date(), 
                maxJugadores: maxP, 
                modo: 'incursion',
                partidaFinalizada: false,
                jefeVidaMax: jefeVida,
                jefeVidaActual: jefeVida
            };

            return res.status(201).json({ success: true, sessionId });
        } else {
             return res.status(400).json({ success: false, error: 'Modo de juego no válido.' });
        }
        
    } catch (err) {
        console.error('Error en /api/salas/crear:', err);
        res.status(500).json({ success: false, error: 'Error al crear la sala.' });
    }
});
// ...existing code...

/**
 * Endpoint: Comprobar si la sala existe y qué modo usa.
 */
app.get('/api/salas/check/:codigo', (req, res) => {
    const { codigo } = req.params;
    
    // 1. Revisar salas activas en memoria (Versus)
    if (salasActivas[codigo]) {
        return res.json({ success: true, exists: true, modo: salasActivas[codigo].modo || 'multijugador' });
    }

    // 2. Revisar boss_sessions en BDD (Incursión)
db_pool.query('SELECT id, creador_id, jefe_vida_max, jefe_vida_actual, estat, max_participants FROM boss_sessions WHERE id = ?', [codigo])
    .then(([rows]) => {
        if (rows.length > 0) {
            if (!salasActivas[codigo]) {
                const bossSession = rows[0];
                salasActivas[codigo] = {
                    creadorId: bossSession.creador_id,
                    createdAt: new Date(),
                    maxJugadores: bossSession.max_participants,
                    modo: 'incursion',
                    partidaFinalizada: bossSession.estat === 'finalitzada',
                    jefeVidaMax: bossSession.jefe_vida_max,
                    jefeVidaActual: bossSession.jefe_vida_actual
                };
            }
            res.json({ success: true, exists: true, modo: 'incursion' });
        } else {
            res.status(404).json({ success: false, error: 'La sala no existe o ha expirado.' });
        }
    })
    .catch(err => {
        console.error('Error en /api/salas/check/:codigo consultando la BDD:', err);
        res.status(500).json({ success: false, error: 'Error del servidor al verificar la sala.' });
    });
// ...existing code...
});

/**
 * Endpoint: Iniciar Partida (Versus)
 */
app.post('/api/sessions/start', async (req, res) => {
    const { codigo, iniciadorId } = req.body;
    const sala = salasActivas[codigo];

    if (!codigo || !sala) {
        return res.status(400).json({ success: false, error: 'El código de la sala es obligatorio o la sala no existe.' });
    }

    if (String(sala.creadorId) !== String(iniciadorId)) {
        return res.status(403).json({ success: false, error: 'Solo el creador puede iniciar la partida.' });
    }

    sala.partidaFinalizada = false; // Reiniciar estado al iniciar

    // Notificar a todos los clientes WS en la sala que la partida ha comenzado
    broadcastToSession(codigo, { type: 'SESSION_STARTED' });

    // Para la incursión, la lógica de inicio se maneja en el WS ('INCURSION_START')
    if (sala.modo === 'incursion') {
        // Notificar al cliente WS que debe enviar 'INCURSION_START' si es el creador.
        // O simplemente dejamos que el cliente lo haga. Aquí solo confirmamos el inicio de la sesión Versus.
    }


    res.json({ success: true, message: `Sala ${codigo} iniciada.` });
});

// Rutes d'usuari (asumo que están en ./routes/userRoutes)
const userRoutes = require('./routes/userRoutes');
app.use('/api/users', userRoutes);


// -------------------- RUTAS ORIGINALES MANTENIDAS (Rutinas/Boss) --------------------
// Rutas de Rutinas y Boss (Mantengo tu lógica original con db_pool)
// ... (resto de tus rutas API originales: /api/session/save, /api/boss/create, /api/boss/join, /api/boss/:bossId, /api/boss/attack, /api/exercicis_rutina, /api/rutines/user/:id, /api/rutines/:id)
// Las integro a continuación para mantener el archivo completo.

// Crear sesión Versus (Tu ruta original)
app.post('/api/session/save', async (req, res) => {
    const { userId, nom, descripcio, exercicis } = req.body;
    let finalUserId = userId;

    try {
        // validar si el userId existe
        if (finalUserId) {
            const [rows] = await db_pool.query('SELECT id FROM Usuaris WHERE id = ?', [finalUserId]);
            if (rows.length === 0) finalUserId = null; 
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

// Unirse al Boss (Tu ruta original)
app.post('/api/boss/join', async (req, res) => { // Ahora se usa para registrarse antes de conectar por WS
    const { bossId, usuariId } = req.body;
    try {
        // Comprobar si ya está inscrito
        const [exists] = await db_pool.query(
            'SELECT * FROM boss_participants WHERE id_boss_sessio=? AND id_usuari=?',
            [bossId, usuariId]
        );
        if (exists.length === 0) {
            // Si no está, lo insertamos
            await db_pool.query(
                'INSERT INTO boss_participants (id_boss_sessio, id_usuari) VALUES (?,?)',
                [bossId, usuariId]
            );
        }
        // Notificar a todos los clientes en la sala (si hay alguno conectado) sobre el nuevo participante
        await broadcastIncursionState(bossId);

        res.json({ success: true, message: 'Participante agregado' });
    } catch (err) {
        res.status(500).json({ error: 'Error al unirse a la sesión de boss' });
    }
});

// Obtener estado del Boss (Tu ruta original)
app.get('/api/boss/:bossId', async (req, res) => {
    const { bossId } = req.params;
    try {
        const [rows] = await db_pool.query(
            'SELECT jefe_vida_max, jefe_vida_actual, max_participants, estat FROM boss_sessions WHERE id=?',
            [bossId]
        );
        if (rows.length === 0) return res.status(404).json({ success: false, error: 'Boss no encontrado' });
        res.json({ success: true, boss: rows[0] });
    } catch (err) {
        console.error('Error al obtener estado del boss:', err);
        res.status(500).json({ success: false, error: 'Error del servidor' });
    }
});

// Aplicar Ataque al Boss (Tu ruta original) -> Ya no se usa por el cliente, ahora es con WS.
// Mantengo la ruta por si se usa en otro lado, pero la lógica principal es WS.
app.post('/api/boss/attack', async (req, res) => {
    const { bossId, danoAplicado } = req.body;
    if (!bossId || danoAplicado == null) {
        return res.status(400).json({ success: false, error: 'bossId y danoAplicado son requeridos.' });
    }
    try {
        const [rows] = await db_pool.query('SELECT jefe_vida_actual FROM boss_sessions WHERE id = ?', [bossId]);
        if (rows.length === 0) return res.status(404).json({ success: false, error: 'Boss no encontrado' });

        const vidaActual = rows[0].jefe_vida_actual;
        const nuevaVida = Math.max(0, vidaActual - danoAplicado);

        await db_pool.query(
            'UPDATE boss_sessions SET jefe_vida_actual = ? WHERE id = ?',
            [nuevaVida, bossId]
        );

        if (nuevaVida === 0) {
            await db_pool.query(
                'UPDATE boss_sessions SET estat = "finalitzada" WHERE id = ?',
                [bossId]
            );
        }
        res.json({ success: true, nuevaVida });
    } catch (err) {
        console.error('Error al aplicar daño al boss:', err);
        res.status(500).json({ success: false, error: 'Error al actualizar vida del boss' });
    }
});

// Ejercicios en Rutina (Tu ruta original)
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

// Obtener Rutinas (Tu ruta original)
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
                map.get(row.rutina_id).exercicis.push({ id: row.ejercicio_id, nom_exercicis: row.nom_exercicis, n_repeticiones: row.n_repeticiones });
            }
        }
        const rutines = Array.from(map.values());
        res.json({ success: true, rutines });
    } catch (err) {
        console.error('Error al obtener rutinas del usuario:', err);
        res.status(500).json({ success: false, error: 'Error del servidor' });
    }
});

// Eliminar Rutina (Tu ruta original)
app.delete('/api/rutines/:id', async (req, res) => {
    const { id } = req.params
    try {
        await db_pool.query('DELETE FROM Exercicis_Rutina WHERE id_rutina = ?', [id])
        await db_pool.query('DELETE FROM Rutines WHERE id = ?', [id])
        res.json({ success: true })
    } catch (err) {
        console.error('Error al eliminar rutina:', err)
        res.status(500).json({ success: false })
    }
})


// -------------------- WEBSOCKET (WSS) --------------------

const wss = new WebSocket.Server({ port: WS_PORT });

/**
 * Lógica de incursión: Inicia el bucle de ruleta de ejercicios.
 */
function startIncursionRuleta(sessionId) {
    const sala = salasActivas[sessionId];
    if (!sala || sala.modo !== 'incursion') return;

    if (sala.incursionTimer) {
        clearInterval(sala.incursionTimer);
    }

    let tiempoRestante = INCURSION_TIMER_DURATION;

    // Asignación inicial de ejercicios al empezar
    const userMapOnStart = sessions.get(sessionId);
    if (userMapOnStart) {
        userMapOnStart.forEach((clientId, userId) => {
            const randomExercise = INCURSION_EXERCISES[Math.floor(Math.random() * INCURSION_EXERCISES.length)];
            broadcastToSession(sessionId, { type: 'NEW_EXERCISE', userId: userId, exercise: randomExercise });
        });
    }

    const timer = setInterval(() => {
        if (!sessions.has(sessionId) || sessions.get(sessionId).size === 0) {
            clearInterval(timer);
            sala.incursionTimer = null;
            return;
        }

        tiempoRestante--;

        if (tiempoRestante <= 0) {
            // Asignar un nuevo ejercicio a cada participante
            const userMap = sessions.get(sessionId);
            userMap.forEach((clientId, userId) => {
                const randomExercise = INCURSION_EXERCISES[Math.floor(Math.random() * INCURSION_EXERCISES.length)];
                broadcastToSession(sessionId, { type: 'NEW_EXERCISE', userId: userId, exercise: randomExercise });
            });
            tiempoRestante = INCURSION_TIMER_DURATION; // Reiniciar timer
        } else {
            broadcastToSession(sessionId, { type: 'TIMER_UPDATE', tiempo: tiempoRestante });
        }
    }, 1000);

    sala.incursionTimer = timer; // Almacenar el intervalo en la sala activa
}

/**
 * Retransmitir el estado actual de la incursión (vida, participantes).
 */
async function broadcastIncursionState(sessionId) {
    const sala = salasActivas[sessionId];
    if (!sessions.has(sessionId) || !sala || sala.modo !== 'incursion') return;

    try {
        // ...existing code...
     const [sessionRows] = await db_pool.query(
    'SELECT id, creador_id, jefe_vida_max, jefe_vida_actual, estat FROM boss_sessions WHERE id = ?',
    [sessionId]
);
    if (sessionRows.length === 0) return;
    const bossSession = sessionRows[0];
// ...existing code...
        
        // Obtener participantes y sus nombres de la BDD
        const [participantRows] = await db_pool.query(
            'SELECT bp.id_usuari, u.usuari as nombre FROM boss_participants bp JOIN Usuaris u ON bp.id_usuari = u.id WHERE bp.id_boss_sessio = ?',
            [sessionId]
        );
        
        // Obtener el daño actual de memoria (o 0 si no está)
        const participantes = participantRows.map(p => {
            const userId = String(p.id_usuari);
            // Buscar el daño acumulado en la metadata de cualquier cliente conectado de ese usuario
            let damageDealt = 0;
            const clientId = sessions.get(sessionId)?.get(userId);
            if (clientId) {
                damageDealt = clientMetadata.get(clientId)?.damageDealt || 0;
            }
            return { id: userId, nombre: p.nombre, damageDealt };
        });

        const message = {
            type: 'INCURSION_STATE',
            sessionId: bossSession.id,
            creadorId: sala.creadorId, // Usar la memoria para el creador actual
            jefeVidaMax: bossSession.jefe_vida_max,
            jefeVidaActual: bossSession.jefe_vida_actual,
            participantes: participantes,
            message: 'Estado de la incursión actualizado.'
        };

        broadcastToSession(sessionId, message);
    } catch (error) {
        console.error('Error en broadcastIncursionState:', error);
    }
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
            return;
        }
        const { type, sessionId, userId } = data;
        
        // Asignamos metadatos básicos al cliente si aún no los tiene (solo si el mensaje incluye ID de sesión y usuario)
        if (sessionId && userId && !clientMetadata.get(clientId).sessionId) {
            clientMetadata.set(clientId, { ws, userId: String(userId), sessionId, reps: 0, nombre: data.nombre || `Jugador ${userId}`, ready: false, damageDealt: 0 });
        }
        const metadata = clientMetadata.get(clientId);

        switch (type) {
            case 'JOIN_SESSION': {
                // Lógica de unión para modo Versus (Multijugador)
                if (!userId || !metadata || !salasActivas[sessionId] || salasActivas[sessionId].modo !== 'multijugador') {
                    ws.send(JSON.stringify({ type: 'JOIN_ERROR', message: 'Sala no válida o faltan datos.' }));
                    ws.terminate();
                    return;
                }
                const sala = salasActivas[sessionId];
                
                // 1. Crear sesión si no existe en memoria (o re-conectar)
                if (!sessions.has(sessionId)) sessions.set(sessionId, new Map());
                const userMap = sessions.get(sessionId);
                
                // 2. Comprobar si está llena o partida ya iniciada
                if (userMap.size >= sala.maxJugadores) {
                    ws.send(JSON.stringify({ type: 'JOIN_ERROR', message: 'La sala está llena.' }));
                    ws.terminate();
                    return;
                }
                if (sala.partidaFinalizada === false) { 
                    // Asumimos que si no está finalizada y ya empezó, no se puede unir. 
                    // La lógica del cliente lo gestiona en el componente.
                }

                // 3. Registrar al cliente (gestión de re-conexión)
                userMap.set(String(userId), clientId);
                clientMetadata.set(clientId, { ...metadata, userId: String(userId), sessionId, reps: 0, ready: false });

                // 4. Enviar estado actualizado
                const sessionState = {};
                userMap.forEach((cId, uId) => {
                    const meta = clientMetadata.get(cId);
                    if (meta) { sessionState[uId] = { nombre: meta.nombre, reps: meta.reps, ready: meta.ready }; }
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
                // Lógica de unión para modo Incursión
                try {
                    let sessionId = data.sessionId;
                    const userId = String(data.userId);
                    const nombreUsuario = data.nombre;

                    if (!userId) { ws.send(JSON.stringify({ type: 'JOIN_ERROR', message: 'Se requiere un ID de usuario.' })); ws.terminate(); return; }

                    // Si no hay sessionId, el cliente ya ha llamado a /api/incursiones/crear y nos lo da. 
                    // Si el cliente no lo da, no deberíamos llegar aquí. Lo forzamos.
                    if (!sessionId) { ws.send(JSON.stringify({ type: 'JOIN_ERROR', message: 'Falta ID de incursión.' })); ws.terminate(); return; }

                    // Asegurar que la sala existe en memoria (si no, cargarla de la DB)
                    // CORRECCIÓN: Asegurarse de que la sala de incursión se carga desde la tabla correcta (`boss_sessions`)
                    if (!salasActivas[sessionId]) {
                        const [bossInfo] = await db_pool.query(
                            "SELECT creador_id, jefe_vida_max, jefe_vida_actual, max_participants FROM boss_sessions WHERE id = ?",
                            [sessionId]
                        );
                        if (bossInfo.length === 0) { ws.send(JSON.stringify({ type: 'JOIN_ERROR', message: 'La incursión no existe.' })); ws.terminate(); return; }

                        salasActivas[sessionId] = { 
                            modo: 'incursion', 
                            creadorId: bossInfo[0].creador_id, 
                            maxJugadores: bossInfo[0].max_participants,
                            partidaFinalizada: bossInfo[0].jefe_vida_actual <= 0,
                            jefeVidaMax: bossInfo[0].jefe_vida_max,
                            jefeVidaActual: bossInfo[0].jefe_vida_actual
                        };
                    }
                    const sala = salasActivas[sessionId];

                    // Comprobar participantes y añadir a la DB (si no está)
                    const [existingParticipants] = await db_pool.query("SELECT id FROM boss_participants WHERE id_boss_sessio = ? AND id_usuari = ?", [sessionId, userId]);
                    if (existingParticipants.length === 0) {
                         const [participantCount] = await db_pool.query("SELECT COUNT(*) as count FROM boss_participants WHERE id_boss_sessio = ?", [sessionId]);
                         if (participantCount[0].count >= sala.maxJugadores) { ws.send(JSON.stringify({ type: 'JOIN_ERROR', message: 'La sala de incursión está llena.' })); ws.terminate(); return; }

                        await db_pool.query("INSERT INTO boss_participants (id_boss_sessio, id_usuari) VALUES (?, ?)", [sessionId, userId]);
                    }

                    // Registrar al cliente en memoria
                    if (!sessions.has(sessionId)) sessions.set(sessionId, new Map());
                    sessions.get(sessionId).set(userId, clientId);
                    clientMetadata.set(clientId, { ...metadata, userId, sessionId, nombre: nombreUsuario, damageDealt: 0, reps: 0 });

                    // Enviar estado actualizado
                    await broadcastIncursionState(sessionId);

                    // Si la partida ya está activa, iniciar el temporizador para este cliente
                    if (sala.incursionTimer) {
                        broadcastToSession(sessionId, { type: 'INCURSION_STARTED' }); // Re-inicia la UI
                    }
                } catch (err) {
                    console.error('Error en INCURSIÓN_JOIN:', err);
                    ws.send(JSON.stringify({ type: 'JOIN_ERROR', message: 'Error del servidor al unirse a la incursión.' }));
                }
                break;
            case 'INCURSION_START': {
                if (!metadata || !metadata.sessionId || salasActivas[metadata.sessionId].modo !== 'incursion') return;
                const sala = salasActivas[metadata.sessionId];
               // ...existing code...
const [sessionRows] = await db_pool.query('SELECT creador_id FROM boss_sessions WHERE id = ?', [metadata.sessionId]);

if (sessionRows.length > 0 && String(sessionRows[0].creador_id) === String(metadata.userId)) {
    await db_pool.query("UPDATE boss_sessions SET estat = 'en curs' WHERE id = ?", [metadata.sessionId]);
    sala.partidaIniciada = true;
    broadcastToSession(metadata.sessionId, { type: 'INCURSION_STARTED' });
    startIncursionRuleta(metadata.sessionId);
}
 // ...existing code...
                break;
            }
            case 'INCURSION_ATTACK': {
                if (!metadata || !metadata.sessionId || salasActivas[metadata.sessionId].modo !== 'incursion') return;

                const { sessionId, nombre: attackerName } = metadata;
                const { damage } = data;
                if (!damage) return;
                
                try {
                    const [rows] = await db_pool.query('SELECT jefe_vida_actual FROM boss_sessions WHERE id = ?', [sessionId]);
                    if (rows.length === 0) return;

                    const vidaActual = rows[0].jefe_vida_actual;
                    const nuevaVida = Math.max(0, vidaActual - damage);
                    
                    await db_pool.query('UPDATE boss_sessions SET jefe_vida_actual = ? WHERE id = ?', [nuevaVida, sessionId]);

                    // Actualizar memoria (daño total y reps)
                    metadata.damageDealt += damage;
                    metadata.reps = (metadata.reps || 0) + 1;
                    clientMetadata.set(clientId, metadata);
                    salasActivas[sessionId].jefeVidaActual = nuevaVida; // Sincronizar memoria

                    broadcastToSession(sessionId, {
                        type: 'BOSS_HEALTH_UPDATE',
                        jefeVidaActual: nuevaVida,
                        attackerName: attackerName
                    });

                    if (nuevaVida === 0) {
                        clearInterval(salasActivas[sessionId]?.incursionTimer);
                        await db_pool.query("UPDATE boss_sessions SET estat = 'finalitzada' WHERE id = ?", [sessionId]);
                        broadcastToSession(sessionId, { type: 'INCURSION_ENDED', winner: 'Participantes' });
                    }
                } catch (err) { console.error('Error en INCURSIÓN_ATTACK:', err); }
                break;
            }
            case 'REPS_UPDATE': 
            case 'PLAYER_READY':
            case 'SETTINGS_UPDATE': {
                // Lógica centralizada para Versus
                if (!metadata || !metadata.sessionId || salasActivas[metadata.sessionId].modo !== 'multijugador') return;
                const sala = salasActivas[metadata.sessionId];
                const userMap = sessions.get(metadata.sessionId);
                
                if (type === 'PLAYER_READY') metadata.ready = true;
                if (type === 'REPS_UPDATE') {
                    metadata.reps = data.reps;
                    if (metadata.reps >= sala.maxReps && !sala.partidaFinalizada) {
                        sala.partidaFinalizada = true;
                        broadcastToSession(metadata.sessionId, { type: 'PLAYER_WINS', winnerId: metadata.userId, winnerName: metadata.nombre });
                        return;
                    }
                }
                if (type === 'SETTINGS_UPDATE' && String(metadata.userId) === String(sala.creadorId)) {
                    sala.ejercicio = data.ejercicio;
                    sala.maxReps = data.maxReps;
                    broadcastToSession(metadata.sessionId, { type: 'SETTINGS_UPDATED', ejercicio: data.ejercicio, maxReps: data.maxReps });
                    return; // No se necesita re-emitir el estado completo después de un SETTINGS_UPDATE
                }
                
                clientMetadata.set(clientId, metadata);

                // Re-emitir estado de la sesión
                const sessionState = {};
                userMap.forEach((cId, uId) => {
                    const meta = clientMetadata.get(cId);
                    if (meta) sessionState[uId] = { nombre: meta.nombre, reps: meta.reps || 0, ready: meta.ready || false };
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

    ws.on('close', async () => { 
        const metadata = clientMetadata.get(clientId);
        if (!metadata || !metadata.sessionId) { clientMetadata.delete(clientId); return; }

        const { sessionId, userId } = metadata;
        const sala = salasActivas[sessionId];
        const userMap = sessions.get(sessionId);

        if (!userMap || !sala) { clientMetadata.delete(clientId); return; }

        // 1. Limpieza de estructuras
        userMap.delete(userId);
        clientMetadata.delete(clientId);
        console.log(`Jugador ${userId} ha salido de la sala ${sessionId}.`);

        // 2. Lógica de re-escalado/cierre
        if (userMap.size === 0) {
            sessions.delete(sessionId);
            clearInterval(sala.incursionTimer);
            delete salasActivas[sessionId];
            
            if (sala.modo === 'incursion') {
                db_pool.query("UPDATE boss_sessions SET estat = 'finalitzada' WHERE id = ?", [sessionId]).catch(err => console.error("Error al cerrar boss_sessions en BDD:", err));
            }
            console.log(`La sala ${sessionId} ha quedado vacía y ha sido cerrada.`);
            return; 
        }

        // Si el creador de la incursión se va, reasignar creador
        if (sala.modo === 'incursion' && String(userId) === String(sala.creadorId) && !sala.partidaIniciada) {
            const newCreatorId = userMap.keys().next().value;
            if (newCreatorId) {
                sala.creadorId = newCreatorId;
                console.log(`Nuevo creador de incursión: ${newCreatorId}`);
            }
        }
        
        // 3. Notificación a los restantes
        if (sala.modo === 'incursion') {
            // Re-emitir estado de incursión
            await broadcastIncursionState(sessionId);
        } else {
            // Re-emitir estado de versus
            const participantesVersus = [];
            userMap.forEach((cId, uId) => {
                const meta = clientMetadata.get(cId);
                if (meta) participantesVersus.push({ id: uId, nombre: meta.nombre, reps: meta.reps, ready: meta.ready });
            });
        
            broadcastToSession(sessionId, { 
                type: 'SESSION_STATE', 
                state: Object.fromEntries(participantesVersus.map(p => [p.id, { nombre: p.nombre, reps: p.reps, ready: p.ready }])),
                creatorId: sala.creadorId,
                ejercicio: sala.ejercicio,
                maxReps: sala.maxReps,
                message: `${metadata.nombre || 'Un jugador'} ha abandonado la sala.`
            });
        }
    });
});

// -------------------- INICIAR SERVIDOR --------------------
let httpServer;

db.sequelize.sync().then(async () => {
    console.log('Base de dades sincronitzada amb Sequelize.');
    // La función ensureBossSessionsCompat() ya no es necesaria.
    console.log('Compat DB: Schema estandarizado, no se requiere parcheo.');
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