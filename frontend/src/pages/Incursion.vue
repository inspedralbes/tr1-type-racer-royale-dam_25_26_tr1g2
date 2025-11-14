<template>
  <v-container fluid class="pa-4 incursion-background">
    <v-row class="mb-4 align-center justify-space-between">
      <v-col cols="auto">
        <v-btn color="error" rounded large to="/inicial">
              <v-icon left>mdi-arrow-left</v-icon>
              Volver
            </v-btn>
      </v-col>
      <v-col cols="auto" class="text-center">
        <h1 class="text-h4 text-sm-h3 font-weight-black battle-title">
          INCURSIÓN CONTRA EL JEFE
        </h1>
        <div v-if="bossSessionId" class="text-center mt-2">
          <v-chip color="primary" small class="text-caption text-sm-body-2">
            <v-icon left small>mdi-account-group</v-icon>
            Jugadores: {{ participantes.length }} / {{ MAX_PARTICIPANTS }}
          </v-chip>
        </div> 
      </v-col>
      <v-col cols="auto" class="text-right" v-if="bossSessionId">
        <div class="reps-display">
          REPS: <span class="text-h4">{{ repeticiones }}</span>
        </div>
      </v-col>
    </v-row> 
    
    <v-row>
      
      <v-col cols="12" md="6" order-md="1">
        <v-card class="pa-3 pa-sm-4 game-card player-card fill-height">
          <h2 class="text-h6 text-sm-h5 font-weight-bold mb-3 text-center player-title">TU ENTRENADOR</h2>

          <div class="mb-4">
            <div class="d-flex align-center justify-space-between mb-1">
                <div class="text-caption font-weight-bold text-truncate">TU HP</div>
                <div class="text-caption font-weight-bold">
                    {{ jugadorVidaActual }} / {{ jugadorVidaMaxima }}
                </div>
            </div>
            <v-progress-linear
                :value="jugadorVidaPorcentaje"
                height="18"
                rounded
                :color="calcularColorVida(jugadorVidaPorcentaje)" >
                 <template v-slot:default="{ value }">
                  <strong class="health-text text-caption">{{ Math.ceil(value) }}%</strong>
                </template>
            </v-progress-linear>
          </div>
          
          <div class="webcam-stage mb-4">
            <!-- 1. El Skeleton con la cámara (fondo) -->
            <PoseSkeleton @features="onFeatures" />
            <div v-if="!isPoseDetectorReady" class="loader-overlay">
                <v-progress-circular indeterminate color="primary"></v-progress-circular>
                <p class="mt-2 text-caption">Cargando detector de pose...</p>
            </div>
            
            <!-- 2. Registro de Combate (Superpuesto en la cámara) -->
            <div class="combat-log-overlay">
              <div class="message-log" ref="messageLogRef">
                <p v-for="msg in logMensajes" :key="msg.id" :class="[msg.type, { 'fade-out': msg.leaving }]">
                  <strong>[{{ msg.time }}]</strong> {{ msg.text }}
                </p>
              </div>
            </div>
            
          </div>
          
          <v-row align="center" class="mt-4">
            <v-col cols="12">
              <!-- Lógica de creación y unión de sala -->
              <div v-if="!bossSessionId" class="d-flex justify-center">
                <v-btn
                  color="success"
                  large
                  @click="gestionarUnionIncursion"
                  :loading="buscandoPartida"
                  :disabled="buscandoPartida || !isPoseDetectorReady"
                  class="action-btn"
                >
                  <v-icon left>mdi-magnify</v-icon>
                  Buscar Incursión
                </v-btn>
              </div>

              <!-- Lógica de partida (una vez dentro de la sala) -->
              <div class="d-flex justify-center gap-2 flex-wrap" v-else>
                <v-btn
                  v-if="esCreador"
                  color="success"
                  small
                  @click="iniciarPartidaAPI"
                  :disabled="isPartidaActiva || !isPoseDetectorReady"
                  class="action-btn"
                  :block="xsOnly"
                  :class="{'flex-grow-1': smAndUp}"
                >
                  <v-icon left small>mdi-sword</v-icon>
                  <span class="text-truncate">INICIAR</span>
                </v-btn>
                <v-btn
                  color="error"
                  small
                  @click="isPartidaActiva ? detenerPartida() : salirDeLaIncursion()"
                  :disabled="!bossSessionId || buscandoPartida"
                  class="action-btn"
                  :block="xsOnly"
                  :class="{'flex-grow-1': smAndUp}"
                >
                  <v-icon left small>{{ isPartidaActiva ? 'mdi-shield-off' : 'mdi-exit-run' }}</v-icon>
                  <span class="text-truncate">{{ isPartidaActiva ? 'DETENER' : 'SALIR' }}</span>
                </v-btn> 
              </div>
            </v-col>

          </v-row>
        </v-card>
      </v-col>

      <v-col cols="12" md="6" order-md="2">
        
        <v-card class="pa-3 pa-sm-4 game-card mb-4 ruleta-card" dark>
            <div class="d-flex align-center justify-space-between">
                <h3 class="text-subtitle-1 font-weight-bold text-truncate">PRÓXIMO ATAQUE EN:</h3>
                <div class="text-h5 text-sm-h4 font-weight-black" :class="{'error--text': tiempoRestante < 15}">
                    {{ tiempoFormateado }}
                </div>
            </div>
            
            <v-divider class="my-2"></v-divider>
            
            <div class="text-center">
                <p class="mb-1 text-caption text-sm-subtitle-1">¡El Jefe exige!</p>
                <h2 class="text-h5 text-sm-h3 font-weight-black exercise-demand text-truncate">
                    {{ ejercicioSeleccionado.toUpperCase() }}
                </h2>
                <v-progress-linear
                    :value=" (tiempoRestante / DURACION_RULETA) * 100 "
                    height="8"
                    rounded
                    :color="calcularColorVida( (tiempoRestante / DURACION_RULETA) * 100 )"
                    class="mt-3"
                ></v-progress-linear>
            </div>
        </v-card>
        
        <v-card 
            class="pa-3 pa-sm-4 game-card enemy-card"
            :class="{'hit-animation': isJefeGolpeado}"
        >
          <div class="d-flex align-center justify-space-between mb-3">
            <h2 class="text-h6 text-sm-h5 font-weight-bold enemy-title text-truncate">JEFE DE GIMNASIO</h2>
            <div class="text-subtitle-2 font-weight-bold">
              HP: {{ jefeVidaActual }} / {{ jefeVidaMaxima }}
            </div>
          </div>
          
          <div class="mb-3">
            <v-progress-linear
              :value="jefeVidaPorcentaje"
              height="20"
              rounded
              :color="calcularColorVida(jefeVidaPorcentaje)"
            >
              <template v-slot:default="{ value }">
                <strong class="health-text text-caption">{{ Math.ceil(value) }}%</strong>
              </template>
            </v-progress-linear>
          </div>
          
          <div class="text-center boss-image-area">
              <v-icon size="80" class="boss-icon">mdi-robot-angry</v-icon>
              <div v-if="isJefeGolpeado" class="hit-indicator">
                <v-icon size="80" color="yellow lighten-1">mdi-flash</v-icon>
              </div>
          </div>

          <!-- Lista de Participantes -->
          <v-list dense class="participants-list mt-4">
            <v-list-subheader>PARTICIPANTES</v-list-subheader>
            <v-list-item
              v-for="p in participantes"
              :key="p.id"
              class="participant-item"
            >
              <v-list-item-title class="font-weight-bold">{{ p.nombre }}</v-list-item-title>
              <v-list-item-subtitle>Daño: {{ p.damageDealt || 0 }}</v-list-item-subtitle>
              <template v-slot:append>
                <v-icon v-if="p.id === esCreador" color="amber">mdi-star</v-icon>
              </template>
            </v-list-item>
          </v-list>
        </v-card>
      </v-col>
    </v-row>

  </v-container>
</template>

<script setup>
import { ref, computed, watch, nextTick, onBeforeUnmount, onMounted } from 'vue'
import PoseSkeleton from '../components/PoseSkeleton.vue' // Asegúrate que la ruta sea correcta
import { 
    checkSquatRep, 
    checkPushupRep, 
    checkSitupRep,
    checkLungeRep,
    checkJumpingJacksRep,
    checkMountainClimbersRep
} from '../utils/exercise-detection.js' 
import { useDisplay } from 'vuetify'

// --- CONSTANTES DE JUEGO Y SIMULACIÓN DE BOSS ---
let jefeVidaMaxima = ref(300); // Vida base, se actualizará desde el servidor
const jugadorVidaMaxima = 100;
const DURACION_RULETA = 60 // 1 minuto para pruebas
const MAX_PARTICIPANTS = 10;
const DAÑO_AL_JEFE_BASE = 8;
const DAÑO_AL_JUGADOR_POR_FALLO = 5;
const UMBRAL_POBRE_SCORE = 0.65; // Calidad mínima de la pose para no recibir daño

// --- ESTADO GENERAL Y SENSORES ---
const features = ref(null)
const isPoseDetectorReady = ref(false)
const isPartidaActiva = ref(false)
const user = ref(JSON.parse(localStorage.getItem('user')) || {});

// --- LÓGICA MULTIJUGADOR ---
const bossSessionId = ref(null);
const esCreador = ref(false);
const buscandoPartida = ref(false);
const participantes = ref([]);

// --- ESTADO DEL COMBATE ---
const jefeVidaActual = ref(jefeVidaMaxima)
const jugadorVidaActual = ref(jugadorVidaMaxima)
const repeticiones = ref(0);

// Máquinas de estado para cada ejercicio
const squatState = ref('up')
const pushupState = ref('up')
const situpState = ref('up')    
const lungeState = ref('up')
const jumpingJacksState = ref('down');
const mountainClimbersState = ref('up');

const logMensajes = ref([
    { time: '00:00', text: '¡Bienvenido! Busca una incursión para empezar.', type: '' }
])
const messageLogRef = ref(null)

// NUEVO: Estado para la animación de golpe
const isJefeGolpeado = ref(false) 

// --- ESTADO Y TIMERS DE LA RULETA ---
const ejerciciosDisponibles = ref(['Sentadillas', 'Flexiones', 'Abdominales', 'Zancadas', 'Jumping Jacks', 'Mountain Climbers']) 
const ejercicioSeleccionado = ref(ejerciciosDisponibles.value[0]) // Inicial
const timerRuleta = ref(null)
const tiempoRestante = ref(DURACION_RULETA)
let dañoJugadorTimeout = null; // Para evitar spam de daño al jugador

// --- WEBSOCKET ---
const ws = ref(null);
const isConnected = ref(false);

// Vuetify Display (para breakpoints)
const { xsOnly, smAndUp } = useDisplay();


// --- COMPUTED ---
const jefeVidaPorcentaje = computed(() => (jefeVidaActual.value / jefeVidaMaxima) * 100);
const jugadorVidaPorcentaje = computed(() => (jugadorVidaActual.value / jugadorVidaMaxima) * 100);

const tiempoFormateado = computed(() => {
    const min = Math.floor(tiempoRestante.value / 60)
    const sec = tiempoRestante.value % 60
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
})


// --- MÉTODOS DE UTILIDAD ---
function calcularColorVida(porcentaje) {
    if (porcentaje <= 20) return 'error';
    if (porcentaje <= 50) return 'warning';
    return 'success';
}

let messageIdCounter = 0;
function añadirMensaje(text, type = '') {
    const time = new Date().toLocaleTimeString('es-ES', { minute: '2-digit', second: '2-digit' });
    const id = messageIdCounter++;
    const message = { id, time, text, type, leaving: false };
    logMensajes.value.push(message);

    // Iniciar temporizador para eliminar el mensaje
    setTimeout(() => {
        const msgIndex = logMensajes.value.findIndex(m => m.id === id);
        if (msgIndex !== -1) logMensajes.value[msgIndex].leaving = true;
        setTimeout(() => logMensajes.value = logMensajes.value.filter(m => m.id !== id), 500); // Eliminar tras la animación
    }, 10000); // El mensaje dura 10 segundos

    nextTick(() => {
        if (messageLogRef.value) {
            messageLogRef.value.scrollTop = messageLogRef.value.scrollHeight
        }
    })
}


// --- LÓGICA DE DAÑO ---
function aplicarDanoJugador(dano, razon) {
    if (!isPartidaActiva.value) return;
    if (dañoJugadorTimeout) return; 

    jugadorVidaActual.value = Math.max(0, jugadorVidaActual.value - dano);
    
    añadirMensaje(` ¡FALLO! (${razon}) Pierdes ${dano} HP.`, 'error--text');

    if (jugadorVidaActual.value === 0) {
        detenerPartida();
        añadirMensaje(` ¡DERROTA! Tu HP ha llegado a 0. ¡El Jefe ha ganado!`, 'critical--text');
    }
    
    // Invulnerabilidad temporal de 3 segundos
    dañoJugadorTimeout = setTimeout(() => {
        dañoJugadorTimeout = null;
    }, 3000); 
}

// MODIFICADA para incluir la llamada a la API y la animación
function aplicarDanoJefe(dano) {
    if (!isPartidaActiva.value) return
    
    // Enviar ataque al servidor
    if (ws.value && ws.value.readyState === WebSocket.OPEN) {
        ws.value.send(JSON.stringify({ type: 'INCURSION_ATTACK', damage: dano }));
    }
    isJefeGolpeado.value = true
    setTimeout(() => {
        isJefeGolpeado.value = false
    }, 200);
}


// --- LÓGICA DE RULETA ---
function seleccionarEjercicioRandom() {
    const ejercicios = ejerciciosDisponibles.value;
    const randomIndex = Math.floor(Math.random() * ejercicios.length);
    const nuevoEjercicio = ejercicios[randomIndex];
    
    // Simple chequeo para evitar seleccionar el mismo dos veces seguidas si hay más opciones
    if (nuevoEjercicio === ejercicioSeleccionado.value && ejercicios.length > 1) {
        seleccionarEjercicioRandom();
        return;
    }
    
    ejercicioSeleccionado.value = nuevoEjercicio;
    repeticiones.value = 0; // Reiniciar contador de repeticiones
    añadirMensaje(` ¡ATENCIÓN! El Jefe exige el ataque: ${nuevoEjercicio}`, 'warning--text');
}

function iniciarRuleta() {
    if (timerRuleta.value) clearInterval(timerRuleta.value);
    
    timerRuleta.value = setInterval(() => {
        if (!isPartidaActiva.value) {
            clearInterval(timerRuleta.value);
            timerRuleta.value = null;
            return;
        }

        if (tiempoRestante.value > 0) {
            tiempoRestante.value--;
        } else {
            seleccionarEjercicioRandom();
            tiempoRestante.value = DURACION_RULETA; 
        }
    }, 1000);
}

function detenerRuleta() {
    if (timerRuleta.value) {
        clearInterval(timerRuleta.value);
        timerRuleta.value = null;
    }
    tiempoRestante.value = DURACION_RULETA; 
}


// --- GESTIÓN DE LA DETECCIÓN (UNIFICADA) ---

function onFeatures(payload) {
    if (payload && !isPoseDetectorReady.value) {
        isPoseDetectorReady.value = true
        añadirMensaje('Detector de pose cargado. ¡Listo para empezar!', 'info--text')
    }

    features.value = payload ? structuredClone(payload) : null
    if (!isPartidaActiva.value || !features.value) return

    // 1. CHEQUEO DE CALIDAD DE POSE (Daño al jugador si es pobre)
    if (features.value?.score < UMBRAL_POBRE_SCORE) {
        aplicarDanoJugador(DAÑO_AL_JUGADOR_POR_FALLO, "Mala Pose / Pérdida de Puntos Clave");
        return 
    }

    // 2. CHEQUEO DE REPETICIÓN (Daño al jefe si es buena)
    if (features.value?.angles) {
        const exerciseHandlers = {
            'Sentadillas': { detect: checkSquatRep, state: squatState },
            'Flexiones': { detect: checkPushupRep, state: pushupState },
            'Abdominales': { detect: checkSitupRep, state: situpState },
            'Zancadas': { detect: checkLungeRep, state: lungeState },
            'Jumping Jacks': { detect: checkJumpingJacksRep, state: jumpingJacksState },
            'Mountain Climbers': { detect: checkMountainClimbersRep, state: mountainClimbersState }
        };

        const handler = exerciseHandlers[ejercicioSeleccionado.value];

        if (handler) {
            // Jumping Jacks necesita el objeto 'features' completo, los demás solo los ángulos.
            const detectionInput = ejercicioSeleccionado.value === 'Jumping Jacks' ? features.value : features.value.angles;
            const result = handler.detect(detectionInput, handler.state.value);
            
            // Actualizamos el estado del ejercicio
            handler.state.value = result.newState;

            if (result.repCompleted) {
                repeticiones.value++;

                const damageModifiers = {
                    'Flexiones': 10,
                    'Abdominales': 7,
                    'Zancadas': 9,
                    'Jumping Jacks': 6,
                    'Mountain Climbers': 8
                };

                const baseDano = damageModifiers[ejercicioSeleccionado.value] || DAÑO_AL_JEFE_BASE;
                const dano = Math.floor(Math.random() * 5) + baseDano;
                aplicarDanoJefe(dano, ejercicioSeleccionado.value);
            }
        }
    }
}

// --- LÓGICA DE WEBSOCKET ---
function conectarWebSocket() {
  if (ws.value) {
    ws.value.close();
  }
  ws.value = new WebSocket('ws://localhost:8082');

 ws.value.onopen = () => {
    isConnected.value = true;
    const userData = JSON.parse(localStorage.getItem('user')) || {};
    ws.value.send(JSON.stringify({
      type: 'INCURSION_JOIN',
      // Enviamos el sessionId como NULL o lo que sea para forzar al servidor a buscar/crear
      sessionId: bossSessionId.value, // Esto será null/undefined la primera vez, lo cual es manejado en el servidor
      userId: user.value?.id,
      nombre: userData.usuari || 'Invitado'
    }));
  };

  ws.value.onmessage = (event) => {
    const data = JSON.parse(event.data);
    switch (data.type) {
      case 'INCURSION_STATE':
        bossSessionId.value = data.sessionId; // Guardamos el ID de la sesión
        participantes.value = data.participantes;
        esCreador.value = String(data.creadorId) === String(user.value.id);
        jefeVidaMax.value = data.jefeVidaMax;
        jefeVidaActual.value = data.jefeVidaActual;
        if (data.message) {
          añadirMensaje(data.message, 'info--text');
        } 
        break;
      case 'INCURSION_STARTED':
        jefeVidaActual.value = data.jefeVidaActual;
        iniciarPartida();
        break;
      case 'JOIN_ERROR':
        añadirMensaje(`Error al unirse: ${data.message}`, 'error--text');
        salirDeLaIncursion(); // Volver al estado inicial
        break;
      case 'BOSS_HEALTH_UPDATE':
        jefeVidaActual.value = data.jefeVidaActual;
        añadirMensaje(`¡${data.attackerName} ha atacado! Vida del jefe: ${data.jefeVidaActual}`, 'success--text'); 
        if (jefeVidaActual.value <= 0) {
            detenerPartida();
            añadirMensaje(`🥳 ¡FELICIDADES! ¡Habéis derrotado al Jefe!`, 'critical--text');
        }
        break;
      case 'LEADER_LEFT':
        añadirMensaje('El líder ha abandonado la incursión. La sesión ha terminado.', 'error--text');
        detenerPartida();
        salirDeLaIncursion();
        break;
    }
  };

  ws.value.onclose = () => {
    isConnected.value = false;
    if (bossSessionId.value) { // Solo si estábamos en una sesión activa
      añadirMensaje('Desconectado del servidor de incursión.', 'warning--text');
    }
  };

  ws.value.onerror = () => {
    añadirMensaje('Error de conexión con el servidor de incursión.', 'error--text');
  };
}

async function gestionarUnionIncursion() {
  if (!user.value?.id) {
    añadirMensaje('Debes iniciar sesión para buscar una incursión.', 'error--text');
    return;
  }

  buscandoPartida.value = true;
  añadirMensaje('Buscando o creando incursión...', 'info--text'); 

  // 1. Conectar WebSocket
  conectarWebSocket();

  setTimeout(() => { buscandoPartida.value = false; }, 4000); // Timeout de seguridad
}

function salirDeLaIncursion() {
  bossSessionId.value = null;
  esCreador.value = false; 
  isPartidaActiva.value = false;
  participantes.value = [];
  logMensajes.value = [{ time: '00:00', text: '¡Bienvenido! Busca una incursión para empezar.', type: '' }];
  detenerRuleta();
  if (ws.value) {
    ws.value.close();
    ws.value = null;
  }
}

// --- LÓGICA DE INICIO/FIN DE PARTIDA ---
function iniciarPartidaAPI() {
  if (!esCreador.value || !bossSessionId.value) return;
  // Enviar mensaje al servidor para que inicie la partida para todos
  if (ws.value && ws.value.readyState === WebSocket.OPEN) {
    ws.value.send(JSON.stringify({ type: 'INCURSION_START' }));
  }
}

function iniciarPartida() {
  if (isPartidaActiva.value || !isPoseDetectorReady.value || !bossSessionId.value) return;
  
  jugadorVidaActual.value = jugadorVidaMaxima;
  repeticiones.value = 0;
  squatState.value = 'up';
  pushupState.value = 'up';
  situpState.value = 'up';
  lungeState.value = 'up';
  jumpingJacksState.value = 'down'; // Estado inicial correcto para Jumping Jacks
  mountainClimbersState.value = 'up';
  
  seleccionarEjercicioRandom();
  tiempoRestante.value = DURACION_RULETA;
  
  isPartidaActiva.value = true;
  añadirMensaje(`¡Comienza el combate! El primer ataque es: ${ejercicioSeleccionado.value}.`, 'critical--text');
  
  iniciarRuleta();
}

function detenerPartida() {
  if (!isPartidaActiva.value) return;
  isPartidaActiva.value = false;
  detenerRuleta();
  if (dañoJugadorTimeout) clearTimeout(dañoJugadorTimeout);
  añadirMensaje('Combate detenido.', 'warning--text');
}

// --- LLAMADA INICIAL AL MONTAR ---
async function cargarEstadoJefe() {
  // Esta función ya no es necesaria, el estado del jefe viene por WebSocket
}

onMounted(() => {
    // Ya no cargamos el jefe al montar, sino al unirnos a una sesión.
})

onBeforeUnmount(() => {
    detenerPartida();
    if (ws.value) {
      ws.value.close();
      ws.value = null;
    }
})
</script>

<style scoped>
/* Estilos del Esqueleto de la Batalla (Adaptados de tu código anterior) */
.incursion-background {
  background: linear-gradient(135deg, #1d2630 0%, #313c4a 100%);
  min-height: 100vh;
  color: #f5f5f5;
}
.join-section {
  background-color: rgba(0,0,0,0.2);
  padding: 1.5rem;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.1);
  margin-bottom: 1rem;
}

.battle-title {
    color: #FFD700; /* Oro */
    text-shadow: 3px 3px 6px rgba(0,0,0,0.7);
    letter-spacing: 1.5px;
}

.game-card {
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.5); 
  background-color: rgba(40, 50, 60, 0.8) !important; 
  color: white;
  position: relative; 
  backdrop-filter: blur(5px);
}

.enemy-card {
  border-color: rgba(255, 82, 82, 0.5);
}

.enemy-title {
  color: #FF5252; /* Rojo brillante */
}

.player-card {
  border-color: rgba(66, 165, 245, 0.5);
}

.player-title {
  color: #42A5F5; /* Azul brillante */
}

.health-text {
  color: white;
  text-shadow: 1px 1px 2px black;
}

.ruleta-card {
  border-color: rgba(255, 171, 0, 0.5);
  color: white;
}

.exercise-demand {
  color: #FFAB00; /* Naranja ámbar */
  text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
}

.reps-display {
  font-size: 1.5rem;
  font-weight: 900;
  color: #fff;
  text-shadow: 1px 1px 3px rgba(0,0,0,0.5);
  letter-spacing: 1px;
}

/* --- ESTILOS DE LA CÁMARA/CHAT --- */
.webcam-stage {
    position: relative;
    width: 100%;
    aspect-ratio: 4 / 3;
    background: #000;
    border-radius: 8px;
    overflow: hidden;
}

.webcam-stage .loader-overlay {
    position: absolute;
    inset: 0;
    background-color: rgba(0, 0, 0, 0.8);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: white;
    z-index: 10;
}

/* El nuevo contenedor de la superposición de chat */
.combat-log-overlay {
    position: absolute;
    top: 10px; /* Separación de la parte superior */
    left: 10px; /* Separación de la izquierda */
    width: 95%; /* Ocupa casi todo el ancho */
    height: 100%;
    pointer-events: none; /* Permite clicks a través de él si fuera necesario */
    z-index: 5; /* Asegura que esté sobre la webcam */
}

.message-log {
    /* Altura solo para la zona del chat (parte superior izquierda) */
    max-height: 40%; 
    width: 70%;
    overflow-y: hidden; /* Ocultamos el scrollbar, solo mostramos las últimas líneas */
    display: flex;
    flex-direction: column-reverse; /* Muestra el mensaje más nuevo abajo, pero la caja está arriba */
    background-color: transparent;
    padding-right: 8px;
    color: #eee;
    word-break: break-word;
    /* Efecto de desvanecimiento en la parte superior */
    mask-image: linear-gradient(to bottom, transparent 0%, black 50%, black 100%);
}

.message-log p {
    margin-bottom: 2px;
    line-height: 1.3;
    font-size: 0.8rem;
    padding: 2px 5px;
    background-color: rgba(0, 0, 0, 0.4); /* Fondo semi-transparente para cada mensaje */
    border-radius: 4px;
    width: fit-content;
    max-width: 100%;
    pointer-events: auto; /* Restaura la capacidad de desplazamiento (si lo hubiéramos activado) */
    animation: fadeIn 0.5s ease-out; /* Animación simple al aparecer */
}
.message-log p.fade-out {
    animation: fadeOut 0.5s ease-out forwards;
}

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}

@keyframes fadeOut {
    from { opacity: 1; transform: translateY(0); }
    to { opacity: 0; transform: translateY(-10px); }
}
/* Colores de los mensajes */
.success--text { color: #69F0AE !important; }
.warning--text { color: #FFD600 !important; }
.critical--text { color: #FF1744 !important; font-weight: bold; }
.info--text { color: #40C4FF !important; }

/* --- ADAPTACIONES PARA MÓVIL --- */
@media (max-width: 600px) {
  .battle-title {
    font-size: 1.5rem !important; 
  }
  
  .exercise-demand {
    font-size: 1.8rem !important;
  }

  /* Ajuste de chat en móvil */
  .combat-log-overlay {
    top: 5px; 
    left: 5px;
  }
  
  .message-log {
    max-height: 50%; /* Más alto en móvil */
    width: 90%;
  }

  .message-log p {
    font-size: 0.75rem;
  }
}

/* --- ESTILOS DE ANIMACIÓN DE GOLPE --- */
@keyframes shake {
  0% { transform: translate(1px, 1px) rotate(0deg); }
  25% { transform: translate(-1px, -2px) rotate(-1deg); }
  50% { transform: translate(-3px, 0px) rotate(1deg); }
  75% { transform: translate(1px, 2px) rotate(-1deg); }
  100% { transform: translate(1px, -1px) rotate(0deg); }
}

.hit-animation {
  animation: shake 0.2s ease-in-out;
}

.boss-image-area {
    min-height: 150px; 
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
}

.boss-icon {
  color: #BDBDBd;
  text-shadow: 0 0 15px rgba(0,0,0,0.8);
}

.hit-indicator {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 5;
    filter: brightness(1.5);
    opacity: 1;
}

/* Lista de Participantes */
.participants-list {
  background-color: rgba(0, 0, 0, 0.2) !important;
  border-radius: 8px;
}

.participant-item {
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.participant-item:last-child {
  border-bottom: none;
}
</style>