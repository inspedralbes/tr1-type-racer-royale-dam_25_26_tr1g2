<script setup>
import { ref, onBeforeUnmount, shallowRef, onMounted, computed, watch, reactive } from 'vue'
import PoseSkeleton from '../components/PoseSkeleton.vue'
import PoseFeatures from '../components/PoseFeatures.vue'
import apiClient from '@/plugins/axios.js'
// 1. Importar todas las funciones de detección, incluyendo la de la plancha
import {
  checkSquatRep,
  checkPushupRep,
  checkLungeRep,
  checkSitupRep,
  checkJumpingJacksRep,
  checkMountainClimbersRep,
  checkBicepCurlRep,
  checkShoulderPressRep,
  checkDipsRep,
  checkPlankPose
} from '@/utils/exercise-detection.js'

// --- ESTADO PRINCIPAL ---
const user = ref(JSON.parse(localStorage.getItem('user')) || {})
const repeticiones = ref(0)
const features = shallowRef(null)
const isPartidaActiva = ref(false)
const isPoseDetectorReady = ref(false)
const ejercicioSeleccionado = ref('Sentadillas')
const maxReps = ref(10)
const plankTimer = ref(null) // Temporizador para la plancha
const panelAbierto = ref([])

// --- NUEVO ESTADO PARA UI ---
const isCountingDown = ref(false)
const countdownValue = ref(10)
const countdownTimer = ref(null)
const isGoalReached = ref(false)

const userRoutines = ref([])
const selectedRoutineId = ref(null)

// --- LISTA DE EJERCICIOS ---
const allExercises = [
  'Sentadillas', 'Flexiones', 'Abdominales', 'Burpees', 'Dominadas', 'Fondos',
  'Zancadas', 'Plancha', 'Jumping Jacks', 'Mountain Climbers', 'Curl de Bíceps',
  'Press de Hombros', 'Peso Muerto', 'Press de Banca', 'Remo'
]

const ejerciciosDisponibles = computed(() => {
  if (!selectedRoutineId.value) return allExercises
  const routine = userRoutines.value.find(r => r.id === selectedRoutineId.value)
  return routine ? routine.exercicis.map(ex => ex.nom_exercicis) : allExercises
})

// 2. Añadir el estado para la Plancha
const exerciseStates = reactive({
  'Sentadillas': 'up',
  'Flexiones': 'up',
  'Zancadas': 'up',
  'Abdominales': 'up',
  'Jumping Jacks': 'down',
  'Mountain Climbers': 'center',
  'Curl de Bíceps': 'up',
  'Press de Hombros': 'up',
  'Fondos': 'up',
  'Plancha': 'incorrect'
})

// --- GESTIÓN DE PARTIDA ---
function onFeatures(payload) {
  if (payload && !isPoseDetectorReady.value) isPoseDetectorReady.value = true
  features.value = (typeof structuredClone === 'function') ? structuredClone(payload) : JSON.parse(JSON.stringify(payload))

  if (isPartidaActiva.value && features.value) {
    const selected = ejercicioSeleccionado.value
    const angles = features.value.angles

    // 3. Lógica especial para la Plancha (basada en tiempo)
    if (selected === 'Plancha') {
      if (angles && checkPlankPose(angles)) {
        exerciseStates.Plancha = 'correct';
        if (plankTimer.value === null) {
          plankTimer.value = setInterval(() => {
            repeticiones.value++;
            if (repeticiones.value >= maxReps.value) {
              isGoalReached.value = true;
              detenerPartida();
            }
          }, 1000);
        }
      } else {
        exerciseStates.Plancha = 'incorrect';
        if (plankTimer.value !== null) {
          clearInterval(plankTimer.value);
          plankTimer.value = null;
        }
      }
      return; // Finaliza aquí para la plancha
    }

    // Lógica para ejercicios basados en repeticiones
    let result = { newState: exerciseStates[selected], repCompleted: false };
    switch (selected) {
      case 'Sentadillas':
        if (angles) result = checkSquatRep(angles, exerciseStates.Sentadillas);
        break;
      case 'Flexiones':
        if (angles) result = checkPushupRep(angles, exerciseStates.Flexiones);
        break;
      case 'Zancadas':
        if (angles) result = checkLungeRep(angles, exerciseStates.Zancadas);
        break;
      case 'Abdominales':
        if (angles) result = checkSitupRep(angles, exerciseStates.Abdominales);
        break;
      case 'Jumping Jacks':
        result = checkJumpingJacksRep(features.value, exerciseStates['Jumping Jacks']);
        break;
      case 'Mountain Climbers':
        if (angles) result = checkMountainClimbersRep(angles, exerciseStates['Mountain Climbers']);
        break;
      case 'Curl de Bíceps':
        if (angles) result = checkBicepCurlRep(angles, exerciseStates['Curl de Bíceps']);
        break;
      case 'Press de Hombros':
        if (angles) result = checkShoulderPressRep(angles, exerciseStates['Press de Hombros']);
        break;
      case 'Fondos':
        if (angles) result = checkDipsRep(angles, exerciseStates['Fondos']);
        break;
    }

    if (result && result.newState) {
      exerciseStates[selected] = result.newState;
    }
    if (result && result.repCompleted) {
      repeticiones.value++;
      if (repeticiones.value >= maxReps.value) {
        isGoalReached.value = true;
        detenerPartida();
      }
    }
  }
}

function iniciarPartida() {
  if (isPartidaActiva.value || isCountingDown.value) return
  if (!isPoseDetectorReady.value) { console.error('Detector no listo'); return }

  detenerPartida();
  repeticiones.value = 0;
  isGoalReached.value = false;
  isCountingDown.value = true;
  countdownValue.value = 10;

  Object.keys(exerciseStates).forEach(key => {
      if (key === 'Jumping Jacks') exerciseStates[key] = 'down';
      else if (key === 'Mountain Climbers') exerciseStates[key] = 'center';
      else if (key === 'Plancha') exerciseStates[key] = 'incorrect';
      else exerciseStates[key] = 'up';
  });

  countdownTimer.value = setInterval(() => {
    countdownValue.value--;
    if (countdownValue.value === 0) {
      clearInterval(countdownTimer.value);
      countdownTimer.value = null;
      isCountingDown.value = false;
      isPartidaActiva.value = true;
    }
  }, 1000);
}

function detenerPartida() {
  isPartidaActiva.value = false
  if (plankTimer.value !== null) {
    clearInterval(plankTimer.value);
    plankTimer.value = null;
  }
  if (countdownTimer.value !== null) {
    clearInterval(countdownTimer.value);
    countdownTimer.value = null;
    isCountingDown.value = false;
  }
}

onBeforeUnmount(() => { detenerPartida() })

// --- RUTINAS DE USUARIO ---
const loadUserRoutines = async () => {
  const userData = JSON.parse(localStorage.getItem('user')) || {}
  const userId = userData?.id || userData?.userId
  if (userId) {
    try {
      const resp = await apiClient.get(`/rutines/user/${userId}`)
      userRoutines.value = resp.data.rutines || []
    } catch (e) { console.error(e); userRoutines.value = [] }
  } else userRoutines.value = []
}

onMounted(() => {
  loadUserRoutines()
  window.addEventListener('user-logged-in', loadUserRoutines)
})
onBeforeUnmount(() => window.removeEventListener('user-logged-in', loadUserRoutines))

watch(selectedRoutineId, (newId) => {
  if (newId) {
    const routine = userRoutines.value.find(r => r.id === newId)
    if (routine && routine.exercicis.length > 0) ejercicioSeleccionado.value = routine.exercicis[0].nom_exercicis
  } else ejercicioSeleccionado.value = 'Sentadillas'
})
</script>

<template>
  <v-app class="app-background">
    <v-main>
      <v-container fluid class="pa-4 custom-container">
        <v-card elevation="16" class="pa-6 rounded-xl card-elevated card-full-width" dark>
          <v-card-title class="justify-center pb-4">
            <h2 class="text-h5 font-weight-black">Modo- {{ ejercicioSeleccionado }}</h2>
          </v-card-title>

          <v-btn color="error" class="mb-4 button-shadow back-button" rounded to="/inicial" elevation="2" block dark>
            <v-icon left>mdi-arrow-left</v-icon>Volver al Inicio
          </v-btn>

          <v-card-text>
            <v-row dense>
             <!-- CÁMARA -->
<v-col cols="12" md="9" class="d-flex flex-column align-center">
  <div class="webcam-container mb-4">
    <PoseSkeleton class="video-feed" @features="onFeatures"/>
    
    <!-- Overlay de espera -->
    <div v-if="!isPoseDetectorReady" class="webcam-overlay">
      <v-progress-circular indeterminate color="primary"/>
      <p class="mt-3">Cargando detector de pose...</p>
    </div>

    <!-- Overlay de Cuenta Atrás -->
    <div v-if="isCountingDown" class="webcam-overlay countdown-overlay">
      <h2 class="text-h2 font-weight-black">PREPÁRATE</h2>
      <h1 class="text-h1 font-weight-black mt-4">{{ countdownValue }}</h1>
    </div>

    <!-- Overlay de Objetivo Cumplido -->
    <div v-if="isGoalReached" class="webcam-overlay goal-overlay">
      <v-icon size="80" color="amber">mdi-trophy-variant</v-icon>
      <h2 class="text-h2 font-weight-black mt-4">¡Objetivo Cumplido!</h2>
    </div>
  </div>
  
  <div class="d-flex gap-4">
    <v-btn color="primary" large rounded class="button-shadow button-pulse" @click="iniciarPartida" :disabled="isPartidaActiva || isCountingDown || !isPoseDetectorReady">
      <v-icon left>mdi-run-fast</v-icon>
      {{ isPoseDetectorReady ? 'Iniciar Partida' : 'Esperando Cámara...' }}
    </v-btn>
    <v-btn color="red darken-1" large rounded class="button-shadow button-stop" @click="detenerPartida" :disabled="!isPartidaActiva && !isCountingDown">
      <v-icon left>mdi-stop</v-icon>Detener Partida
    </v-btn>
  </div>
</v-col>

<!-- EJERCICIO + RUTINA -->
<v-col cols="12" md="3" class="d-flex flex-column align-center justify-start">
  <!-- Selección de rutina -->
  <v-select v-model="selectedRoutineId" :items="userRoutines" item-title="nom" item-value="id" label="Selecciona una Rutina" outlined dense dark class="mb-4 exercise-select" prepend-inner-icon="mdi-clipboard-list" :disabled="isPartidaActiva || isCountingDown" clearable/>

  <!-- Selección de ejercicio -->
  <v-select v-model="ejercicioSeleccionado" :items="ejerciciosDisponibles" label="Selecciona Ejercicio" outlined dense dark class="mb-4 exercise-select" prepend-inner-icon="mdi-dumbbell" :disabled="isPartidaActiva || isCountingDown"/>

  <!-- Máx. repeticiones -->
  <v-text-field v-model.number="maxReps" :label="ejercicioSeleccionado === 'Plancha' ? 'Objetivo (segundos)' : 'Máx. repeticiones'" type="number" min="1" outlined dense dark class="mb-4 exercise-select" prepend-inner-icon="mdi-counter" :disabled="isPartidaActiva || isCountingDown"/>

  <!-- Repeticiones -->
  <v-card elevation="8" class="pa-6 rounded-lg repetitions-card" dark>
    <div class="text-h7 font-weight-bold mb-2">{{ ejercicioSeleccionado === 'Plancha' ? 'Tiempo' : 'Repeticiones' }}</div>
    <div class="text-h4 font-weight-black">{{ repeticiones }}</div>
    <div class="mt-2 text-caption font-weight-bold">
      Estado: 
      <!-- Corregido para mostrar el estado del ejercicio actual -->
      <span>{{ exerciseStates[ejercicioSeleccionado] }}</span>
    </div>
  </v-card>

  <!-- Datos de pose con desplegable -->
  <v-expansion-panels v-model="panelAbierto" flat class="features-card mt-4" multiple>
    <v-expansion-panel>
      <v-expansion-panel-title class="text-caption font-weight-bold text-center text-primary">
        DATOS DEL SENSOR (Ángulos Clave)
      </v-expansion-panel-title>
      <v-expansion-panel-text>
        <PoseFeatures :features="features"/>
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
/* --- ESTILOS GENERALES (BASE) --- */
.app-background { 
  background: linear-gradient(135deg, #121212 0%, #1c1c1c 100%); 
  color: #E0E0E0; 
  min-height: 100vh; /* Cambiado a min-height para evitar cortes en scroll */
}

.card-elevated { 
  background-color: #212121 !important; 
  border: 1px solid #333; 
}

.custom-container { 
  max-width: 1200px !important; /* Ajustado para dar aire en escritorio */
}

.card-full-width { 
  width: 100%; 
  max-width: none !important; 
}

/* --- CONTENEDOR DE LA CÁMARA (Estilo Escritorio por defecto) --- */
.webcam-container {
  position: relative;
  width: 100%; /* O el % que prefieras */
  max-width: 580px; /* Un ancho máximo razonable */
  aspect-ratio: 4/3; /* FUERZA la forma de TV antigua (webcam estándar) */
  /* min-height: 400px;  <-- BORRA ESTA LÍNEA si usas aspect-ratio */
  background-color: #000; /* Fondo negro por si acaso carga lento */
  border: 2px dashed #555;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 8px 25px rgba(0,0,0,0.4);
  margin: 0 auto; /* Para centrarlo */
}

.video-feed {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* --- OVERLAYS (Capas encima del video) --- */
.webcam-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  background-color: rgba(0,0,0,0.7);
  z-index: 10;
  color: white;
  text-align: center;
}

.countdown-overlay {
  background-color: rgba(0, 0, 0, 0.8);
  z-index: 20;
}

.goal-overlay {
  background: radial-gradient(ellipse at center, rgba(0, 195, 255, 0.85) 0%, rgba(0, 167, 239, 0.95) 100%);
  z-index: 20;
  animation: goal-animation 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.goal-overlay h2 {
  text-shadow: 0px 3px 10px rgba(0, 0, 0, 0.6);
}

@keyframes goal-animation {
  from { opacity: 0; transform: scale(0.8); }
  to { opacity: 1; transform: scale(1); }
}

/* --- CONTROLES LATERALES (Inputs, Tarjetas) --- */
/* Por defecto en escritorio tienen ancho limitado */
.exercise-select,
.repetitions-card,
.features-card {
  width: 100%;
  max-width: 250px; /* Tu configuración actual de escritorio */
}

.repetitions-card {
  text-align: center;
  background-color: #2c2c2c !important;
  color: #4CAF50 !important;
  border: 2px solid #4CAF50;
}

.features-card {
  background-color: #2c2c2c !important;
  border: 1px solid #444;
}

/* --- BOTONES --- */
.button-shadow {
  font-size: 1.2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.25s ease-in-out;
}

.back-button { box-shadow: 0 6px 20px 0 rgba(244,67,54,0.45) !important; }
.button-pulse { box-shadow: 0 6px 20px 0 rgba(33,150,243,0.45); }
.button-stop { background-color: #D32F2F !important; box-shadow: 0 6px 20px 0 rgba(211,47,47,0.45); }

.button-pulse:not([disabled]):hover { transform: translateY(-3px); box-shadow: 0 10px 30px 0 rgba(33,150,243,0.7); }
.button-stop:not([disabled]):hover { transform: translateY(-3px); box-shadow: 0 10px 30px 0 rgba(211,47,47,0.7); }

.v-btn--disabled { opacity: 0.5 !important; box-shadow: none !important; }

/* ========================================================================== */
/* AQUÍ ESTÁ LA MAGIA RESPONSIVE PARA MÓVIL                                  */
/* ========================================================================== */
@media (max-width: 960px) {
  /* 1. La cámara ocupa todo el ancho disponible en móvil */
  .webcam-container {
    width: 100% !important;
    min-height: 200px; /* Un poco menos alto en móvil */
    margin-bottom: 20px;
  }

  /* 2. Los controles (inputs, tarjetas) ocupan todo el ancho, no solo 250px */
  .exercise-select,
  .repetitions-card,
  .features-card {
    max-width: 100% !important;
  }

  /* 3. Ajuste de fuentes grandes para que no rompan la pantalla */
  .text-h1 { font-size: 4rem !important; }
  .text-h2 { font-size: 2.5rem !important; }

  /* 4. Los botones de Iniciar/Parar se apilan verticalmente si falta espacio */
  .d-flex.gap-4 {
    flex-direction: column;
    width: 100%;
    gap: 16px !important; /* Espacio entre botones */
  }

  .button-shadow {
    width: 100%; /* Botones ancho completo para pulsar fácil con el dedo */
    margin: 0 !important;
  }
  
  /* 5. Ajustes de padding en la tarjeta principal */
  .card-elevated {
    padding: 16px !important;
  }
}
</style>
