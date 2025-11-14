<script setup>
import { ref, onBeforeUnmount, shallowRef, onMounted, computed, watch } from 'vue'
import PoseSkeleton from '../components/PoseSkeleton.vue'
import PoseFeatures from '../components/PoseFeatures.vue'
import axios from 'axios'

// Estado principal
const user = ref(JSON.parse(localStorage.getItem('user')) || {})
const repeticiones = ref(0)
const features = shallowRef(null)
const isPartidaActiva = ref(false)
const isPoseDetectorReady = ref(false)
const ejercicioSeleccionado = ref('Sentadillas')
const intervalRef = ref(null)

// Rutinas de usuario
const userRoutines = ref([])
const selectedRoutineId = ref(null)

// Ejercicios disponibles
const allExercises = [
  'Sentadillas','Flexiones','Abdominales','Burpees','Dominadas','Fondos',
  'Zancadas','Plancha','Jumping Jacks','Mountain Climbers','Curl de Bíceps',
  'Press de Hombros','Peso Muerto','Press de Banca','Remo'
]

const ejerciciosDisponibles = computed(() => {
  if (!selectedRoutineId.value) return allExercises
  const routine = userRoutines.value.find(r => r.id === selectedRoutineId.value)
  return routine ? routine.exercicis.map(ex => ex.nom_exercicis) : allExercises
})

// Detección de Sentadillas
const squatState = ref('up')
const MIN_SQUAT_ANGLE = 120
const MAX_SQUAT_ANGLE = 165

function checkSquatRep(angles) {
  if (!angles.leftKnee || !angles.rightKnee) return
  const avgKneeAngle = (angles.leftKnee + angles.rightKnee) / 2
  if (avgKneeAngle < MIN_SQUAT_ANGLE) {
    if (squatState.value === 'up') squatState.value = 'down'
  } else if (avgKneeAngle > MAX_SQUAT_ANGLE) {
    if (squatState.value === 'down') {
      repeticiones.value++
      squatState.value = 'up'
    }
  }
}

// Detección de Flexiones
const pushupState = ref('up')
const MIN_PUSHUP_ANGLE = 100
const MAX_PUSHUP_ANGLE = 160

function checkPushupRep(angles) {
  if (!angles.leftElbow || !angles.rightElbow) return
  const avgElbowAngle = (angles.leftElbow + angles.rightElbow) / 2
  if (avgElbowAngle < MIN_PUSHUP_ANGLE) {
    if (pushupState.value === 'up') pushupState.value = 'down'
  } else if (avgElbowAngle > MAX_PUSHUP_ANGLE) {
    if (pushupState.value === 'down') {
      repeticiones.value++
      pushupState.value = 'up'
    }
  }
}

// Features de la cámara
function onFeatures(payload) {
  if (payload && !isPoseDetectorReady.value) isPoseDetectorReady.value = true
  features.value = (typeof structuredClone === 'function')
    ? structuredClone(payload)
    : JSON.parse(JSON.stringify(payload))
  if (isPartidaActiva.value && features.value?.angles) {
    if (ejercicioSeleccionado.value === 'Sentadillas') checkSquatRep(features.value.angles)
    else if (ejercicioSeleccionado.value === 'Flexiones') checkPushupRep(features.value.angles)
  }
}

// Partida
function iniciarPartida() {
  if (isPartidaActiva.value) return
  if (!isPoseDetectorReady.value) return
  repeticiones.value = 0
  squatState.value = 'up'
  pushupState.value = 'up'
  isPartidaActiva.value = true
  if (intervalRef.value) { clearInterval(intervalRef.value); intervalRef.value = null }
}

function detenerPartida() {
  isPartidaActiva.value = false
  if (intervalRef.value) { clearInterval(intervalRef.value); intervalRef.value = null }
}

onBeforeUnmount(() => { detenerPartida() })

const loadUserRoutines = async () => {
  const user = JSON.parse(localStorage.getItem('user')) || {};
  const userId = user?.id || user?.userId;

  if (userId) {
    try {
      const response = await axios.get(`http://localhost:9000/api/rutines/user/${userId}`);
      userRoutines.value = response.data.rutines || [];
    } catch (error) {
      console.error('Error al cargar las rutinas del usuario:', error);
      userRoutines.value = [];
    }
  } else {
    // Si no hay usuario, vaciamos las rutinas
    userRoutines.value = [];
  }
};

onMounted(() => {
  loadUserRoutines();

  // Escuchar por si el usuario inicia sesión en la misma pestaña
  window.addEventListener('user-logged-in', loadUserRoutines);
});

onBeforeUnmount(() => {
  // Limpiar el listener al salir del componente
  window.removeEventListener('user-logged-in', loadUserRoutines);
});

// Actualizar ejercicio al cambiar la rutina
watch(selectedRoutineId, (newRoutineId) => {
  if (newRoutineId) {
    const routine = userRoutines.value.find(r => r.id === newRoutineId)
    if (routine && routine.exercicis.length > 0) ejercicioSeleccionado.value = routine.exercicis[0].nom_exercicis
  } else {
    ejercicioSeleccionado.value = 'Sentadillas'
  }
})
</script>

<template>
  <v-app class="app-background">
    <v-main>
      <v-container fluid class="fill-height pa-4 custom-container">
        <v-card elevation="16" class="pa-6 rounded-xl card-elevated card-full-width" dark>
       <v-card-title class="justify-center pb-4 title-card">
  <h2 class="title-text">
    Modo Individual - {{ ejercicioSeleccionado }}
  </h2>
</v-card-title>

          <v-btn color="error" class="mb-4 button-shadow back-button white--text" rounded to="/inicial" block dark>
            <v-icon left class="white--text">mdi-arrow-left</v-icon>
            Volver al Inicio
          </v-btn>

          <v-card-text>
            <v-row dense>
              <!-- Cámara y botones -->
              <v-col cols="12" md="9" class="d-flex flex-column align-center">
                <div class="webcam-container mb-4">
                  <PoseSkeleton class="video-feed" @features="onFeatures" />
                  <div v-if="!isPoseDetectorReady" class="webcam-overlay white--text">
                    <v-progress-circular indeterminate color="primary" />
                    <p class="mt-3">Cargando detector de pose...</p>
                  </div>
                </div>

                <div class="d-flex gap-4 flex-wrap justify-center mb-4">
                  <v-btn color="primary" large rounded class="button-shadow button-pulse white--text" @click="iniciarPartida" :disabled="isPartidaActiva || !isPoseDetectorReady">
                    <v-icon left class="white--text">mdi-run-fast</v-icon>
                    {{ isPoseDetectorReady ? 'Iniciar Partida' : 'Esperando Cámara...' }}
                  </v-btn>

                  <v-btn color="red darken-1" large rounded class="button-shadow button-stop white--text" @click="detenerPartida" :disabled="!isPartidaActiva">
                    <v-icon left class="white--text">mdi-stop</v-icon>
                    Detener Partida
                  </v-btn>
                </div>
              </v-col>

              <!-- Rutinas y info -->
              <v-col cols="12" md="3" class="d-flex flex-column align-center justify-start">
                <v-select
                  v-model="selectedRoutineId"
                  :items="userRoutines"
                  item-title="nom"
                  item-value="id"
                  label="Selecciona una Rutina"
                  outlined dense dark
                  class="mb-4 exercise-select white--text"
                  prepend-inner-icon="mdi-clipboard-list"
                  :disabled="isPartidaActiva"
                  clearable
                />
                <v-select
                  v-model="ejercicioSeleccionado"
                  :items="ejerciciosDisponibles"
                  label="Selecciona Ejercicio"
                  outlined dense dark
                  class="mb-4 exercise-select white--text"
                  prepend-inner-icon="mdi-dumbbell"
                  :disabled="isPartidaActiva"
                />
                <v-card elevation="8" class="pa-6 rounded-lg repetitions-card" dark>
                  <div class="text-h7 font-weight-bold mb-2 white--text">Repeticiones</div>
                  <div class="text-h4 font-weight-black white--text">{{ repeticiones }}</div>
                  <div class="mt-2 text-caption font-weight-bold white--text">Estado: {{ squatState }}</div>
                </v-card>

                <v-card elevation="8" class="pa-4 rounded-lg features-card mt-4" dark>
                  <div class="text-caption font-weight-bold mb-2 text-center text-primary white--text">DATOS DEL SENSOR (Ángulos Clave)</div>
                  <PoseFeatures :features="features" />
                </v-card>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-container>
    </v-main>
  </v-app>
</template>

<style scoped>
.app-background {
  background: linear-gradient(135deg, #121212 0%, #1c1c1c 100%);
  color: #E0E0E0;
  min-height: 100vh;
}
.card-elevated { background-color: #212121 !important; border: 1px solid #333; }
.custom-container { max-width: 1000px !important; margin: 0 auto; }
.card-full-width { width: 100%; max-width: none !important; }
.webcam-container {
  position: relative; width: 100%; padding-top: 56.25%;
  background-color: #1c1c1c; border: 2px dashed #555;
  border-radius: 12px; overflow: hidden;
  box-shadow: 0 8px 25px rgba(0,0,0,0.4);
}
.webcam-overlay {
  position: absolute; top: 0; left: 0; width: 100%; height: 100%;
  background-color: rgba(0,0,0,0.7); display: flex; flex-direction: column;
  align-items: center; justify-content: center; color: white;
  font-size: 1rem; z-index: 10; padding: 0 1rem; text-align: center;
}
.video-feed { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; }
.repetitions-card { width: 100%; max-width: 250px; text-align: center; background-color: #2c2c2c !important; color: #ffffff !important; border: 2px solid #4CAF50; word-break: break-word; }
.features-card { width: 100%; max-width: 250px; background-color: #2c2c2c !important; border: 1px solid #444; color: #ffffff !important; word-break: break-word; }
.exercise-select { width: 100%; max-width: 250px; max-height: 56px; color: #ffffff !important; }
.button-shadow { font-size: 1rem; display: flex; align-items: center; justify-content: center; transition: all 0.25s ease-in-out; text-align: center; flex-wrap: wrap; color: #ffffff !important; }
.back-button { box-shadow: 0 6px 20px 0 rgba(244,67,54,0.45) !important; }
.button-pulse { box-shadow: 0 6px 20px 0 rgba(33,150,243,0.45); }
.button-pulse:not([disabled]):hover { transform: translateY(-3px); box-shadow: 0 10px 30px 0 rgba(33,150,243,0.7); }
.button-stop { background-color: #D32F2F !important; box-shadow: 0 6px 20px 0 rgba(211,47,47,0.45); }
.button-stop:not([disabled]):hover { transform: translateY(-3px); box-shadow: 0 10px 30px 0 rgba(211,47,47,0.7); }
.v-btn--disabled { opacity: 0.5 !important; box-shadow: none !important; }

/* Adaptaciones móviles */
@media (max-width: 768px) {
  .v-row { flex-direction: column !important; }
  .v-col { width: 100% !important; max-width: 100% !important; display: flex; flex-direction: column; align-items: center; }
  .d-flex.gap-4 { flex-wrap: wrap; gap: 0.5rem; justify-content: center; }
  .video-feed, .webcam-container { min-height: 250px; }
  .exercise-select, .repetitions-card, .features-card, .button-shadow { max-width: 100% !important; font-size: 0.9rem; }
  .button-shadow { white-space: normal; word-break: break-word; }
  .webcam-overlay p { font-size: 0.9rem; }
}
.title-card {
  text-align: center;
}

.title-text {
  color: #ffffff; /* texto blanco */
  font-size: 1.5rem;
  font-weight: bold;
  white-space: normal; /* permite que se rompa en varias líneas */
  word-break: break-word;
}

/* Ajustes para móviles */
@media (max-width: 768px) {
  .title-text {
    font-size: 1.2rem; /* más pequeño para pantallas pequeñas */
  }
}

</style>
