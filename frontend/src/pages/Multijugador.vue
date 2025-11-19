<script setup>
import { ref, computed, shallowRef, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PoseSkeleton from '../components/PoseSkeleton.vue' 
import PoseFeatures from '../components/PoseFeatures.vue'
import { 
  checkSquatRep, 
  checkPushupRep, 
  checkSitupRep,    
  checkLungeRep,
  checkJumpingJacksRep,
  checkMountainClimbersRep
} from '../utils/exercise-detection.js' 
import axios from 'axios'

const route = useRoute()
const router = useRouter()

const salaId = ref(route.query.sala || null)
const user = ref(JSON.parse(localStorage.getItem('user')) || {})
// Computado seguro para el ID del usuario local
const userId = computed(() => user.value?.id || null)

const creadorId = ref(null)
const esCreador = computed(() => userId.value && creadorId.value && String(userId.value) === String(creadorId.value))

const ws = ref(null)
const isConnected = ref(false)
const jugadores = ref([])

// Inicializado a false para que se vea el indicador de carga al principio
const isPoseDetectorReady = ref(false) 
const isPartidaActiva = ref(false)
const ejercicioSeleccionado = ref('Sentadillas')
const mostrarMensajeObjetivo = ref(false)
const features = shallowRef(null)
const ganador = ref(null)
const maxReps = ref(5)
const panelAbierto = ref([])

const squatState = ref({}) 
const pushupState = ref({}) 
const situpState = ref({})
const lungeState = ref({})
const jumpingJacksState = ref({})
const mountainClimbersState = ref({})

// Comprueba si TODOS los jugadores en la sala han marcado "Estoy listo"
const todosListos = computed(() => {
  return jugadores.value.length > 0 && jugadores.value.every(j => j.ready)
})

function onFeatures(payload) {
  // Activar indicador de que los modelos están listos cuando llegan datos
  if (payload && !isPoseDetectorReady.value) {
    isPoseDetectorReady.value = true
  }
  
  features.value = (typeof structuredClone === 'function') 
    ? structuredClone(payload) 
    : JSON.parse(JSON.stringify(payload || {}))

  if (!isPartidaActiva.value || !features.value?.angles) return

  const exerciseHandlers = {
    'Sentadillas': { detect: checkSquatRep, state: squatState },
    'Flexiones': { detect: checkPushupRep, state: pushupState },
    'Abdominales': { detect: checkSitupRep, state: situpState },
    'Zancadas': { detect: checkLungeRep, state: lungeState },
    'Jumping Jacks': { detect: checkJumpingJacksRep, state: jumpingJacksState },
    'Mountain Climbers': { detect: checkMountainClimbersRep, state: mountainClimbersState }
  }

  const handler = exerciseHandlers[ejercicioSeleccionado.value]
  const localUserId = userId.value
  // Buscar al jugador local en la lista
  const jugador = jugadores.value.find(j => String(j.id) === String(localUserId))

  if (handler && jugador) {
    const currentState = handler.state.value[localUserId] || (ejercicioSeleccionado.value === 'Jumping Jacks' ? 'down' : 'up')
    const detectionInput = ejercicioSeleccionado.value === 'Jumping Jacks' ? features.value : features.value.angles
    const result = handler.detect(detectionInput, currentState)

    // Actualizar estado local
    handler.state.value = { ...handler.state.value, [localUserId]: result.newState }

    // Enviar actualización si se completa una repetición
    if (result.repCompleted && ws.value && ws.value.readyState === WebSocket.OPEN) {
      ws.value.send(JSON.stringify({
        type: 'REPS_UPDATE',
        reps: jugador.repeticiones + 1
      }))
    }
  }
}

function marcarListo() {
  // Solo permitir si el WS está abierto y los modelos de IA han cargado
  if (ws.value && ws.value.readyState === WebSocket.OPEN && isPoseDetectorReady.value) {
    ws.value.send(JSON.stringify({ type: 'PLAYER_READY' }))
  }
}

async function iniciarPartida() {
  // Validaciones estrictas antes de iniciar
  if (!esCreador.value) return;
  if (!todosListos.value) return; // Nadie puede iniciar si alguien no está listo
  if (!isPoseDetectorReady.value) return;
  if (isPartidaActiva.value) return;

  try {
    await axios.post('http://localhost:9000/api/sessions/start', { codigo: salaId.value })
  } catch (error) {
    console.error("Error al iniciar la partida:", error)
    alert("No se pudo iniciar la partida.")
  }
}

function detenerPartida() {
  isPartidaActiva.value = false
}

onMounted(() => {
  if (!salaId.value || !userId.value) {
    alert("No se ha especificado una sala o no has iniciado sesión.")
    router.push('/inicial')
    return
  }

  ws.value = new WebSocket('ws://localhost:8082')

  ws.value.onopen = () => {
    isConnected.value = true
    ws.value.send(JSON.stringify({
      type: 'JOIN_SESSION',
      sessionId: salaId.value,
      userId: userId.value,
      nombre: user.value?.username || `Jugador ${userId.value}`
    }))
  }

  ws.value.onmessage = (event) => {
    const data = JSON.parse(event.data)
    switch (data.type) {
      case 'SESSION_STATE':
        jugadores.value = Object.entries(data.state).map(([id, playerData]) => ({
          id: String(id),
          nombre: playerData.nombre,
          repeticiones: playerData.reps,
          ready: playerData.ready
        }))
        if (data.creatorId) creadorId.value = data.creatorId
        
        // Inicializar estados para nuevos jugadores
        jugadores.value.forEach(jugador => {
          if (!squatState.value[jugador.id]) squatState.value[jugador.id] = 'up'
          if (!pushupState.value[jugador.id]) pushupState.value[jugador.id] = 'up'
          if (!situpState.value[jugador.id]) situpState.value[jugador.id] = 'up'
          if (!lungeState.value[jugador.id]) lungeState.value[jugador.id] = 'up'
          if (!jumpingJacksState.value[jugador.id]) jumpingJacksState.value[jugador.id] = 'down'
          if (!mountainClimbersState.value[jugador.id]) mountainClimbersState.value[jugador.id] = 'up'
        })
        
        if (data.ejercicio) ejercicioSeleccionado.value = data.ejercicio
        if (data.maxReps) maxReps.value = data.maxReps
        break

      case 'SESSION_STARTED':
        isPartidaActiva.value = true
        mostrarMensajeObjetivo.value = false;
        ganador.value = null
        
        // Resetear estados locales
        squatState.value = {}
        pushupState.value = {}
        situpState.value = {}
        lungeState.value = {}
        jumpingJacksState.value = {}
        mountainClimbersState.value = {}
        jugadores.value.forEach(j => j.repeticiones = 0)
        break

      case 'JOIN_ERROR':
        alert(`Error al unirse: ${data.message}`)
        router.push('/unirsala')
        break

      case 'SETTINGS_UPDATED':
        if (data.ejercicio) ejercicioSeleccionado.value = data.ejercicio
        if (data.maxReps) maxReps.value = data.maxReps
        break

      case 'LEADER_LEFT':
        alert(data.message || 'El líder ha abandonado la sala. Serás redirigido.')
        detenerPartida()
        router.push('/inicial')
        break

      case 'PLAYER_WINS':
        ganador.value = data.winnerName || 'Un jugador'
        mostrarMensajeObjetivo.value = true
        isPartidaActiva.value = false
        break
    }
  }

  ws.value.onclose = () => isConnected.value = false
  ws.value.onerror = () => alert("Error de conexión con el servidor de juego.")
})

onBeforeUnmount(() => {
  detenerPartida()
  if (ws.value) ws.value.close()
})

// Observar cambios para que el creador actualice la sala
watch([ejercicioSeleccionado, maxReps], ([newEjercicio, newReps]) => {
  if (esCreador.value && ws.value && ws.value.readyState === WebSocket.OPEN) {
    ws.value.send(JSON.stringify({
      type: 'SETTINGS_UPDATE',
      ejercicio: newEjercicio,
      maxReps: newReps
    }))
  }
})
</script>

<template>
  <v-app class="app-background">
    <v-main>
      <v-container fluid class="pa-4 custom-container"> 
        <v-card elevation="16" class="pa-6 rounded-xl card-elevated" dark>
          
          <v-card-title class="justify-center pb-2">
            <h2 class="text-h5 font-weight-black">
              Modo Multijugador - {{ ejercicioSeleccionado }}
            </h2>
          </v-card-title>

          <v-btn
            color="error"
            class="mb-4 button-shadow back-button"
            rounded
            to="/inicial"
            block
          >
            <v-icon left>mdi-arrow-left</v-icon>
            Volver al Inicio
          </v-btn>
          
          <div class="text-center mb-4" v-if="salaId">
            <v-chip small :color="isConnected ? 'green' : 'red'">
              {{ isConnected ? 'CONECTADO' : 'DESCONECTADO' }}
            </v-chip>
            <v-chip small class="ml-2">Sala: {{ salaId }}</v-chip>
          </div>

          <v-card-text>
            <v-row align="start">
              
              <v-col cols="12" md="8" class="d-flex flex-column align-center">
                <div class="webcam-container mb-4">
                  <PoseSkeleton class="video-feed" @features="onFeatures" />

                  <div v-if="!isPoseDetectorReady" class="webcam-overlay">
                    <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
                    <p class="mt-3 font-weight-bold">Cargando modelos IA...</p>
                  </div>

                  <transition name="fade">
                    <div v-if="mostrarMensajeObjetivo" class="objetivo-overlay">
                      <v-icon size="64" color="amber lighten-1">mdi-trophy</v-icon>
                      <h2 class="mt-3 text-h5 font-weight-black text-amber-lighten-2">
                        ¡Victoria! Ganador: {{ ganador }}
                      </h2>
                    </div>
                  </transition>
                </div>

                <div class="button-group d-flex flex-column align-center gap-3 mb-4 w-100" v-if="esCreador">
                  
                  <v-btn
                    color="success"
                    x-large
                    rounded
                    class="button-shadow button-pulse w-100"
                    @click="iniciarPartida"
                    :disabled="!todosListos || !isPoseDetectorReady || isPartidaActiva"
                    style="max-width: 400px;"
                  >
                    <v-icon left large>mdi-play-circle</v-icon>
                    <span class="font-weight-black text-h6">
                       {{ isPartidaActiva ? 'PARTIDA EN CURSO' : (todosListos ? 'INICIAR PARTIDA' : 'ESPERANDO JUGADORES...') }}
                    </span>
                  </v-btn>

                  <v-btn
                    color="red darken-1"
                    large
                    rounded
                    class="button-shadow button-stop w-100 mt-2"
                    @click="detenerPartida"
                    :disabled="!isPartidaActiva"
                    style="max-width: 400px;"
                  >
                    <v-icon left>mdi-stop</v-icon>
                    DETENER PARTIDA
                  </v-btn>
                </div>
                
                <div v-else class="text-center mb-4">
                   <v-chip v-if="!isPartidaActiva" color="grey darken-3">Esperando al líder...</v-chip>
                </div>

              </v-col>

              <v-col cols="12" md="4" class="d-flex flex-column align-center">
                
                <v-card
                  v-for="jugador in jugadores"
                  :key="jugador.id"
                  class="pa-3 mb-3 rounded-lg repetitions-card"
                  :class="{'leader-card-border': String(jugador.id) === String(creadorId)}"
                  elevation="8"
                  dark
                >
                  <div class="text-h6 font-weight-bold mb-2 player-name-container">
                    {{ jugador.nombre }}
                    <v-icon 
                      v-if="String(jugador.id) === String(creadorId)" 
                      color="amber" 
                      small
                      class="leader-crown ml-2"
                    >
                      mdi-crown
                    </v-icon>
                    <span v-if="String(jugador.id) === String(userId)" class="text-caption ml-1">(Tú)</span>
                  </div>
                  
                  <div class="text-h5 font-weight-black mb-2">
                    Reps: {{ jugador.repeticiones }} / {{ maxReps }}
                  </div>

                  <v-chip
                    v-if="isPartidaActiva"
                    :color="jugador.repeticiones >= maxReps ? 'amber' : 'primary'"
                    text-color="white"
                    block
                    class="mt-2 font-weight-bold"
                  >
                    {{ jugador.repeticiones >= maxReps ? '¡META!' : '🔥 COMPITIENDO...' }}
                  </v-chip>

                  <template v-else>
                    
                    <v-chip
                      v-if="jugador.ready"
                      color="green"
                      text-color="white"
                      block
                      class="mt-2"
                    >
                      ✅ Listo
                    </v-chip>

                    <template v-else>
                      <v-btn
                        v-if="String(jugador.id) === String(userId)"
                        color="amber darken-3"
                        block
                        rounded
                        @click="marcarListo"
                        :disabled="!isPoseDetectorReady"
                        :loading="!isPoseDetectorReady"
                        class="white--text"
                      >
                        <v-icon left>mdi-check</v-icon>
                        ESTOY LISTO
                      </v-btn>
                      
                      <v-chip
                        v-else
                        color="grey darken-3"
                        text-color="white"
                        block
                        class="mt-2"
                      >
                        🕒 Esperando...
                      </v-chip>
                    </template>

                  </template>
                </v-card>

                <v-divider class="my-4 w-100"></v-divider>

                <v-select
                  v-model="ejercicioSeleccionado"
                  :items="['Sentadillas','Flexiones','Abdominales', 'Zancadas', 'Jumping Jacks', 'Mountain Climbers']"
                  label="Ejercicio"
                  outlined
                  dense
                  dark
                  class="mb-2 w-100"
                  :disabled="isPartidaActiva || !esCreador"
                ></v-select>

                <div class="d-flex flex-column w-100 mb-4">
                  <div class="text-caption mb-1">Objetivo: {{ maxReps }} Reps</div>
                  <v-slider
                    v-model="maxReps"
                    :min="1"
                    :max="50"
                    step="1"
                    thumb-label
                    dense
                    dark
                    hide-details
                    :disabled="isPartidaActiva || !esCreador"
                  ></v-slider>
                </div>

                <v-expansion-panels
                  v-model="panelAbierto"
                  flat
                  class="features-card w-100"
                  multiple
                >
                  <v-expansion-panel style="background-color: transparent;">
                    <v-expansion-panel-title class="text-caption font-weight-bold text-center text-grey">
                      DATOS SENSOR
                    </v-expansion-panel-title>
                    <v-expansion-panel-text>
                      <PoseFeatures :features="features" />
                    </v-expansion-panel-text>
                  </v-expansion-panel>
                </v-expansion-panels>
                
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-container>
    </v-main>
  </v-app>
</template>

<style scoped>
/* Fondo y Tarjeta Principal */
.app-background { background: linear-gradient(135deg, #121212, #1c1c1c); color: #fff; }
.card-elevated { background-color: #212121 !important; border: 1px solid #333; color: #fff !important; }
.custom-container { max-width: 1000px !important; }

/* Contenedor de Cámara */
.webcam-container { position: relative; width: 100%; padding-top: 0%; min-height: 500px; border-radius: 12px; overflow: hidden; box-shadow: 0 8px 30px rgba(0,0,0,0.5); background-color: #000; }
@media (max-width: 768px) { .webcam-container { min-height: 300px; } }

/* Overlays (Carga y Victoria) */
.webcam-overlay { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; flex-direction: column; color: #fff; background-color: rgba(0,0,0,0.8); z-index: 10; }
.objetivo-overlay { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; flex-direction: column; color: #fff; background-color: rgba(255,193,7,0.1); backdrop-filter: blur(2px); z-index: 20; text-align: center; animation: scaleIn 0.6s ease; }

/* Tarjetas de Jugador */
.repetitions-card { 
    width: 100%; 
    max-width: 280px; 
    background-color: #2c2c2c !important; 
    text-align: center; 
    color: #fff !important; 
    border: 2px solid transparent; /* Borde invisible por defecto */
    transition: all 0.3s ease;
}

/* ESTILO LÍDER: Borde Amarillo */
.leader-card-border {
    border-color: #FFC107 !important; 
    box-shadow: 0 0 15px rgba(255, 193, 7, 0.3); 
}

/* Nombre y Corona */
.player-name-container {
    display: flex;
    align-items: center;
    justify-content: center;
}
.leader-crown {
    margin-bottom: 4px; /* Ajuste visual */
}

/* Botones */
.button-group { 
    /* Asegura que los botones se apilen verticalmente */
    display: flex; 
    flex-direction: column; 
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.5s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
@keyframes scaleIn { from { transform: scale(0.8); opacity: 0; } to { transform: scale(1); opacity: 1; } }

/* Utilidades */
.w-100 { width: 100%; }
.gap-3 { gap: 12px; }
</style>