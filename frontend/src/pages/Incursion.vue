<template>
  <v-container fluid class="pa-4 custom-background">
    
    <v-row class="mb-4 align-center">
      <v-col cols="12">
        <h1 class="text-h4 font-weight-black pokemon-title">
            BATALLA CONTRA EL JEFE DE GIMNASIO
        </h1>
      </v-col>
    </v-row>
    
    <v-row>
      
      <v-col cols="12" md="6" order-md="1">
        <v-card class="pa-3 pokemon-card player-card fill-height">
          <h2 class="text-h5 font-weight-bold mb-3"> TU ENTRENADOR</h2>

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
                :color="calcularColorVida(jugadorVidaPorcentaje)"
                class="health-bar"
            ></v-progress-linear>
          </div>
          
          <div class="webcam-stage mb-4">
            <PoseSkeleton @features="onFeatures" />
            <div v-if="!isPoseDetectorReady" class="loader-overlay">
                <v-progress-circular indeterminate color="primary"></v-progress-circular>
                <p class="mt-2">Cargando detector de pose...</p>
            </div>
          </div>
          
          <div class="d-flex justify-center mt-4 gap-4">
              <v-btn
                  color="success"
                  large
                  @click="iniciarPartida"
                  :disabled="isPartidaActiva || !isPoseDetectorReady"
              >
                  <v-icon left>mdi-sword</v-icon>
                  INICIAR
              </v-btn>
              <v-btn
                  color="error"
                  large
                  @click="detenerPartida"
                  :disabled="!isPartidaActiva"
              >
                  <v-icon left>mdi-hand-right</v-icon>
                  DETENER
              </v-btn>
          </div>
          <p class="text-center mt-3 text-subtitle-1 font-weight-black">
             REPETICIONES: {{ repeticiones }}
          </p>
        </v-card>
      </v-col>

      <v-col cols="12" md="6" order-md="2">
        
        <v-card class="pa-3 pokemon-card mb-4 ruleta-card" dark>
            <div class="d-flex align-center justify-space-between">
                <h3 class="text-h6 font-weight-bold">PRÓXIMO ATAQUE EN:</h3>
                <div class="text-h4 font-weight-black" :class="{'error--text': tiempoRestante < 15}">
                    {{ tiempoFormateado }}
                </div>
            </div>
            
            <v-divider class="my-2"></v-divider>
            
            <div class="text-center">
                <p class="mb-1 text-subtitle-1">¡El Jefe exige!</p>
                <h2 class="text-h3 font-weight-black text-warning">
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
            class="pa-3 pokemon-card enemy-card mb-4"
            :class="{'hit-animation': isJefeGolpeado}"
        >
          <div class="d-flex align-center justify-space-between mb-3">
            <h2 class="text-h5 font-weight-bold"> JEFE DE GIMNASIO</h2>
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
              class="health-bar"
            >
              <template v-slot:default="{ value }">
                <strong>{{ Math.ceil(value) }}%</strong>
              </template>
            </v-progress-linear>
          </div>
          
          <div class="text-center boss-image-area">
             <v-icon 
                v-if="isJefeGolpeado" 
                size="100" 
                color="yellow lighten-2" 
                class="hit-indicator"
            >
                mdi-flash-alert
            </v-icon>
          </div>
        </v-card>
        
        <v-card class="pa-4 message-console">
          <h3 class="text-h6 mb-2 text-primary"> REGISTRO DE COMBATE</h3>
          <div class="message-log" ref="messageLogRef">
            <p v-for="(msg, index) in logMensajes" :key="index" :class="msg.type">
                <strong>[{{ msg.time }}]</strong> {{ msg.text }}
            </p>
          </div>
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
    MIN_SQUAT_ANGLE, 
    MAX_SQUAT_ANGLE, 
    MIN_PUSHUP_ANGLE, 
    MAX_PUSHUP_ANGLE 
} from '../utils/exercise-detection.js' 

// --- CONSTANTES DE JUEGO Y SIMULACIÓN DE BOSS ---
const jefeVidaMaxima = 100 // Usada como referencia visual, la real viene del servidor
const jugadorVidaMaxima = 100 
const DURACION_RULETA = 180 // 3 minutos
const DAÑO_AL_JEFE_BASE = 8;
const DAÑO_AL_JUGADOR_POR_FALLO = 5;
const UMBRAL_POBRE_SCORE = 0.65; // Calidad mínima de la pose para no recibir daño

// **IMPORTANTE**: Simulación de ID de la sesión del Jefe (Boss)
// Debes reemplazar esto con el ID real obtenido al crear o unirte a una sesión.
const BOSS_ID_SIMULADO = 1; 

// --- ESTADO GENERAL Y SENSORES ---
const features = ref(null)
const isPoseDetectorReady = ref(false)
const isPartidaActiva = ref(false)

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
    try {
        const response = await fetch('/api/boss/attack', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bossId: BOSS_ID_SIMULADO, danoAplicado: dano }),
        });
        const data = await response.json();

        if (!response.ok || !data.success) {
            console.error("Error al atacar al boss:", data.error || response.statusText);
            añadirMensaje(`ERROR: Falló la comunicación con el Jefe.`, 'error--text');
            return;
        }

        // 2. Actualizar vida local con el valor devuelto por el servidor
        jefeVidaActual.value = data.nuevaVida;

    } catch (error) {
        console.error("Error de red al atacar al boss:", error);
        añadirMensaje(`ERROR DE RED: No se pudo contactar con el Jefe.`, 'error--text');
        return;
    }
    
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


// --- LÓGICA DE INICIO/FIN DE PARTIDA ---
function iniciarPartida() {
    if (isPartidaActiva.value || !isPoseDetectorReady.value) return
    
    // Resetear
    jugadorVidaActual.value = jugadorVidaMaxima
    repeticiones.value = 0
    squatState.value = 'up'
    pushupState.value = 'up'
    situpState.value = 'up'
    lungeState.value = 'up'
    logMensajes.value = []

    // Nota: La vida del jefe se resetea al cargar desde el servidor

    seleccionarEjercicioRandom(); 
    tiempoRestante.value = DURACION_RULETA;

    isPartidaActiva.value = true
    añadirMensaje(`¡Comienza el combate! El primer ataque es: ${ejercicioSeleccionado.value}.`, 'success--text')
    
    iniciarRuleta(); 
}

function detenerPartida() {
    if (!isPartidaActiva.value) return
    isPartidaActiva.value = false
    detenerRuleta(); 
    if (dañoJugadorTimeout) clearTimeout(dañoJugadorTimeout);
    añadirMensaje('Combate detenido por el usuario.', 'warning--text')
}

// --- LLAMADA INICIAL AL MONTAR ---
// Función para cargar la vida inicial del jefe desde el servidor
async function cargarEstadoJefe() {
    try {
        const response = await fetch(`/api/boss/${BOSS_ID_SIMULADO}`);
        const data = await response.json();

        if (response.ok && data.success) {
            jefeVidaActual.value = data.boss.jefe_vida_actual;
            // Opcional: Si el jefeVidaMaxima en el servidor es diferente, se actualizaría aquí.
            // jefeVidaMaxima = data.boss.jefe_vida_max; 
            añadirMensaje(`Estado del Jefe cargado: ${jefeVidaActual.value} HP.`, 'info--text');
        } else if (response.status === 404) {
            añadirMensaje('ERROR: Jefe no encontrado en la base de datos.', 'error--text');
        }
    } catch (error) {
        console.error("Error de red al cargar el estado del jefe:", error);
        añadirMensaje('ERROR DE RED: No se pudo cargar el estado inicial del Jefe.', 'error--text');
    }
}

onMounted(() => {
    cargarEstadoJefe();
})

onBeforeUnmount(() => {
    detenerPartida()
})
</script>

<style scoped>
/* Estilos del Esqueleto de la Batalla (Adaptados de tu código anterior) */
.custom-background {
  background: linear-gradient(to bottom, #2c3e50, #34495e); 
  min-height: 100vh;
}

.pokemon-title {
    color: #f1c40f; 
    text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
}

.pokemon-card {
  border: 4px solid #333;
  border-radius: 12px;
  box-shadow: 5px 5px 0px 0px #1a1a1a; 
  background-color: #3f51b5 !important; 
  color: white;
  position: relative; /* Necesario para la animación */
}

.enemy-card {
  background-color: #e57373 !important; 
  border-color: #c62828;
}

.player-card {
  background-color: #64b5f6 !important; 
  border-color: #1565c0;
}

/* 💥 CORRECCIÓN DE LA SINTAXIS CSS DEPRECADA */
.health-bar :deep(.v-progress-linear__background) {
  background-color: #444 !important;
}

.message-console {
  background-color: #212121 !important;
  border: 4px solid #444;
  border-radius: 8px;
  font-family: 'Courier New', Courier, monospace;
}

.message-log {
    height: 200px;
    overflow-y: auto;
    padding-right: 8px;
    color: #eee;
}

.message-log p {
    margin: 0;
    line-height: 1.4;
    font-size: 0.9rem;
}

.success--text { color: #4CAF50 !important; }
.warning--text { color: #FFEB3B !important; }
.critical--text { color: #FF5252 !important; font-weight: bold; }
.info--text { color: #2196F3 !important; }

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
  background-color: #3e2723 !important; 
  border-color: #5d4037;
  color: white;
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
  animation: shake 0.2s; /* Coincide con el timeout en JS */
  box-shadow: 0 0 20px 5px rgba(255, 255, 0, 0.7) !important; /* Brillo amarillo */
}

.boss-image-area {
    min-height: 150px; /* Asegura que hay espacio para el indicador de golpe */
    position: relative;
}

.hit-indicator {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    opacity: 0.8;
    z-index: 5;
    text-shadow: 0 0 10px #ff0000;
}
/* -------------------------------------- */
</style>