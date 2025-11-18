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
const userId = ref(null); // Se inicializa a null y se obtiene en onMounted

function obtenerUsuarioId() {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  return user?.id || null;
}
const creadorId = ref(null)
const esCreador = computed(() => userId.value && creadorId.value && String(userId.value) === String(creadorId.value))

const ws = ref(null)
const isConnected = ref(false)
const jugadores = ref([])

const isPoseDetectorReady = ref(true) 
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

const todosListos = computed(() =>
  jugadores.value.length > 0 && jugadores.value.every(j => j.ready)
)

const startButtonText = computed(() => {
  if (jugadores.value.length < 2) {
    return 'Se necesitan al menos 2 jugadores';
  }
  if (!todosListos.value) {
    const faltan = jugadores.value.filter(j => !j.ready).length;
    return `Esperando a ${faltan} jugador(es)`;
  }
  return 'Iniciar Partida';
});

// --- NUEVO: Lógica para vídeo local ---
const localVideoUrl = ref(null);
function onFileChange(event) {
  const file = event.target.files[0];
  if (file) {
    localVideoUrl.value = URL.createObjectURL(file);
  } else {
    localVideoUrl.value = null;
  }
}


function onFeatures(payload) {
  if (payload && !isPoseDetectorReady.value) isPoseDetectorReady.value = true;
  features.value = (typeof structuredClone === 'function') 
    ? structuredClone(payload) 
    : JSON.parse(JSON.stringify(payload || {}));

  if (!isPartidaActiva.value || !features.value?.angles) return;

  const exerciseHandlers = {
    'Sentadillas': { detect: checkSquatRep, state: squatState },
    'Flexiones': { detect: checkPushupRep, state: pushupState },
    'Abdominales': { detect: checkSitupRep, state: situpState },
    'Zancadas': { detect: checkLungeRep, state: lungeState },
    'Jumping Jacks': { detect: checkJumpingJacksRep, state: jumpingJacksState },
    'Mountain Climbers': { detect: checkMountainClimbersRep, state: mountainClimbersState }
  };

  const handler = exerciseHandlers[ejercicioSeleccionado.value];
  const jugador = jugadores.value.find(j => j.id == userId.value);

  if (handler && jugador) {
    const currentState = handler.state.value[userId.value] || (ejercicioSeleccionado.value === 'Jumping Jacks' ? 'down' : 'up');
    const detectionInput = ejercicioSeleccionado.value === 'Jumping Jacks' ? features.value : features.value.angles;
    const result = handler.detect(detectionInput, currentState);

    // Actualizamos el estado del ejercicio para este jugador
    handler.state.value = { ...handler.state.value, [userId.value]: result.newState };

    if (result.repCompleted && ws.value && ws.value.readyState === WebSocket.OPEN) {
      ws.value.send(JSON.stringify({
        type: 'REPS_UPDATE',
        reps: jugador.repeticiones + 1
      }));
    }
  }
}

function marcarListo() {
  if (ws.value && ws.value.readyState === WebSocket.OPEN) {
    ws.value.send(JSON.stringify({ type: 'PLAYER_READY' }));
  }
}

async function iniciarPartida() {
  if (!esCreador.value || jugadores.value.length < 2 || !todosListos.value || !isPoseDetectorReady.value || isPartidaActiva.value) return;
  try {
    const user = JSON.parse(localStorage.getItem('user'));
    const token = user?.token;

    if (!token) {
      alert("No estás autenticado.");
      router.push('/login');
      return;
    }

    await axios.post('http://localhost:9000/api/sessions/start', 
      { codigo: salaId.value, iniciadorId: userId.value },
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
  } catch (error) {
    console.error("Error al iniciar la partida:", error);
    alert("No se pudo iniciar la partida.");
  }
}

function detenerPartida() {
  isPartidaActiva.value = false;
}

onMounted(() => {
  userId.value = obtenerUsuarioId();

  if (!salaId.value || !userId.value) {
    alert("No se ha especificado una sala o no has iniciado sesión.");
    router.push('/inicial');
    return;
  }

  ws.value = new WebSocket('ws://localhost:8082');

  ws.value.onopen = () => {
    isConnected.value = true;
    ws.value.send(JSON.stringify({
      type: 'JOIN_SESSION',
      sessionId: salaId.value,
      userId: userId.value,
      nombre: (() => {
        const user = JSON.parse(localStorage.getItem('user'));
        // El modelo Sequelize usa 'usuari', no 'username'
        return user?.usuari || user?.username || `Jugador ${userId.value}`;
      })()
    }));
  };

  ws.value.onmessage = (event) => {
    const data = JSON.parse(event.data);
    switch (data.type) {
      case 'SESSION_STATE':
        jugadores.value = Object.entries(data.state).map(([id, playerData]) => ({
          id: String(id),
          nombre: playerData.nombre,
          repeticiones: playerData.reps,
          ready: playerData.ready
        }));
        if (data.creatorId) creadorId.value = data.creatorId;
        jugadores.value.forEach(jugador => {
          if (!squatState.value[jugador.id]) squatState.value[jugador.id] = 'up';
          if (!pushupState.value[jugador.id]) pushupState.value[jugador.id] = 'up';
          if (!situpState.value[jugador.id]) situpState.value[jugador.id] = 'up';
          if (!lungeState.value[jugador.id]) lungeState.value[jugador.id] = 'up';
          if (!jumpingJacksState.value[jugador.id]) jumpingJacksState.value[jugador.id] = 'down';
          if (!mountainClimbersState.value[jugador.id]) mountainClimbersState.value[jugador.id] = 'up';
        });
        // Actualizar también la configuración de la sala
        if (data.ejercicio) ejercicioSeleccionado.value = data.ejercicio;
        if (data.maxReps) maxReps.value = data.maxReps;

        break;
      case 'SESSION_STARTED':
        isPartidaActiva.value = true;
        mostrarMensajeObjetivo.value = false;
        ganador.value = null;
        // Reiniciar estados de ejercicios para todos los jugadores
        squatState.value = {};
        pushupState.value = {};
        situpState.value = {};
        lungeState.value = {};
        jumpingJacksState.value = {};
        mountainClimbersState.value = {};
        jugadores.value.forEach(j => j.repeticiones = 0);
        break;
      case 'JOIN_ERROR':
        alert(`Error al unirse: ${data.message}`);
        router.push('/unirsala');
        break;
      case 'SETTINGS_UPDATED':
        // El servidor nos informa de la nueva configuración
        if (data.ejercicio) ejercicioSeleccionado.value = data.ejercicio;
        if (data.maxReps) maxReps.value = data.maxReps;
        break;
      case 'LEADER_LEFT':
        alert(data.message || 'El líder ha abandonado la sala. Serás redirigido.');
        detenerPartida();
        router.push('/inicial');
        break;
      case 'PLAYER_WINS':
        ganador.value = data.winnerName || 'Un jugador';
        mostrarMensajeObjetivo.value = true;
        isPartidaActiva.value = false;
        // Opcional: añadir un timeout para poder volver a jugar
        break;
    }
  };

  ws.value.onclose = () => isConnected.value = false;
  ws.value.onerror = () => alert("Error de conexión con el servidor de juego.");
});

onBeforeUnmount(() => {
  detenerPartida();
  if (ws.value) ws.value.close();
  if (localVideoUrl.value) {
    URL.revokeObjectURL(localVideoUrl.value);
    localVideoUrl.value = null;
  }
})

// Observar cambios en la configuración para enviarlos al servidor si eres el creador
watch([ejercicioSeleccionado, maxReps], ([newEjercicio, newReps]) => {
  if (esCreador.value && ws.value && ws.value.readyState === WebSocket.OPEN) {
    ws.value.send(JSON.stringify({
      type: 'SETTINGS_UPDATE',
      ejercicio: newEjercicio,
      maxReps: newReps
    }));
  }
});



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
            dark
          >
            <v-icon left>mdi-arrow-left</v-icon>
            Volver al Inicio
          </v-btn>
          
          <div class="text-center mb-4">
            <v-chip small :color="isConnected ? 'green' : 'red'">
              {{ isConnected ? 'CONECTADO' : 'DESCONECTADO' }}
            </v-chip>
            <v-chip small class="ml-2">Sala: {{ salaId }}</v-chip>
          </div>

          <v-card-text>
            <v-row align="start">
              <!-- Columna cámara -->
              <v-col cols="12" md="8" class="d-flex flex-column align-center">
                <div class="webcam-container mb-4">
                  <PoseSkeleton class="video-feed" @features="onFeatures" :video-src="localVideoUrl" />

                  <div v-if="!isPoseDetectorReady" class="webcam-overlay">
                    <v-progress-circular indeterminate color="primary"></v-progress-circular>
                    <p class="mt-3">Cargando detector de pose...</p>
                  </div>

                  <transition name="fade">
                    <div v-if="mostrarMensajeObjetivo" class="objetivo-overlay">
                      <v-icon size="64" color="amber lighten-1">mdi-trophy</v-icon>
                      <h2 class="mt-3 text-h5 font-weight-black text-amber-lighten-2">
                        ¡Objetivo alcanzado! Ganador: {{ ganador }}
                      </h2>
                    </div>
                  </transition>
                </div>

                <!-- Selector de vídeo local para pruebas -->
                <div class="w-100 mb-4" style="max-width: 500px;">
                  <v-file-input
                    @change="onFileChange"
                    label="Usar vídeo local (para pruebas)"
                    accept="video/*"
                    dense
                    outlined
                    dark
                  ></v-file-input>
                </div>
                <div class="button-group d-flex gap-4 mb-4">
                  <v-btn
                    color="primary"
                    large
                    rounded
                    class="button-shadow button-pulse"
                    v-if="esCreador"
                    @click="iniciarPartida"
                    :disabled="jugadores.length < 2 || !todosListos || !isPoseDetectorReady || isPartidaActiva"
                  >
                    <v-icon left>mdi-play</v-icon>
                    {{ startButtonText }}
                  </v-btn>

                  <v-btn
                    color="red darken-1"
                    large
                    rounded
                    class="button-shadow button-stop"
                    @click="detenerPartida"
                    :disabled="!isPartidaActiva"
                  >
                    <v-icon left>mdi-stop</v-icon>
                    Detener
                  </v-btn>
                </div>
              </v-col>

              <!-- Columna jugadores + configuraciones -->
              <v-col cols="12" md="4" class="d-flex flex-column align-center">
                <v-card
                  v-for="jugador in jugadores"
                  :key="jugador.id"
                  class="pa-3 mb-3 rounded-lg repetitions-card"
                  :class="{ 'creator-card': String(jugador.id) === String(creadorId), 'self-card': String(jugador.id) === String(userId) }"
                  elevation="8"
                  dark
                >
                  <div class="d-flex align-center justify-center text-h6 font-weight-bold mb-2">
                    <span>{{ jugador.nombre }}</span>
                    <v-icon v-if="String(jugador.id) === String(creadorId)" color="amber" small right>mdi-crown</v-icon>
                  </div>
                  <div class="text-h5 font-weight-black mb-2">
                    Reps: {{ jugador.repeticiones }} / {{ maxReps }}
                  </div>
                  
                  <div class="mt-2 text-caption font-weight-bold" v-if="isPartidaActiva">
                      Estado: 
                      <span v-if="ejercicioSeleccionado === 'Sentadillas'">{{ squatState[jugador.id] }}</span>
                      <span v-else-if="ejercicioSeleccionado === 'Flexiones'">{{ pushupState[jugador.id] }}</span>
                      <span v-else>Listo</span>
                  </div>

                  <v-btn
                    v-if="!jugador.ready && !isPartidaActiva && String(jugador.id) === String(userId)"
                    color="green"
                    block
                    rounded
                    @click="marcarListo"
                  >
                    <v-icon left>mdi-check</v-icon>
                    Estoy listo
                  </v-btn>

                  <v-chip
                    v-else-if="jugador.ready && !isPartidaActiva"
                    color="green"
                    text-color="white"
                    block
                    class="mt-2"
                  >
                    ✅ Listo
                  </v-chip>
                  
                  <v-chip
                    v-else-if="isPartidaActiva"
                    :color="jugador.repeticiones >= maxReps ? 'amber' : 'primary'"
                    text-color="white"
                    block
                    class="mt-2"
                  >
                    {{ jugador.repeticiones >= maxReps ? '¡META!' : 'COMPITIENDO...' }}
                  </v-chip>
                  
                </v-card>

                <!-- Selector de ejercicio -->
                <v-select
                  v-model="ejercicioSeleccionado"
                  :items="['Sentadillas','Flexiones','Abdominales', 'Zancadas', 'Jumping Jacks', 'Mountain Climbers']"
                  label="Ejercicio"
                  outlined
                  dense
                  dark
                  class="mb-4"
                  :disabled="isPartidaActiva || !esCreador"
                ></v-select>

                <!-- Selector de repeticiones -->
                <div class="d-flex flex-column w-100 mb-4">
                  <v-slider
                    v-model="maxReps"
                    label="Repeticiones objetivo"
                    :min="1"
                    :max="20"
                    step="1"
                    thumb-label
                    dense
                    dark
                    :disabled="isPartidaActiva || !esCreador"
                  ></v-slider>
                  <v-text-field
                    v-model="maxReps"
                    type="number"
                    label="Repeticiones"
                    dense
                    outlined
                    dark
                    :min="1"
                    :max="20"
                    class="mt-2"
                    :disabled="isPartidaActiva || !esCreador"
                  ></v-text-field>
                </div>

                <v-expansion-panels
                  v-model="panelAbierto"
                  flat
                  class="features-card"
                  multiple
                >
                  <v-expansion-panel>
                    <v-expansion-panel-title class="text-caption font-weight-bold text-center text-primary">
                      DATOS DEL SENSOR (Ángulos Clave)
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
.app-background { background: linear-gradient(135deg, #121212, #1c1c1c); color: #fff; }
.card-elevated { background-color: #212121 !important; border: 1px solid #333; color: #fff !important; }
.card-elevated h2 { white-space: normal; word-break: break-word; text-align: center; }
.custom-container { max-width: 1000px !important; }
.webcam-container { position: relative; width: 100%; padding-top: 0%; min-height: 500px; border-radius: 12px; overflow: hidden; box-shadow: 0 8px 30px rgba(0,0,0,0.5); }
@media (max-width: 768px) { .webcam-container { min-height: 300px; } }
.repetitions-card { 
  width: 100%; 
  max-width: 250px; 
  background-color: #2c2c2c !important; 
  text-align: center; 
  color: #fff !important;
  border: 2px solid transparent;
  transition: all 0.3s ease;
}
.creator-card {
  border-color: #FFD700; /* Gold border for creator */
}
.self-card {
  box-shadow: 0 0 15px #03A9F4; /* Glow for self */
}
.webcam-overlay, .objetivo-overlay { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; flex-direction: column; color: #fff; }
.webcam-overlay { background-color: rgba(0,0,0,0.7); z-index: 10; }
.objetivo-overlay { background-color: rgba(255,193,7,0.1); backdrop-filter: blur(2px); z-index: 20; text-align: center; animation: scaleIn 0.6s ease; }
@keyframes scaleIn { from { transform: scale(0.8); opacity: 0; } to { transform: scale(1); opacity: 1; } }
.fade-enter-active, .fade-leave-active { transition: opacity 0.5s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.d-flex.gap-4 { gap: 1rem; flex-wrap: wrap; }
.v-row > .v-col { display: flex; flex-direction: column; align-items: center; }
.features-card { width: 100%; max-width: 250px; background-color: #2c2c2c !important; border: 1px solid #444; border-radius: 8px; color: #fff !important; }
.v-btn { width: 100%; max-width: 300px; text-align: center; }
.v-btn.button-pulse { white-space: normal; word-break: break-word; }
.objetivo-overlay h2 { font-size: 1.2rem; word-break: break-word; }
.button-group { width: 100%; display: flex; flex-wrap: wrap; justify-content: center; gap: 1rem; }
@media (min-width: 992px) { .button-group { flex-wrap: nowrap; } }
@media (max-width: 768px) { .v-btn { max-width: 100%; font-size: 0.9rem; } .repetitions-card, .features-card { max-width: 100%; margin-bottom: 1rem; } .objetivo-overlay h2 { font-size: 1rem; } }
</style>