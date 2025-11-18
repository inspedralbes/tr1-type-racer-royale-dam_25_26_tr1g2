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
const userId = ref(null); // S'inicialitza a null i s'obté a onMounted

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
// Nom de l'exercici en català
const ejercicioSeleccionado = ref('Sentadilles') 
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
    return 'Mínim 2 jugadors';
  }
  if (!todosListos.value) {
    const faltan = jugadores.value.filter(j => !j.ready).length;
    // Corregit: 'Esperant a X jugador(s)'
    return `Esperant a ${faltan} jugador(s)`; 
  }
  return 'Iniciar Partida';
});


function onFeatures(payload) {
  if (payload && !isPoseDetectorReady.value) isPoseDetectorReady.value = true;
  features.value = (typeof structuredClone === 'function') 
    ? structuredClone(payload) 
    : JSON.parse(JSON.stringify(payload || {}));

  if (!isPartidaActiva.value || !features.value?.angles) return;

  // Exercicis traduïts al català
  const exerciseHandlers = {
    'Sentadilles': { detect: checkSquatRep, state: squatState },
    'Flexions': { detect: checkPushupRep, state: pushupState },
    'Abdominals': { detect: checkSitupRep, state: situpState },
    'Zancades': { detect: checkLungeRep, state: lungeState }, // Zancadas -> Fetes
    'Salts de Tisora': { detect: checkJumpingJacksRep, state: jumpingJacksState }, // Jumping Jacks -> Salts de Tisora
    'Escaladors': { detect: checkMountainClimbersRep, state: mountainClimbersState } // Mountain Climbers -> Escaladors
  };

  const handler = exerciseHandlers[ejercicioSeleccionado.value];
  const jugador = jugadores.value.find(j => j.id == userId.value);

  if (handler && jugador) {
    const currentState = handler.state.value[userId.value] || (ejercicioSeleccionado.value === 'Salts de Tisora' ? 'down' : 'up');
    const detectionInput = ejercicioSeleccionado.value === 'Salts de Tisora' ? features.value : features.value.angles;
    const result = handler.detect(detectionInput, currentState);

    // Actualitzem l'estat de l'exercici per a aquest jugador
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
    await axios.post('http://localhost:9000/api/sessions/start', { codigo: salaId.value });
  } catch (error) {
    console.error("Error al iniciar la partida:", error);
    // Traduït: "No es va poder iniciar la partida."
    alert("No es va poder iniciar la partida."); 
  }
}

function detenerPartida() {
  isPartidaActiva.value = false;
}

onMounted(() => {
  userId.value = obtenerUsuarioId();

  if (!salaId.value || !userId.value) {
    // Traduït: "No s'ha especificat una sala o no has iniciat sessió."
    alert("No s'ha especificat una sala o no has iniciat sessió."); 
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
        // El model Sequelize usa 'usuari', no 'username'
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
        // Actualitzar també la configuració de la sala
        if (data.ejercicio) ejercicioSeleccionado.value = data.ejercicio;
        if (data.maxReps) maxReps.value = data.maxReps;

        break;
      case 'SESSION_STARTED':
        isPartidaActiva.value = true;
        mostrarMensajeObjetivo.value = false;
        ganador.value = null;
        // Reiniciar estats d'exercicis per a tots els jugadors
        squatState.value = {};
        pushupState.value = {};
        situpState.value = {};
        lungeState.value = {};
        jumpingJacksState.value = {};
        mountainClimbersState.value = {};
        jugadores.value.forEach(j => j.repeticiones = 0);
        break;
      case 'JOIN_ERROR':
        // Traduït: "Error en unir-se:"
        alert(`Error en unir-se: ${data.message}`); 
        router.push('/unirsala');
        break;
      case 'SETTINGS_UPDATED':
        // El servidor ens informa de la nova configuració
        if (data.ejercicio) ejercicioSeleccionado.value = data.ejercicio;
        if (data.maxReps) maxReps.value = data.maxReps;
        break;
      case 'LEADER_LEFT':
        // Traduït: "El líder ha abandonat la sala. Seràs redirigit."
        alert(data.message || 'El líder ha abandonat la sala. Seràs redirigit.'); 
        detenerPartida();
        router.push('/inicial');
        break;
      case 'PLAYER_WINS':
        ganador.value = data.winnerName || 'Un jugador';
        mostrarMensajeObjetivo.value = true;
        isPartidaActiva.value = false;
        // Opcional: afegir un timeout per a poder tornar a jugar
        break;
    }
  };

  ws.value.onclose = () => isConnected.value = false;
  // Traduït: "Error de connexió amb el servidor de joc."
  ws.value.onerror = () => alert("Error de connexió amb el servidor de joc."); 
});

onBeforeUnmount(() => {
  detenerPartida();
  if (ws.value) ws.value.close();
})

// Observar canvis en la configuració per enviar-los al servidor si ets el creador
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
              Mode Multijugador - {{ ejercicioSeleccionado }}
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
            Tornar a l'Inici
          </v-btn>
          
          <div class="text-center mb-4">
            <v-chip small :color="isConnected ? 'green' : 'red'">
              {{ isConnected ? 'CONNECTAT' : 'DESCONNECTAT' }}
            </v-chip>
            <v-chip small class="ml-2">Sala: {{ salaId }}</v-chip>
          </div>

          <v-card-text>
            <v-row align="start">
              <v-col cols="12" md="8" class="d-flex flex-column align-center">
                <div class="webcam-container mb-4">
                  <PoseSkeleton class="video-feed" @features="onFeatures" />

                  <div v-if="!isPoseDetectorReady" class="webcam-overlay">
                    <v-progress-circular indeterminate color="primary"></v-progress-circular>
                    <p class="mt-3">Carregant detector de pose...</p>
                  </div>

                  <transition name="fade">
                    <div v-if="mostrarMensajeObjetivo" class="objetivo-overlay">
                      <v-icon size="64" color="amber lighten-1">mdi-trophy</v-icon>
                      <h2 class="mt-3 text-h5 font-weight-black text-amber-lighten-2">
                        Objectiu aconseguit! Guanyador: {{ ganador }}
                      </h2>
                    </div>
                  </transition>
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
                    Aturar
                  </v-btn>
                </div>
              </v-col>

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
                      Estat: 
                      <span v-if="ejercicioSeleccionado === 'Sentadilles'">{{ squatState[jugador.id] }}</span>
                      <span v-else-if="ejercicioSeleccionado === 'Flexions'">{{ pushupState[jugador.id] }}</span>
                      <span v-else>Llest</span> 
                  </div>

                  <v-btn
                    v-if="!jugador.ready && !isPartidaActiva && String(jugador.id) === String(userId)"
                    color="green"
                    block
                    rounded
                    @click="marcarListo"
                  >
                    <v-icon left>mdi-check</v-icon>
                    Estic llest
                  </v-btn>

                  <v-chip
                    v-else-if="jugador.ready && !isPartidaActiva"
                    color="green"
                    text-color="white"
                    block
                    class="mt-2"
                  >
                    ✅ Llest
                  </v-chip>
                  
                  <v-chip
                    v-else-if="isPartidaActiva"
                    :color="jugador.repeticiones >= maxReps ? 'amber' : 'primary'"
                    text-color="white"
                    block
                    class="mt-2"
                  >
                    {{ jugador.repeticiones >= maxReps ? '¡META!' : 'COMPETINT...' }}
                  </v-chip>
                  
                </v-card>

                <v-select
                  v-model="ejercicioSeleccionado"
                  :items="['Sentadilles','Flexions','Abdominals', 'Zancades', 'Salts de Tisora', 'Escaladors']" 
                  label="Exercici"
                  outlined
                  dense
                  dark
                  class="mb-4"
                  :disabled="isPartidaActiva || !esCreador"
                ></v-select>

                <div class="d-flex flex-column w-100 mb-4">
                  <v-slider
                    v-model="maxReps"
                    label="Repeticions objectiu" 
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
                    label="Repeticions" 
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
                      DADES DEL SENSOR (Angles Clau)
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
/* ... dins de <style scoped> */
.v-btn.button-pulse { 
  white-space: normal; /* Permet que el text salti de línia */
  word-break: break-word; /* Trenca paraules llargues si és necessari */
  line-height: 1.2; /* Ajusta l'altura de línia si el text salta */
  height: auto !important; /* Permet que el botó creixi en altura */
  min-height: 50px; /* Assegura una altura mínima si és necessari */
}.objetivo-overlay h2 { font-size: 1.2rem; word-break: break-word; }
.button-group { width: 100%; display: flex; flex-wrap: wrap; justify-content: center; gap: 1rem; }
@media (min-width: 992px) { .button-group { flex-wrap: nowrap; } }
@media (max-width: 768px) { .v-btn { max-width: 100%; font-size: 0.9rem; } .repetitions-card, .features-card { max-width: 100%; margin-bottom: 1rem; } .objetivo-overlay h2 { font-size: 1rem; } }
</style>