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
          <!-- AÑADIR ESTE BLOQUE PARA MOSTRAR EL CÓDIGO -->
          <v-chip color="secondary" small class="text-caption text-sm-body-2 ml-2" @click="copiarCodigo">
            <v-icon left small>mdi-pound</v-icon>
            Código: {{ bossSessionId }}
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
                  Crear Incursión
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
              <v-list-item-title class="font-weight-bold">{{ p.nombre }} {{ String(p.id) === String(user.id) ? '(Tú)' : '' }}</v-list-item-title>
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
import { useRoute } from 'vue-router'
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
const jefeVidaMaxima = ref(300); // Vida base, se actualizará desde el servidor
const jefeVidaMaximaInicial = ref(300); // Vida máxima para la UI, no disminuye
const jugadorVidaMaxima = 100;
const DURACION_RULETA = 60 // 1 minuto para pruebas
const MAX_PARTICIPANTS = 10;
const DAÑO_AL_JEFE_BASE = 5;
const DAÑO_AL_JUGADOR_POR_FALLO = 5;
const UMBRAL_POBRE_SCORE = 0.25; // Calidad mínima de la pose para no recibir daño

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
const jefeVidaActual = ref(jefeVidaMaxima.value)
const jugadorVidaActual = ref(jugadorVidaMaxima);
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

// --- WEBSOCKET ---
const ws = ref(null);
const isConnected = ref(false);

// Vuetify Display (para breakpoints)
const { xsOnly, smAndUp } = useDisplay();

// --- ESTADO Y TIMERS DE LA RULETA (Controlado por el servidor) ---
const ejercicioSeleccionado = ref('Esperando...'); // El ejercicio que te toca, se inicializa a un valor neutral.
const tiempoRestante = ref(DURACION_RULETA); // El tiempo restante para la ronda actual.
let dañoJugadorTimeout = null; // Para evitar spam de daño al jugador


// Vue Router (para leer parámetros de la URL)
const route = useRoute();

// --- COMPUTED ---
const jefeVidaPorcentaje = computed(() => (jefeVidaActual.value / jefeVidaMaxima.value) * 100);
const jugadorVidaPorcentaje = computed(() => (jugadorVidaActual.value / jugadorVidaMaxima) * 100);

const tiempoFormateado = computed(() => {
    const min = Math.floor(tiempoRestante.value / 60)
    const sec = tiempoRestante.value % 60
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
})

// --- NUEVA FUNCIÓN PARA COPIAR CÓDIGO ---
async function copiarCodigo() {
  if (!bossSessionId.value) return;
  try {
    await navigator.clipboard.writeText(bossSessionId.value);
    añadirMensaje('¡Código de la sala copiado!', 'info--text');
  } catch (err) {
    añadirMensaje('No se pudo copiar el código.', 'error--text');
  }
}


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

    // Limitar el número de mensajes en el log para evitar sobrecargar el DOM
    if (logMensajes.value.length > 25) {
        logMensajes.value.shift(); // Elimina el mensaje más antiguo
    }

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

                if (jugadorVidaActual.value < jugadorVidaMaxima) {
                    jugadorVidaActual.value = Math.min(jugadorVidaMaxima, jugadorVidaActual.value + 5);
                    añadirMensaje(`¡BIEN HECHO! Recuperas 5 HP.`, 'success--text');
                }

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
  // Asegúrate de que la URL del WebSocket sea la correcta para tu entorno
  ws.value = new WebSocket('ws://localhost:8082'); 

 ws.value.onopen = () => {
    isConnected.value = true;
    const userData = JSON.parse(localStorage.getItem('user')) || {};
    ws.value.send(JSON.stringify({
      type: 'INCURSION_JOIN',
      sessionId: bossSessionId.value, // Ahora siempre tendremos un ID de sesión válido aquí.
      userId: userData.id,
      nombre: userData.usuari || 'Invitado'
    }));
  };

  ws.value.onmessage = (event) => {
    const data = JSON.parse(event.data);
    switch (data.type) {
      case 'INCURSION_STATE':
        bossSessionId.value = data.sessionId; // Guardamos el ID de la sesión
        participantes.value = data.participantes;
        esCreador.value = String(data.creadorId) === String(user.value?.id);
        jefeVidaMaxima.value = Math.max(jefeVidaMaxima.value, data.jefeVidaMax);
        jefeVidaActual.value = data.jefeVidaActual;
        if (data.message) {
          añadirMensaje(data.message, 'info--text');
        } 
        break;
      case 'INCURSION_STARTED':
        iniciarPartida();
        break;
      case 'JOIN_ERROR':
        añadirMensaje(`Error al unirse: ${data.message}`, 'error--text');
        buscandoPartida.value = false;
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
      case 'TIMER_UPDATE':
        tiempoRestante.value = data.tiempo;
        break;
      case 'NEW_EXERCISE':
        // Si el ejercicio es para mí, lo actualizo
        if (String(data.userId) === String(user.value?.id)) {
            ejercicioSeleccionado.value = data.exercise;
            repeticiones.value = 0; // Reiniciar contador
            añadirMensaje(`¡NUEVO DESAFÍO! Ahora te toca: ${data.exercise}`, 'warning--text');
        }
        break;
    }
  };

  ws.value.onclose = () => {
    isConnected.value = false;
    // Si la partida estaba activa y nos desconectamos, la detenemos localmente.
    if (isPartidaActiva.value) detenerPartida();
    if (bossSessionId.value) { // Solo si estábamos en una sesión activa
      añadirMensaje('Desconectado del servidor de incursión.', 'warning--text');
    }
  };

  ws.value.onerror = () => {
    añadirMensaje('Error de conexión con el servidor de incursión.', 'error--text');
  };
}

import axios from 'axios'; // Importamos la instancia global de axios
const api = axios; // Usamos la instancia global

async function gestionarUnionIncursion() {
  if (!user.value?.id) {
    añadirMensaje('Debes iniciar sesión para buscar una incursión.', 'error--text');
    return;
  }
  buscandoPartida.value = true;

  // Si ya tenemos un ID de sala (por URL), nos unimos directamente.
  if (bossSessionId.value) {
    añadirMensaje(`Intentando unirse a la incursión ${bossSessionId.value}...`, 'info--text');
    conectarWebSocket();
  } else {
    // Si no, creamos una nueva.
    añadirMensaje('Creando nueva incursión...', 'info--text');
    try {
      const response = await api.post('/api/incursiones/crear', { creadorId: user.value.id });
      bossSessionId.value = response.data.sessionId;
      conectarWebSocket(); // Ahora nos conectamos con el ID de la sala recién creada.
    } catch (error) {
      añadirMensaje('Error al crear la incursión. Inténtalo de nuevo.', 'error--text');
      console.error('Error creando incursión:', error);
    }
  }
  buscandoPartida.value = false;
}

function salirDeLaIncursion() {
  bossSessionId.value = null;
  esCreador.value = false; 
  isPartidaActiva.value = false;
  participantes.value = [];
  logMensajes.value = [{ id: 0, time: '00:00', text: '¡Bienvenido! Busca una incursión para empezar.', type: '' }];
  
  // Reiniciar la vida del jefe a los valores iniciales para evitar datos corruptos entre sesiones
  jefeVidaMaxima.value = jefeVidaMaximaInicial.value;
  jefeVidaActual.value = jefeVidaMaximaInicial.value;

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
    
  tiempoRestante.value = DURACION_RULETA;
  
  isPartidaActiva.value = true;
  añadirMensaje(`¡Comienza el combate! Esperando asignación de ejercicio...`, 'critical--text');
}

function detenerPartida() {
  if (!isPartidaActiva.value) return;
  isPartidaActiva.value = false;
  if (dañoJugadorTimeout) clearTimeout(dañoJugadorTimeout);
  añadirMensaje('Combate detenido.', 'warning--text');
}

onMounted(() => {
    // Si la URL contiene un parámetro 'sala', significa que queremos unirnos a una incursión específica.
    const salaDesdeUrl = route.query.sala;
    if (salaDesdeUrl) {
        bossSessionId.value = salaDesdeUrl; // Establecemos el ID de la sesión
        gestionarUnionIncursion(); // Intentamos unirnos automáticamente
    } else {
        // Si no hay parámetro, el usuario deberá pulsar "Buscar Incursión"
    }
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

/* ... (Otros estilos generales sin cambios) ... */

.battle-title {
    color: #FFD700;
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

.webcam-stage {
    position: relative; /* Contenedor para el overlay */
}

/* --- ESTILOS DE CHAT (LÓGICA 'message-log' CORREGIDA) --- */

.combat-log-overlay {
    position: absolute;
    top: 10px;
    left: 10px;
    width: 95%;
    height: 100%;
    pointer-events: none;
    z-index: 5;
}

.message-log {
    max-height: 40%; 
    width: 70%;
    overflow-y: hidden;
    display: flex;
    flex-direction: column-reverse;
    background-color: transparent;
    padding-right: 8px;
    color: #eee;
    word-break: break-word;
    mask-image: linear-gradient(to bottom, transparent 0%, black 50%, black 100%);
}

.message-log p {
    margin-bottom: 2px;
    line-height: 1.3;
    font-size: 0.8rem;
    padding: 2px 5px;
    background-color: rgba(0, 0, 0, 0.4);
    border-radius: 4px;
    width: fit-content;
    max-width: 100%;
    pointer-events: auto;
    animation: fadeIn 0.5s ease-out;
}
.message-log p.fade-out {
    animation: fadeOut 0.5s ease-out forwards;
}

/* Colores de los mensajes - Aseguramos la prioridad */
.success--text { color: #69F0AE !important; }
.warning--text { color: #FFD600 !important; }
.critical--text { color: #FF1744 !important; font-weight: bold; }
.info--text { color: #40C4FF !important; }


/* --- ESTILOS DE PARTICIPANTES (USO DE ::v-deep PARA VUETIFY) --- */

.participants-list {
    background-color: rgba(0, 0, 0, 0.2) !important;
    border-radius: 8px;
}

.participant-item {
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

/* Usamos ::v-deep para modificar elementos inyectados por v-list */
.participant-item ::v-deep .v-list-item__content {
    padding: 8px 0 !important; /* Ajuste de padding si es necesario */
}

.participant-item ::v-deep .v-list-item-title {
    font-weight: bold;
    color: #fff; /* Asegurar color */
}

/* Si quieres que el último elemento no tenga borde (v-list lo hace por defecto, pero por si acaso) */
.participant-item:last-child {
    border-bottom: none;
}

/* --- ADAPTACIONES PARA MÓVIL (Mantenidas) --- */
@media (max-width: 600px) {
    .battle-title { font-size: 1.5rem !important; }
    .exercise-demand { font-size: 1.8rem !important; }
    .combat-log-overlay { top: 5px; left: 5px; }
    .message-log { max-height: 50%; width: 90%; }
    .message-log p { font-size: 0.75rem; }
}

/* --- ANIMACIONES (Mantenidas) --- */
@keyframes shake {
    0% { transform: translate(1px, 1px) rotate(0deg); }
    25% { transform: translate(-1px, -2px) rotate(-1deg); }
    50% { transform: translate(-3px, 0px) rotate(1deg); }
    75% { transform: translate(1px, 2px) rotate(-1deg); }
    100% { transform: translate(1px, -1px) rotate(0deg); }
}

.hit-animation { animation: shake 0.2s ease-in-out; }

</style>