<script setup>
import { ref, onMounted, onBeforeUnmount, shallowRef } from 'vue'
// NOTA: Asumiendo que PoseSkeleton y PoseFeatures están correctamente importados en la app real.
// import PoseSkeleton from '../components/PoseSkeleton.vue'
// import PoseFeatures from '../components/PoseFeatures.vue'

// [VARIABLES DE ESTADO]
const repeticiones = ref(0)
const features = shallowRef(null)
const isPartidaActiva = ref(false)
const isPoseDetectorReady = ref(false) // NUEVO: Para saber si la cámara y el tensor están activos
const ejercicioSeleccionado = ref('Sentadillas') 
const intervalRef = ref(null) 
const panelAbierto = ref([]) // vacío => todos cerrados por defecto
const mostrarMensajeObjetivo = ref(false)

// 🔢 Nuevo: máximo de repeticiones y sonido
const maxReps = ref(10) // valor por defecto
// Usamos un simple console.log como sustituto si no hay un archivo de sonido accesible
const audioBeep = { play: () => console.log('BEEP! Objetivo alcanzado.') } 

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
    }
  } 
  
  // 2. Detección de posición ALTA (Up) -> ¡Suma la repetición!
  else if (avgKneeAngle > MAX_SQUAT_ANGLE) {
    if (squatState.value === 'down') {
      repeticiones.value++
      squatState.value = 'up'

      // ✅ Detener partida al alcanzar el máximo
      if (repeticiones.value >= maxReps.value) {
        detenerPartida()
        audioBeep.play()
        mostrarMensajeObjetivo.value = true
        setTimeout(() => (mostrarMensajeObjetivo.value = false), 3000)
      }
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

      // ✅ Detener partida al alcanzar el máximo
      if (repeticiones.value >= maxReps.value) {
        detenerPartida()
        audioBeep.play()
        mostrarMensajeObjetivo.value = true
        setTimeout(() => (mostrarMensajeObjetivo.value = false), 3000)
      }
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
      <v-container fluid class="pa-4 custom-container">
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

                  <!-- Mensaje de Objetivo Alcanzado -->
                  <transition name="fade">
                    <div v-if="mostrarMensajeObjetivo" class="objetivo-overlay">
                      <v-icon size="64" color="amber lighten-1">mdi-trophy</v-icon>
                      <h2 class="mt-3 text-h5 font-weight-black text-amber-lighten-2">¡Objetivo alcanzado!</h2>
                    </div>
                  </transition>
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

                <!-- 🔢 Selector de máximo de repeticiones -->
                <v-text-field
                  v-model.number="maxReps"
                  label="Máx. repeticiones"
                  type="number"
                  min="1"
                  outlined
                  dense
                  dark
                  class="mb-4 exercise-select"
                  prepend-inner-icon="mdi-counter"
                  :disabled="isPartidaActiva"
                />
                
                <!-- Repeticiones Card -->
                <v-card elevation="8" class="pa-6 rounded-lg repetitions-card" dark>
                  <div class="text-h7 font-weight-bold mb-2">Repeticiones</div>
                  <div class="text-h4 font-weight-black">{{ repeticiones }}</div>
                  <div class="mt-2 text-caption font-weight-bold">
                    <!-- Mostrar estado dinámico basado en el ejercicio -->
                    Estado: 
                    <span v-if="ejercicioSeleccionado === 'Sentadillas'">{{ squatState }}</span>
                    <span v-else-if="ejercicioSeleccionado === 'Flexiones'">{{ pushupState }}</span>
                  </div>
                </v-card>
                
                <!-- Datos de Pose (PoseFeatures) - Desplegable (cerrado por defecto) -->
                <v-expansion-panels
                  v-model="panelAbierto"
                  flat
                  class="features-card mt-4"
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
  width: 80%;
/* padding-top: 65%; <--- COMENTADO / ELIMINADO */
  min-height: 400px;
  background-color: #1c1c1c;
  border: 2px dashed #555;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.4);
}

.video-feed {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.webcam-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.1rem;
  z-index: 10;
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

.v-expansion-panels {
  width: 100%;
  max-width: 250px;
  background-color: #2c2c2c !important;
  border: 1px solid #444;
  color: #E0E0E0;
  border-radius: 8px;
}

.v-expansion-panel-title {
  justify-content: center;
  text-align: center;
}

.v-expansion-panel-text {
  background-color: #212121 !important;
}

.objetivo-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(255, 193, 7, 0.1);
  backdrop-filter: blur(2px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #FFC107;
  z-index: 20;
  text-align: center;
  animation: scaleIn 0.6s ease;
}

@keyframes scaleIn {
  from { transform: scale(0.8); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.5s;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

/* Estilos para el espacio entre botones */
.d-flex.gap-4 {
  gap: 1rem;
}

</style>
