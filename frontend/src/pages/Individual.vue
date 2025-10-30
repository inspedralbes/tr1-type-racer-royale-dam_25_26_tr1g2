<<<<<<< HEAD
<script setup>
import { ref, onMounted, onBeforeUnmount, shallowRef } from 'vue'
import PoseSkeleton from '../components/PoseSkeleton.vue'
import PoseFeatures from '../components/PoseFeatures.vue'

// [VARIABLES DE ESTADO]
const repeticiones = ref(0)
const features = shallowRef(null)
const isPartidaActiva = ref(false)
const isPoseDetectorReady = ref(false) // NUEVO: Para saber si la cámara y el tensor están activos
const ejercicioSeleccionado = ref('Sentadillas') 
const intervalRef = ref(null) 

const ejercicios = [ 
  'Sentadillas', 
  'Flexiones', 
  'Abdominales', 
  'Burpees', 
  'Dominadas', 
  'Fondos', 
  'Zancadas', 
  'Plancha', 
  'Jumping Jacks', 
  'Mountain Climbers',
  'Curl de Bíceps', 
  'Press de Hombros', 
  'Peso Muerto', 
  'Press de Banca', 
  'Remo'
]

// --- LÓGICA DE DETECCIÓN DE SENTADILLAS (SQUATS) ---
const squatState = ref('up')

// UMBRALES MÁS PERMISIVOS: 
// La mayoría de la gente no baja a 100 grados. 120 es un buen punto de partida para una sentadilla paralela.
const MIN_SQUAT_ANGLE = 120 // Ángulo en rodillas para contar como abajo (flexionado)
const MAX_SQUAT_ANGLE = 165 // Ángulo en rodillas para contar como arriba (casi extendido)

function checkSquatRep(angles) {
    if (!angles.leftKnee || !angles.rightKnee) return

    const avgKneeAngle = (angles.leftKnee + angles.rightKnee) / 2
    
    // 1. Detección de posición BAJA (Down)
    if (avgKneeAngle < MIN_SQUAT_ANGLE) {
        if (squatState.value === 'up') {
            squatState.value = 'down'
            // console.log("Estado: DOWN") // Puedes descomentar para depurar
        }
    } 
    
    // 2. Detección de posición ALTA (Up) -> ¡Suma la repetición!
    else if (avgKneeAngle > MAX_SQUAT_ANGLE) {
        if (squatState.value === 'down') {
            repeticiones.value++
            squatState.value = 'up'
            // console.log("¡REPETICIÓN CONTADA! Estado: UP") // Puedes descomentar para depurar
        }
    }
}

// --- LÓGICA DE DETECCIÓN DE FLEXIONES (PUSH-UPS) ---
const pushupState = ref('up')
const MIN_PUSHUP_ANGLE = 100 
const MAX_PUSHUP_ANGLE = 160 

function checkPushupRep(angles) {
    if (!angles.leftElbow || !angles.rightElbow) return
    
    const avgElbowAngle = (angles.leftElbow + angles.rightElbow) / 2
    
    // Detección de posición BAJA (Codo flexionado)
    if (avgElbowAngle < MIN_PUSHUP_ANGLE) {
        if (pushupState.value === 'up') {
            pushupState.value = 'down'
        }
    } 
    
    // Detección de posición ALTA (Codo extendido) -> ¡Suma la repetición!
    else if (avgElbowAngle > MAX_PUSHUP_ANGLE) {
        if (pushupState.value === 'down') {
            repeticiones.value++ 
            pushupState.value = 'up'
        }
    }
}


// --- GESTIÓN DE LA PARTIDA Y FEATURES ---

function onFeatures(payload) {
    // Si se recibe el primer set de features, el detector está listo
    if (payload && !isPoseDetectorReady.value) {
        isPoseDetectorReady.value = true
    }

    // Actualiza las features para el componente PoseFeatures
    features.value = (typeof structuredClone === 'function')
      ? structuredClone(payload)
      : JSON.parse(JSON.stringify(payload))
    
    // LÓGICA DE CONTEO EN FUNCIÓN DEL EJERCICIO SELECCIONADO
    if (isPartidaActiva.value && features.value?.angles) {
        const selected = ejercicioSeleccionado.value
        
        if (selected === 'Sentadillas') {
            checkSquatRep(features.value.angles)
        } else if (selected === 'Flexiones') {
            checkPushupRep(features.value.angles)
        }
        // Aquí se añadiría la lógica para Abdominales, etc.
    }
}

function iniciarPartida() {
    if (isPartidaActiva.value) return 
    if (!isPoseDetectorReady.value) {
        console.error("El detector de pose no está listo. Espera a que la cámara se active.")
        return
    }

    repeticiones.value = 0
    squatState.value = 'up' 
    pushupState.value = 'up'
    isPartidaActiva.value = true
    
    if (intervalRef.value) clearInterval(intervalRef.value)
    intervalRef.value = null
}

function detenerPartida() {
    isPartidaActiva.value = false
    if (intervalRef.value) clearInterval(intervalRef.value)
    intervalRef.value = null
}

onBeforeUnmount(() => {
    detenerPartida()
})
</script>

<template>
  <v-app class="app-background">
    <v-main>
      <v-container fluid class="fill-height pa-4 custom-container">
        <v-card elevation="16" class="pa-6 rounded-xl card-elevated card-full-width" dark>
          <v-card-title class="justify-center pb-4">
            <h2 class="text-h5 font-weight-black">Modo Individual - {{ ejercicioSeleccionado }}</h2>
          </v-card-title>

          <!-- Botón Volver al Inicio -->
          <v-btn
            color="error"
            class="mb-4 button-shadow back-button"
            rounded
            to="/inicial"
            elevation="2"
            block
            dark
          >
            <v-icon left>mdi-arrow-left</v-icon>
            Volver al Inicio
          </v-btn>
          
          <v-card-text>
            <v-row dense>
              
              <!-- Recuadro de la webcam (TensorFlow) -->
              <v-col cols="12" md="9" class="d-flex flex-column align-center">
                <div class="webcam-container mb-4">
                  <PoseSkeleton class="video-feed" @features="onFeatures" />
                  
                  <!-- Indicador de Espera -->
                  <div 
                    v-if="!isPoseDetectorReady" 
                    class="webcam-overlay"
                  >
                    <v-progress-circular indeterminate color="primary"></v-progress-circular>
                    <p class="mt-3">Cargando detector de pose...</p>
                  </div>
                </div>
                
                <!-- Controles de la Partida -->
                <div class="d-flex gap-4">
                  <v-btn
                    color="primary"
                    large
                    rounded
                    class="button-shadow button-pulse"
                    @click="iniciarPartida"
                    :disabled="isPartidaActiva || !isPoseDetectorReady"
                  >
                    <v-icon left>mdi-run-fast</v-icon>
                    {{ isPoseDetectorReady ? 'Iniciar Partida' : 'Esperando Cámara...' }}
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
                    Detener Partida
                  </v-btn>
                </div>
              </v-col>

              <!-- Recuadro de repeticiones y datos de pose -->
              <v-col cols="12" md="3" class="d-flex flex-column align-center justify-start">
                
                <!-- Select de ejercicios -->
                <v-select
                  v-model="ejercicioSeleccionado"
                  :items="ejercicios"
                  label="Selecciona Ejercicio"
                  outlined
                  dense
                  dark
                  class="mb-4 exercise-select"
                  prepend-inner-icon="mdi-dumbbell"
                  :disabled="isPartidaActiva"
                ></v-select>
                
                <!-- Repeticiones Card -->
                <v-card elevation="8" class="pa-6 rounded-lg repetitions-card" dark>
                  <div class="text-h7 font-weight-bold mb-2">Repeticiones</div>
                  <div class="text-h4 font-weight-black">{{ repeticiones }}</div>
                  <div class="mt-2 text-caption font-weight-bold">
                    Estado: {{ squatState }}
                  </div>
                </v-card>
                
                <!-- Datos de Pose (PoseFeatures) -->
                <v-card elevation="8" class="pa-4 rounded-lg features-card mt-4" dark>
                    <div class="text-caption font-weight-bold mb-2 text-center text-primary">DATOS DEL SENSOR (Ángulos Clave)</div>
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
  height: 100vh;
}

.card-elevated {
  background-color: #212121 !important;
  border: 1px solid #333;
}

.custom-container {
  max-width: 1000px !important; 
}

.card-full-width {
  width: 100%;
  max-width: none !important;
}

.webcam-container {
  position: relative;
  width: 100%;
  padding-top: 56.25%; 
  background-color: #1c1c1c;
  border: 2px dashed #555;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.4);
}

.webcam-overlay {
=======
<template>
    <v-app dark class="app-background">
      <v-main>
        <v-container fluid class="fill-height pa-4 custom-container">
          <v-card elevation="16" class="pa-6 rounded-xl card-elevated card-full-width" dark>
            <v-card-title class="justify-center pb-4">
              <h2 class="text-h5 font-weight-black">Modo Individual</h2>
            </v-card-title>

            <v-btn
              color="error"
              class="mb-4 button-shadow"
              rounded
              to="/inicial"
              elevation="2"
              block
            >
              <v-icon left>mdi-arrow-left</v-icon>
              Volver al Inicio
            </v-btn>
  
            <v-card-text>
                <v-row dense>
  <!-- Recuadro de la webcam -->
  <v-col cols="12" md="9" class="d-flex flex-column align-center">
  <div class="webcam-container mb-4">
    <video ref="video" autoplay muted playsinline class="video-feed"></video>
  </div>
  <div class="d-flex gap-4">
    <v-btn
      color="primary"
      large
      rounded
      class="button-shadow"
      @click="iniciarPartida"
    >
      <v-icon left>mdi-run-fast</v-icon>
      Iniciar Partida
    </v-btn>

    <v-btn
      color="red darken-1"
      large
      rounded
      class="button-shadow"
      @click="detenerPartida"
    >
      <v-icon left>mdi-stop</v-icon>
      Detener Partida
    </v-btn>
  </div>
</v-col>

  
  <!-- Recuadro de repeticiones -->
  <v-col cols="12" md="3" class="d-flex flex-column align-center justify-center">
    <!-- Select de ejercicios -->
    <v-select
      v-model="ejercicioSeleccionado"
      :items="ejercicios"
      label="Selecciona Ejercicio"
      outlined
      dense
      dark
      class="mb-4 exercise-select"
      prepend-inner-icon="mdi-dumbbell"
    ></v-select>
    
    <v-card elevation="8" class="pa-6 rounded-lg repetitions-card" dark>
      <div class="text-h7 font-weight-bold mb-2">Repeticiones</div>
      <div class="text-h4 font-weight-black">{{ repeticiones }}</div>
    </v-card>
  </v-col>
</v-row>
            </v-card-text>
          </v-card>
        </v-container>
      </v-main>
    </v-app>
  </template>
  
  <script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

const repeticiones = ref(0)
const video = ref(null)
const ejercicioSeleccionado = ref('Flexiones')
const intervalRef = ref(null)
let stream = null // guardamos el stream de la webcam

const ejercicios = [
  'Flexiones','Sentadillas','Abdominales','Burpees','Dominadas',
  'Fondos','Zancadas','Plancha','Jumping Jacks','Mountain Climbers',
  'Curl de Bíceps','Press de Hombros','Peso Muerto','Press de Banca','Remo'
]

// Inicia la partida
function iniciarPartida() {
  repeticiones.value = 0
  if (intervalRef.value) clearInterval(intervalRef.value)
  intervalRef.value = setInterval(() => {
    repeticiones.value++
  }, 1000)

  // Activar la webcam
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      .then((s) => {
        stream = s
        if (video.value) video.value.srcObject = stream
      })
      .catch((err) => {
        console.error("No se pudo acceder a la webcam:", err)
      })
  }
}

// Detiene la partida y la webcam
function detenerPartida() {
  if (intervalRef.value) {
    clearInterval(intervalRef.value)
    intervalRef.value = null
  }

  // Detener la webcam
  if (stream) {
    stream.getTracks().forEach(track => track.stop())
    stream = null
  }
}

// Limpiar la webcam si se desmonta el componente
onBeforeUnmount(() => {
  if (stream) {
    stream.getTracks().forEach(track => track.stop())
  }
})
</script>
  
  
  <style>
  .app-background {
    background: linear-gradient(135deg, #121212 0%, #1c1c1c 100%);
    color: #E0E0E0;
    height: 100vh;
  }
  
  .card-elevated {
    background-color: #212121;
    border: 1px solid #333;
  }
  
  .custom-container {
    max-width: 50vw !important;
  }
  
  .card-full-width {
    width: 100%;
    max-width: none !important;
  }
  
  .webcam-container {
    position: relative;
    width: 100%;
    max-width: none;
    padding-top: 65%;
    background-color: #1c1c1c;
    border: 2px dashed #555;
    border-radius: 12px;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .video-feed {
>>>>>>> 3aa0bca (Cambios en subpaginas de multijugador e individual)
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
<<<<<<< HEAD
    background-color: rgba(0, 0, 0, 0.7);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 1.1rem;
    z-index: 10;
}

.video-feed {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.repetitions-card {
  width: 100%;
  max-width: 250px;
  text-align: center;
  background-color: #2c2c2c !important;
  color: #4CAF50 !important;
  border: 2px solid #4CAF50;
}

.features-card {
    width: 100%;
    max-width: 250px;
    background-color: #2c2c2c !important;
    border: 1px solid #444;
}

.exercise-select {
  width: 100%;
  max-width: 250px; 
  max-height: 56px;
}

.button-shadow {
  font-size: 1.2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.25s ease-in-out;
}

.back-button {
    box-shadow: 0 6px 20px 0 rgba(244, 67, 54, 0.45) !important;
}

.button-pulse {
    box-shadow: 0 6px 20px 0 rgba(33, 150, 243, 0.45);
}
.button-pulse:not([disabled]):hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 30px 0 rgba(33, 150, 243, 0.7);
}

.button-stop {
    background-color: #D32F2F !important; 
    box-shadow: 0 6px 20px 0 rgba(211, 47, 47, 0.45);
}
.button-stop:not([disabled]):hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 30px 0 rgba(211, 47, 47, 0.7);
}

.v-btn--disabled {
    opacity: 0.5 !important;
    box-shadow: none !important;
}
</style>
=======
    object-fit: cover;
  }
  
  .placeholder-text {
    position: absolute;
    color: #888;
    font-weight: bold;
    
}
  
  .repetitions-card {
    width: 100%;
    max-width: 250px;
    text-align: center;
    max-height: 150px;
  }
  
  .exercise-select {
    width: 100%;
    max-width: 150px;
    max-height: 56px;
  }
  
  .button-shadow {
    font-size: 1.2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 6px 20px 0 rgba(33, 150, 243, 0.45);
    transition: all 0.25s ease-in-out;
  }
  
  .button-shadow:hover {
    transform: translateY(-3px);
    box-shadow: 0 10px 30px 0 rgba(33, 150, 243, 0.7);
  }
  </style>
>>>>>>> 3aa0bca (Cambios en subpaginas de multijugador e individual)
