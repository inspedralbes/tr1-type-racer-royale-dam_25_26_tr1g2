<script setup>
import { ref, computed, shallowRef, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'

// NOTA: Asumiendo que PoseSkeleton y PoseFeatures están correctamente importados
// Si no están definidos, el código solo mostrará la interfaz.
// Se recomienda tener estos componentes activos para la funcionalidad real de detección.
import PoseSkeleton from '../components/PoseSkeleton.vue' 
import PoseFeatures from '../components/PoseFeatures.vue'
import axios from 'axios'

const route = useRoute()
const router = useRouter()

// --- ESTADO DE USUARIO Y SALA ---
const salaId = ref(route.query.sala || null)
const userId = ref(localStorage.getItem('userId') || null)
const creadorId = ref(null) // Se obtendrá desde el servidor
const esCreador = computed(() => userId.value && creadorId.value && String(userId.value) === String(creadorId.value))

// --- ESTADO WEBSOCKET ---
const ws = ref(null)
const isConnected = ref(false)

// [ESTADO MULTIJUGADOR] - Ahora se llena desde el WebSocket
const jugadores = ref([])

// [ESTADO DE LA PARTIDA]
const isPoseDetectorReady = ref(true) 
const isPartidaActiva = ref(false)
const ejercicioSeleccionado = ref('Sentadillas')
const mostrarMensajeObjetivo = ref(false)
const features = shallowRef(null)
const maxReps = ref(5)
const panelAbierto = ref([])

// --- LÓGICA DE DETECCIÓN DE REPETICIONES POR JUGADOR ---
// El estado de la repetición (arriba/abajo) DEBE ser por jugador
const squatState = ref({}) 
const pushupState = ref({}) 

// Umbrales para el conteo de repeticiones (ejemplo)
const MIN_SQUAT_ANGLE = 120
const MAX_SQUAT_ANGLE = 165
const MIN_PUSHUP_ANGLE = 100
const MAX_PUSHUP_ANGLE = 160

/**
 * Verifica si se ha completado una repetición para el jugador dado.
 */
function checkRepeticion(jugadorId, angles) {
  if (!isPartidaActiva.value || !angles) return;

  const jugador = jugadores.value.find(j => j.id == jugadorId);
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

  // 1. Posición BAJA (Down)
  if (avgAngle < minAngle && jugadorState === 'up') {
    currentStateRef.value = { 
      ...currentStateRef.value, 
      [jugadorId]: 'down' 
    };
    // console.log(`🔽 ${jugador.nombre}: BAJANDO (${avgAngle.toFixed(1)}°)`);
  } 
  // 2. Posición ALTA (Up) -> ¡Suma la repetición!
  else if (avgAngle > maxAngle && jugadorState === 'down') {
    currentStateRef.value = { 
      ...currentStateRef.value, 
      [jugadorId]: 'up' 
    };
    repeticionCompletada = true;
    // console.log(`✅ ${jugador.nombre}: ¡REPETICIÓN! (${avgAngle.toFixed(1)}°)`);
  }

  // Si la repetición fue completada
  if (repeticionCompletada) {
    // Enviar actualización de repeticiones al servidor
    if (ws.value && ws.value.readyState === WebSocket.OPEN) {
      ws.value.send(JSON.stringify({
        type: 'REPS_UPDATE',
        reps: jugador.repeticiones + 1
      }));
    }
  }
}

// --- GESTIÓN DE LA PARTIDA Y FEATURES ---
const todosListos = computed(() =>
  jugadores.value.length > 0 && jugadores.value.every(j => j.ready)
)

function onFeatures(payload) {
  if (payload && !isPoseDetectorReady.value) {
    isPoseDetectorReady.value = true
  }
  features.value = (typeof structuredClone === 'function')
    ? structuredClone(payload)
    : JSON.parse(JSON.stringify(payload || {}))
  
  // Solo el usuario actual procesa sus propias poses
  if (isPartidaActiva.value && features.value?.poses?.[0]) {
      checkRepeticion(userId.value, features.value.poses[0].angles);
  }
}

function marcarListo() {
  if (ws.value && ws.value.readyState === WebSocket.OPEN) {
    ws.value.send(JSON.stringify({ type: 'PLAYER_READY' }));
  }
}

async function iniciarPartida() {
  if (!esCreador.value || !todosListos.value || !isPoseDetectorReady.value || isPartidaActiva.value) return;
  
  try {
    // El creador notifica al servidor HTTP para iniciar la sala
    await axios.post('http://localhost:9000/api/sessions/start', { codigo: salaId.value });
    // El servidor se encargará de notificar a todos por WebSocket
  } catch (error) {
    console.error("Error al iniciar la partida:", error);
    alert("No se pudo iniciar la partida.");
  }
}

function detenerPartida() {
  console.log('⏹️ PARTIDA DETENIDA');
  isPartidaActiva.value = false
}

onMounted(() => {
  if (!salaId.value || !userId.value) {
    alert("No se ha especificado una sala o no has iniciado sesión.");
    router.push('/inicial');
    return;
  }

  ws.value = new WebSocket('ws://localhost:8082'); // Apuntamos al puerto correcto

  ws.value.onopen = () => {
    console.log('🔌 Conectado al WebSocket.');
    isConnected.value = true;
    // Unirse a la sala
    ws.value.send(JSON.stringify({
      type: 'JOIN_SESSION',
      sessionId: salaId.value,
      userId: userId.value,
      nombre: localStorage.getItem('username') || `Jugador ${userId.value}`
    }));
  };

  ws.value.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log('📩 Mensaje recibido:', data);

    switch (data.type) {
      case 'SESSION_STATE':
        // Transforma el objeto de estado en un array para la UI
        jugadores.value = Object.entries(data.state).map(([id, playerData]) => ({
          id: String(id), // Aseguramos que el ID sea siempre un string para comparaciones consistentes
          nombre: playerData.nombre,
          repeticiones: playerData.reps,
          ready: playerData.ready
        }));
        // El servidor ahora nos dice quién es el creador
        if (data.creatorId) {
          creadorId.value = data.creatorId;
        }
        // Inicializar estados de repetición para nuevos jugadores
        jugadores.value.forEach(jugador => {
          if (!squatState.value[jugador.id]) {
            squatState.value[jugador.id] = 'up';
          }
          if (!pushupState.value[jugador.id]) {
            pushupState.value[jugador.id] = 'up';
          }
        });
        break;
      case 'SESSION_STARTED':
        console.log('🎮 PARTIDA INICIADA POR EL SERVIDOR');
        isPartidaActiva.value = true;
        mostrarMensajeObjetivo.value = false;
        // Reiniciar contadores locales al inicio
        jugadores.value.forEach(j => j.repeticiones = 0);
        break;
      case 'JOIN_ERROR':
        alert(`Error al unirse: ${data.message}`);
        router.push('/unirsala');
        break;
    }
  };

  ws.value.onclose = () => {
    console.log('🔌 Desconectado del WebSocket.');
    isConnected.value = false;
  };

  ws.value.onerror = (error) => {
    console.error('❌ Error de WebSocket:', error);
    alert("Error de conexión con el servidor de juego.");
  };
});

onBeforeUnmount(() => {
  detenerPartida();
  if (ws.value) {
    ws.value.close();
  }
})
</script>

<template>
  <v-app class="app-background">
    <v-main>
      <v-container fluid class="pa-4 custom-container"> 
        <v-card elevation="16" class="pa-6 rounded-xl card-elevated" dark>
          <v-card-title class="justify-center pb-2">
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
          
          <div class="text-center mb-4">
            <v-chip small :color="isConnected ? 'green' : 'red'">{{ isConnected ? 'CONECTADO' : 'DESCONECTADO' }}</v-chip>
            <v-chip small class="ml-2">Sala: {{ salaId }}</v-chip>
          </div>

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
                    </div>
                  </transition>
                </div>

                <div class="d-flex gap-4">
                  <v-btn
                    color="primary"
                    large
                    rounded
                    class="button-shadow button-pulse"
                    v-if="esCreador"
                    @click="iniciarPartida"
                    :disabled="!todosListos || !isPoseDetectorReady || isPartidaActiva"
                  >
                    <v-icon left>mdi-play</v-icon>
                    {{ todosListos ? 'Iniciar Partida' : `Esperando ${jugadores.filter(j => !j.ready).length} jug...` }}
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
                  class="pa-3 mb-3 rounded-lg repetitions-card"
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
                    v-if="!jugador.ready && !isPartidaActiva && jugador.id === userId"
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
                      <!-- Asume que PoseFeatures puede manejar un objeto con una pose -->
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