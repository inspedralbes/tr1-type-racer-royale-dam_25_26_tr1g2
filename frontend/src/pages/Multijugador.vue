<script setup>
import { ref, computed, shallowRef, onBeforeUnmount } from 'vue'

// [ESTADO MULTIJUGADOR]
const jugadoresData = [
  { id: 1, nombre: 'Jugador 1', ready: false, repeticiones: 0 },
  { id: 2, nombre: 'Jugador 2', ready: false, repeticiones: 0 }
];
const jugadores = ref(jugadoresData)

// [ESTADO DE LA PARTIDA]
const isPoseDetectorReady = ref(true) 
const isPartidaActiva = ref(false)
const ejercicioSeleccionado = ref('Sentadillas')
const mostrarMensajeObjetivo = ref(false)
const features = shallowRef(null)
const maxReps = ref(5)
const panelAbierto = ref([])

let intervalRef = null 

const audioBeep = { play: () => console.log('🔊 BEEP! Objetivo alcanzado.') }

// --- LÓGICA DE DETECCIÓN DE REPETICIONES POR JUGADOR ---
const squatState = ref({ 1: 'up', 2: 'up' }) 
const pushupState = ref({ 1: 'up', 2: 'up' }) 

const MIN_SQUAT_ANGLE = 120
const MAX_SQUAT_ANGLE = 165
const MIN_PUSHUP_ANGLE = 100
const MAX_PUSHUP_ANGLE = 160

/**
 * ✅ FUNCIÓN CORREGIDA - Verifica repeticiones por jugador
 */
function checkRepeticion(jugadorId, angles) {
  if (!isPartidaActiva.value) return;

  const jugador = jugadores.value.find(j => j.id === jugadorId);
  if (!jugador) {
    console.warn(`❌ Jugador ${jugadorId} no encontrado`);
    return;
  }

  let repeticionCompletada = false;
  let currentStateRef = null;
  let minAngle, maxAngle, avgAngle;
  
  if (ejercicioSeleccionado.value === 'Sentadillas') {
    currentStateRef = squatState;
    minAngle = MIN_SQUAT_ANGLE;
    maxAngle = MAX_SQUAT_ANGLE;
    if (!angles.leftKnee || !angles.rightKnee) return;
    avgAngle = (angles.leftKnee + angles.rightKnee) / 2;
  } else if (ejercicioSeleccionado.value === 'Flexiones') {
    currentStateRef = pushupState;
    minAngle = MIN_PUSHUP_ANGLE;
    maxAngle = MAX_PUSHUP_ANGLE;
    if (!angles.leftElbow || !angles.rightElbow) return;
    avgAngle = (angles.leftElbow + angles.rightElbow) / 2;
  } else {
    return;
  }

  const jugadorState = currentStateRef.value[jugadorId];

  // ✅ 1. Posición BAJA (Down) - CORREGIDO
  if (avgAngle < minAngle && jugadorState === 'up') {
    currentStateRef.value = { 
      ...currentStateRef.value, 
      [jugadorId]: 'down' 
    };
    console.log(`🔽 ${jugador.nombre}: BAJANDO (${avgAngle.toFixed(1)}°)`);
  } 
  // ✅ 2. Posición ALTA (Up) - CORREGIDO
  else if (avgAngle > maxAngle && jugadorState === 'down') {
    currentStateRef.value = { 
      ...currentStateRef.value, 
      [jugadorId]: 'up' 
    };
    repeticionCompletada = true;
    console.log(`✅ ${jugador.nombre}: ¡REPETICIÓN! (${avgAngle.toFixed(1)}°)`);
  }

  // ✅ Si la repetición fue completada - CORREGIDO
  if (repeticionCompletada) {
    const index = jugadores.value.findIndex(j => j.id === jugadorId);
    if (index !== -1) {
      jugadores.value[index].repeticiones++;
      console.log(`📊 ${jugador.nombre}: ${jugadores.value[index].repeticiones}/${maxReps.value}`);
    }

    // Comprobar si algún jugador ha ganado
    if (jugadores.value.some(j => j.repeticiones >= maxReps.value)) {
      const ganador = jugadores.value.find(j => j.repeticiones >= maxReps.value);
      console.log(`🏆 ¡GANADOR: ${ganador.nombre}!`);
      
      detenerPartida();
      audioBeep.play();
      mostrarMensajeObjetivo.value = true;

      setTimeout(() => (mostrarMensajeObjetivo.value = false), 3000);
    }
  }
}

// --- SIMULACIÓN DE REPETICIONES AUTOMÁTICA ---
function simulateReps() {
  if (!isPartidaActiva.value) return;

  jugadores.value.forEach(jugador => {
    const id = jugador.id;
    const isSquat = ejercicioSeleccionado.value === 'Sentadillas';
    
    const stateRef = isSquat ? squatState : pushupState;
    const minAngle = isSquat ? MIN_SQUAT_ANGLE : MIN_PUSHUP_ANGLE;
    const maxAngle = isSquat ? MAX_SQUAT_ANGLE : MAX_PUSHUP_ANGLE;
    const angleName = isSquat ? 'Knee' : 'Elbow';
    const otherAngleName = isSquat ? 'Elbow' : 'Knee';
    
    let angles = {};
    const noise = Math.random() * 5 - 2.5;

    if (stateRef.value[id] === 'up') {
      const simulatedAngle = minAngle - 10 + noise; 
      angles[`left${angleName}`] = simulatedAngle;
      angles[`right${angleName}`] = simulatedAngle;
    } else if (stateRef.value[id] === 'down') {
      const simulatedAngle = maxAngle + 10 + noise; 
      angles[`left${angleName}`] = simulatedAngle;
      angles[`right${angleName}`] = simulatedAngle;
    }
    
    angles[`left${otherAngleName}`] = 175;
    angles[`right${otherAngleName}`] = 175;

    checkRepeticion(id, angles);
  });
}

// --- GESTIÓN DE LA PARTIDA Y FEATURES ---
const todosListos = computed(() =>
  jugadores.value.every(j => j.ready)
)

function onFeatures(payload) {
  if (intervalRef) return; 

  if (payload && !isPoseDetectorReady.value) {
    isPoseDetectorReady.value = true
  }

  features.value = (typeof structuredClone === 'function')
    ? structuredClone(payload)
    : JSON.parse(JSON.stringify(payload || {}))
  
  if (isPartidaActiva.value && features.value && features.value.poses) {
    features.value.poses.forEach((pose, index) => {
      const jugadorId = index + 1; 
      checkRepeticion(jugadorId, pose.angles || {});
    });
  }
}

function marcarListo(id) {
  const jugador = jugadores.value.find(j => j.id === id)
  if (jugador) jugador.ready = true
}

function iniciarPartida() {
  if (!todosListos.value || !isPoseDetectorReady.value || isPartidaActiva.value) return
  
  console.log('🎮 INICIANDO PARTIDA -', ejercicioSeleccionado.value);
  isPartidaActiva.value = true
  mostrarMensajeObjetivo.value = false
  
  jugadores.value.forEach(j => (j.repeticiones = 0))
  squatState.value = { 1: 'up', 2: 'up' };
  pushupState.value = { 1: 'up', 2: 'up' };
  
  if (!intervalRef) {
    intervalRef = setInterval(simulateReps, 750); 
    console.log("✅ Simulación iniciada");
  }
}

function detenerPartida() {
  console.log('⏹️ PARTIDA DETENIDA');
  isPartidaActiva.value = false
  
  if (intervalRef) {
    clearInterval(intervalRef);
    intervalRef = null;
    console.log("❌ Simulación detenida");
  }
}

onBeforeUnmount(() => detenerPartida())
</script>

<template>
  <v-app class="app-background">
    <v-main>
      <v-container fluid class="pa-4 custom-container"> 
        <v-card elevation="16" class="pa-6 rounded-xl card-elevated" dark>
          <v-card-title class="justify-center pb-4">
            <h2 class="text-h5 font-weight-black">Modo Multijugador - {{ ejercicioSeleccionado }}</h2>
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

          <v-card-text>
            <v-row align="start">
              <v-col cols="12" md="8" class="d-flex flex-column align-center">
                <div class="webcam-container mb-4">
                  <!-- Se espera el componente PoseSkeleton que emite 'features' -->
                  <!-- NOTA: Si este componente no existe en el entorno, solo verás el contenedor vacío. -->
                  <PoseSkeleton class="video-feed" @features="onFeatures" />

                  <div v-if="!isPoseDetectorReady" class="webcam-overlay">
                    <v-progress-circular indeterminate color="primary"></v-progress-circular>
                    <p class="mt-3">Cargando detector de pose...</p>
                  </div>

                  <transition name="fade">
                    <div v-if="mostrarMensajeObjetivo" class="objetivo-overlay">
                      <v-icon size="64" color="amber lighten-1">mdi-trophy</v-icon>
                      <h2 class="mt-3 text-h5 font-weight-black text-amber-lighten-2">
                        ¡Objetivo alcanzado! Ganador: 
                        {{ jugadores.find(j => j.repeticiones >= maxReps)?.nombre || 'Jugador' }}
                      </h2>
                      <p v-if="intervalRef" class="text-caption mt-2">
                         (Conteo de repeticiones simulado)
                      </p>
                    </div>
                  </transition>
                </div>

                <div class="d-flex gap-4">
                  <v-btn
                    color="primary"
                    large
                    rounded
                    class="button-shadow button-pulse"
                    @click="iniciarPartida"
                    :disabled="!todosListos || !isPoseDetectorReady || isPartidaActiva"
                  >
                    <v-icon left>mdi-play</v-icon>
                    {{ todosListos ? 'Iniciar Partida' : 'Esperando jugadores...' }}
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

              <v-col cols="12" md="4" class="d-flex flex-column align-center">
                
                <!-- Tarjetas de Jugadores -->
                <v-card
                  v-for="jugador in jugadores"
                  :key="jugador.id"
                  class="pa-4 mb-4 rounded-lg repetitions-card"
                  :style="{borderColor: jugador.id === 1 ? '#2196F3' : '#FF9800'}"
                  elevation="8"
                  dark
                >
                  <div class="text-h6 font-weight-bold mb-2">{{ jugador.nombre }}</div>
                  <div class="text-h5 font-weight-black mb-2">
                    Reps: {{ jugador.repeticiones }} / {{ maxReps }}
                  </div>
                  
                  <!-- Mostrar estado dinámico -->
                  <div class="mt-2 text-caption font-weight-bold" v-if="isPartidaActiva">
                      Estado: 
                      <span v-if="ejercicioSeleccionado === 'Sentadillas'">{{ squatState[jugador.id] }}</span>
                      <span v-else-if="ejercicioSeleccionado === 'Flexiones'">{{ pushupState[jugador.id] }}</span>
                      <span v-else>Listo</span>
                  </div>

                  <v-btn
                    v-if="!jugador.ready && !isPartidaActiva"
                    color="green"
                    block
                    rounded
                    @click="marcarListo(jugador.id)"
                  >
                    <v-icon left>mdi-check</v-icon>
                    Estoy listo
                  </v-btn>

                  <v-chip
                    v-else-if="jugador.ready && !isPartidaActiva"
                    color="green"
                    text-color="white"
                    class="mt-2"
                  >
                    ✅ Listo
                  </v-chip>
                  
                  <v-chip
                    v-else-if="isPartidaActiva"
                    :color="jugador.repeticiones >= maxReps ? 'amber' : 'primary'"
                    text-color="white"
                    class="mt-2"
                  >
                    {{ jugador.repeticiones >= maxReps ? '¡META!' : 'COMPITIENDO...' }}
                  </v-chip>
                  
                </v-card>
                <!-- Fin Tarjetas de Jugadores -->

                <v-select
                  v-model="ejercicioSeleccionado"
                  :items="['Sentadillas','Flexiones','Abdominales']"
                  label="Ejercicio"
                  outlined
                  dense
                  dark
                  class="mt-4"
                  :disabled="isPartidaActiva"
                ></v-select>
                
                <v-slider
                  v-model="maxReps"
                  label="Objetivo de Repeticiones"
                  :min="1"
                  :max="20"
                  step="1"
                  thumb-label
                  dark
                  :disabled="isPartidaActiva"
                  class="mt-4"
                ></v-slider>

                <!-- Panel de Debug de Pose (Opcional, si PoseFeatures está disponible) -->
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
                      <!-- Asume que PoseFeatures puede manejar un objeto con múltiples poses -->
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
  background: linear-gradient(135deg, #121212, #1c1c1c);
  color: #E0E0E0;
}

.card-elevated {
  background-color: #212121 !important;
  border: 1px solid #333;
}

.custom-container {
  max-width: 1000px !important;
}

.webcam-container {
  position: relative;
  width: 100%;
  padding-top: 0%;
  min-height: 400px; 
  border: 2px dashed #555;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.4);
}

.repetitions-card {
  width: 100%;
  max-width: 250px;
  background-color: #2c2c2c !important;
  text-align: center;
}

.webcam-overlay, .objetivo-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
}

.webcam-overlay {
  background-color: rgba(0,0,0,0.7);
  z-index: 10;
}

.objetivo-overlay {
  background-color: rgba(255, 193, 7, 0.1);
  backdrop-filter: blur(2px);
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

.d-flex.gap-4 { gap: 1rem; }

.features-card {
  width: 100%;
  max-width: 250px;
  background-color: #2c2c2c !important;
  border: 1px solid #444;
  border-radius: 8px;
}
</style>