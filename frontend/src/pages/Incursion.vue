<template>
  <v-container fluid class="pa-4 incursion-background">
    
    <v-row class="mb-4 align-center">
      <v-col cols="12">
        <h1 class="text-h3 font-weight-black text-center battle-title">
            INCURSIÓN CONTRA EL JEFE
        </h1>
        <!-- CONTADOR DE JUGADORES -->
        <div v-if="bossSessionId" class="text-center mt-2">
          <v-chip color="primary" large>
            <v-icon left>mdi-account-group</v-icon>
            Jugadores: {{ participantes.length }} / {{ MAX_PARTICIPANTS }}
          </v-chip>
        </div>
      </v-col>
    </v-row>
    
    <v-row>
      
      <v-col cols="12" md="6" order-md="1">
        <v-card class="pa-4 game-card player-card fill-height">
          <h2 class="text-h5 font-weight-bold mb-4 text-center player-title">TU ENTRENADOR</h2>

          <div class="mb-4">
            <div class="d-flex align-center justify-space-between mb-1">
                <div class="text-caption font-weight-bold">TU HP</div>
                <div class="text-caption font-weight-bold">
                    {{ jugadorVidaActual }} / {{ jugadorVidaMaxima }}
                </div>
            </div>
            <v-progress-linear
                :value="jugadorVidaPorcentaje"
                height="20"
                rounded
                :color="calcularColorVida(jugadorVidaPorcentaje)" >
                 <template v-slot:default="{ value }">
                  <strong class="health-text">{{ Math.ceil(value) }}%</strong>
                </template>
            </v-progress-linear>
          </div>
          
          <div class="webcam-stage mb-4">
            <PoseSkeleton @features="onFeatures" />
            <div v-if="!isPoseDetectorReady" class="loader-overlay">
                <v-progress-circular indeterminate color="primary"></v-progress-circular>
                <p class="mt-2">Cargando detector de pose...</p>
            </div>
          </div>
          
          <v-row align="center" class="mt-4">
            <v-col cols="6">
              <div class="d-flex justify-center gap-2" v-if="!bossSessionId">
                <v-btn
                    color="success"
                    large
                    @click="mostrarDialogoUnirse = true"
                    :disabled="!isPoseDetectorReady"
                    class="action-btn"
                >
                    <v-icon left>mdi-magnify</v-icon>
                    BUSCAR INCURSIÓN
                </v-btn>
              </div>
              <div class="d-flex justify-center gap-2" v-else>
                <v-btn
                  v-if="esCreador"
                  color="success"
                  large
                  @click="iniciarPartida"
                  :disabled="isPartidaActiva || !isPoseDetectorReady"
                  class="action-btn"
                >
                  <v-icon left>mdi-sword</v-icon>
                  INICIAR
                </v-btn>
                <v-btn
                  color="error"
                  large
                  @click="isPartidaActiva ? detenerPartida() : salirDeLaIncursion()"
                  :disabled="!bossSessionId"
                  class="action-btn"
                >
                  <v-icon left>{{ isPartidaActiva ? 'mdi-shield-off' : 'mdi-exit-run' }}</v-icon>
                  {{ isPartidaActiva ? 'DETENER' : 'SALIR' }}
                </v-btn>
              </div>
            </v-col>
            <v-col cols="6" class="text-center">
              <div class="reps-display">REPETICIONES: <span>{{ repeticiones }}</span></div>
            </v-col>
          </v-row>
        </v-card>
      </v-col>

      <v-col cols="12" md="6" order-md="2">
        
        <v-card class="pa-4 game-card mb-4 ruleta-card" dark>
            <div class="d-flex align-center justify-space-between">
                <h3 class="text-h6 font-weight-bold">PRÓXIMO ATAQUE EN:</h3>
                <div class="text-h4 font-weight-black" :class="{'error--text': tiempoRestante < 15}">
                    {{ tiempoFormateado }}
                </div>
            </div>
            
            <v-divider class="my-2"></v-divider>
            
            <div class="text-center">
                <p class="mb-1 text-subtitle-1">¡El Jefe exige!</p>
                <h2 class="text-h3 font-weight-black exercise-demand">
                    {{ ejercicioSeleccionado.toUpperCase() }}
                </h2>
                <v-progress-linear
                    :value=" (tiempoRestante / DURACION_RULETA) * 100 "
                    height="10"
                    rounded
                    :color="calcularColorVida( (tiempoRestante / DURACION_RULETA) * 100 )"
                    class="mt-3"
                ></v-progress-linear>
            </div>
        </v-card>
        
        <v-card 
            class="pa-4 game-card enemy-card mb-4"
            :class="{'hit-animation': isJefeGolpeado}"
        >
          <div class="d-flex align-center justify-space-between mb-3">
            <h2 class="text-h5 font-weight-bold enemy-title">JEFE DE GIMNASIO</h2>
            <div class="text-subtitle-1 font-weight-bold">
              HP: {{ jefeVidaActual }} / {{ jefeVidaMaxima }}
            </div>
          </div>
          
          <div class="mb-3">
            <v-progress-linear
              :value="jefeVidaPorcentaje"
              height="25"
              rounded
              :color="calcularColorVida(jefeVidaPorcentaje)"
            >
              <template v-slot:default="{ value }">
                <strong class="health-text">{{ Math.ceil(value) }}%</strong>
              </template>
            </v-progress-linear>
          </div>
          
          <div class="text-center boss-image-area">
             <v-icon size="120" class="boss-icon">mdi-robot-angry</v-icon>
             <div v-if="isJefeGolpeado" class="hit-indicator">
               <v-icon size="100" color="yellow lighten-1">mdi-flash</v-icon>
             </div>
          </div>
        </v-card>
        
        <v-card class="pa-4 game-card message-console">
          <h3 class="text-h6 mb-2 console-title">REGISTRO DE COMBATE</h3>
          <div class="message-log" ref="messageLogRef">
            <p v-for="(msg, index) in logMensajes" :key="index" :class="msg.type">
                <strong>[{{ msg.time }}]</strong> {{ msg.text }}
            </p>
          </div>
        </v-card>
        
      </v-col>
    </v-row>

    <!-- DIÁLOGO DE CONFIRMACIÓN -->
    <v-dialog v-model="mostrarDialogoUnirse" persistent max-width="400">
      <v-card class="game-card">
        <v-card-title class="text-h5 player-title">¿Unirte a la Incursión?</v-card-title>
        <v-card-text>
          Se buscará una sala de incursión abierta. Si no hay ninguna disponible, se creará una nueva para ti y otros jugadores.
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="grey" text @click="mostrarDialogoUnirse = false">
            Cancelar
          </v-btn>
          <v-btn
            color="success"
            text
            @click="unirseAIncursion"
            :loading="buscandoPartida"
          >
            Confirmar
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

  </v-container>
</template>

<script setup>
import { ref, computed, watch, nextTick, onBeforeUnmount, onMounted } from 'vue'
import PoseSkeleton from '../components/PoseSkeleton.vue' // Asegúrate que la ruta sea correcta
import { 
    checkSquatRep, 
    checkPushupRep, 
    checkSitupRep,    
    checkLungeRep
} from '../utils/exercise-detection.js' 

// --- CONSTANTES DE JUEGO Y SIMULACIÓN DE BOSS ---
const jefeVidaMaxima = 100 // Usada como referencia visual, la real viene del servidor
const jugadorVidaMaxima = 100 
const DURACION_RULETA = 180 // 3 minutos
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
const mostrarDialogoUnirse = ref(false);
const buscandoPartida = ref(false);
const participantes = ref([]);

// --- ESTADO DEL COMBATE ---
const jefeVidaActual = ref(jefeVidaMaxima)
const jugadorVidaActual = ref(jugadorVidaMaxima)
const repeticiones = ref(0)

// Máquinas de estado para cada ejercicio
const squatState = ref('up')
const pushupState = ref('up')
const situpState = ref('up')   
const lungeState = ref('up')   

const logMensajes = ref([
    { time: '00:00', text: '¡Bienvenido! Inicia la batalla para que el Jefe elija tu ejercicio.', type: '' }
])
const messageLogRef = ref(null)

// NUEVO: Estado para la animación de golpe
const isJefeGolpeado = ref(false) 

// --- ESTADO Y TIMERS DE LA RULETA ---
const ejerciciosDisponibles = ref(['Sentadillas', 'Flexiones', 'Abdominales', 'Zancadas']) 
const ejercicioSeleccionado = ref(ejerciciosDisponibles.value[0]) // Inicial
const timerRuleta = ref(null)
const tiempoRestante = ref(DURACION_RULETA)
let dañoJugadorTimeout = null; // Para evitar spam de daño al jugador


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

function añadirMensaje(text, type = '') {
    const time = new Date().toLocaleTimeString('es-ES', { minute: '2-digit', second: '2-digit' })
    logMensajes.value.push({ time, text, type })
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
async function aplicarDanoJefe(dano, ataque) {
    if (!isPartidaActiva.value) return
    
    // 1. Llamada a la API para aplicar daño y obtener la nueva vida (requiere que el endpoint POST /api/boss/attack esté activo)
    // try {
    //     const response = await fetch('/api/boss/attack', {
    //         method: 'POST',
    //         headers: { 'Content-Type': 'application/json' },
    //         body: JSON.stringify({ bossId: bossSessionId.value, danoAplicado: dano }),
    //     });
    //     const data = await response.json();

    //     if (!response.ok || !data.success) {
    //         console.error("Error al atacar al boss:", data.error || response.statusText);
    //         añadirMensaje(`ERROR: Falló la comunicación con el Jefe.`, 'error--text');
    //         return;
    //     }

    //     // 2. Actualizar vida local con el valor devuelto por el servidor
    //     jefeVidaActual.value = data.nuevaVida;

    // } catch (error) {
    //     console.error("Error de red al atacar al boss:", error);
    //     añadirMensaje(`ERROR DE RED: No se pudo contactar con el Jefe.`, 'error--text');
    //     return;
    // }
    
    // 3. Animación de golpe
    isJefeGolpeado.value = true
    setTimeout(() => {
        isJefeGolpeado.value = false
    }, 200) 
    
    // 4. Mensajes y chequeo de fin de partida
    const isCritico = dano > DAÑO_AL_JEFE_BASE
    const tipoDano = isCritico ? 'critical--text' : 'success--text'
    const textoDano = isCritico ? '💥 ¡GOLPE CRÍTICO!' : ' 💪 ¡ATAQUE EXITOSO!'
    
    añadirMensaje(`(${ataque}) ${textoDano} Jefe pierde ${dano} HP.`, tipoDano)
    
    if (jefeVidaActual.value === 0) {
        detenerPartida()
        añadirMensaje(`🥳 ¡FELICIDADES! ¡Has derrotado al Jefe!`, 'info--text')
    } else {
        añadirMensaje(`Jefe tiene ${jefeVidaActual.value}/${jefeVidaMaxima} de vida restante.`)
    }
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
        const angles = features.value.angles
        let newRep = false
        let result = { newState: 'up', repCompleted: false }

        // Mapeo de ejercicio a función de detección y estado
        switch(ejercicioSeleccionado.value) {
            case 'Sentadillas':
                result = checkSquatRep(angles, squatState.value);
                squatState.value = result.newState;
                break;
            case 'Flexiones':
                result = checkPushupRep(angles, pushupState.value);
                pushupState.value = result.newState;
                break;
            case 'Abdominales':
                result = checkSitupRep(angles, situpState.value);
                situpState.value = result.newState;
                break;
            case 'Zancadas':
                result = checkLungeRep(angles, lungeState.value);
                lungeState.value = result.newState;
                break;
        }
        
        newRep = result.repCompleted
        
        if (newRep) {
            repeticiones.value++
            
            // Daño base con ajuste por ejercicio
            let baseDano = DAÑO_AL_JEFE_BASE;
            if (ejercicioSeleccionado.value === 'Flexiones') baseDano = 10;
            if (ejercicioSeleccionado.value === 'Abdominales') baseDano = 7;
            if (ejercicioSeleccionado.value === 'Zancadas') baseDano = 9;
            
            const dano = Math.floor(Math.random() * 5) + baseDano; 
            aplicarDanoJefe(dano, ejercicioSeleccionado.value)
        }
    }
}


// --- LÓGICA DE UNIÓN Y PARTIDA ---
async function unirseAIncursion() {
  buscandoPartida.value = true;
  mostrarDialogoUnirse.value = false;
  añadirMensaje('Buscando una incursión abierta...', 'info--text');

  // Simulación de llamada a un backend que busca o crea una sala
  // En un caso real, aquí harías:
  // const response = await axios.post('/api/boss/join', { userId: user.value.id });
  // const { sessionId, isCreator, participants } = response.data;
  
  // --- SIMULACIÓN ---
  await new Promise(resolve => setTimeout(resolve, 1500)); // Simula espera de red
  const sessionId = 1; // ID de sesión simulado
  const isCreator = true; // Simula que este usuario es el creador
  const initialParticipants = [user.value]; // Añadir al usuario actual a la lista
  // --- FIN SIMULACIÓN ---

  bossSessionId.value = sessionId;
  esCreador.value = isCreator;
  buscandoPartida.value = false;
  participantes.value = initialParticipants;

  if (isCreator) {
    añadirMensaje('¡Has creado una nueva sala de incursión! Esperando a otros jugadores...', 'success--text');
  } else {
    añadirMensaje('¡Te has unido a una incursión! Esperando al líder para iniciar.', 'success--text');
  }
  
  // Aquí conectarías al WebSocket con el ID de la sesión
  // conectarWebSocket(sessionId);
  
  await cargarEstadoJefe();
}

function salirDeLaIncursion() {
  // Aquí harías una llamada a la API para salir de la sala
  // y desconectarías el WebSocket
  bossSessionId.value = null;
  esCreador.value = false;
  isPartidaActiva.value = false;
  participantes.value = [];
  logMensajes.value = [{ time: '00:00', text: '¡Bienvenido! Busca una incursión para empezar.', type: '' }];
  detenerRuleta();
}

// --- LÓGICA DE INICIO/FIN DE PARTIDA ---
function iniciarPartida() {
  if (isPartidaActiva.value || !isPoseDetectorReady.value || !bossSessionId.value) return;
  
  // El creador envía un mensaje por WebSocket para que todos inicien
  // En esta simulación, lo iniciamos localmente
  
  jugadorVidaActual.value = jugadorVidaMaxima;
  repeticiones.value = 0;
  squatState.value = 'up';
  pushupState.value = 'up';
  situpState.value = 'up';
  lungeState.value = 'up';
  
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
// Función para cargar la vida inicial del jefe desde el servidor
async function cargarEstadoJefe() {
  if (!bossSessionId.value) return;
  try {
    // const response = await fetch(`/api/boss/${bossSessionId.value}`);
    // const data = await response.json();
    // jefeVidaActual.value = data.boss.jefe_vida_actual;
    
    // Simulación
    jefeVidaActual.value = jefeVidaMaxima;
    añadirMensaje(`Estado del Jefe cargado: ${jefeVidaActual.value} HP.`, 'info--text');

  } catch (error) {
    console.error("Error de red al cargar el estado del jefe:", error);
    añadirMensaje('ERROR DE RED: No se pudo cargar el estado inicial del Jefe.', 'error--text');
  }
}

onMounted(() => {
    // Ya no cargamos el jefe al montar, sino al unirnos a una sesión.
})

onBeforeUnmount(() => {
    detenerPartida()
})
</script>

<style scoped>
/* Estilos del Esqueleto de la Batalla (Adaptados de tu código anterior) */
.incursion-background {
  background: linear-gradient(135deg, #1d2630 0%, #313c4a 100%);
  min-height: 100vh;
  color: #f5f5f5;
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
  position: relative; /* Necesario para la animación */
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

.message-console {
  background-color: #212121 !important;
  border: 4px solid #444;
  border-radius: 8px;
  font-family: 'Courier New', Courier, monospace;
  background-color: rgba(20, 20, 20, 0.8) !important;
}

.console-title {
  color: #00E676; /* Verde terminal */
}

.message-log {
    height: 200px;
    overflow-y: auto;
    background-color: rgba(0,0,0,0.3);
    padding-right: 8px;
    color: #eee;
}

.message-log p {
    margin: 0;
    line-height: 1.4;
    font-size: 0.9rem;
}

.success--text { color: #69F0AE !important; }
.warning--text { color: #FFD600 !important; }
.critical--text { color: #FF1744 !important; font-weight: bold; text-transform: uppercase; }
.info--text { color: #40C4FF !important; }

/* Webcam Stage (para contener el PoseSkeleton) */
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
    min-height: 150px; /* Asegura que hay espacio para el indicador de golpe */
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
}

.boss-icon {
  color: #BDBDBD;
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
/* -------------------------------------- */
</style>