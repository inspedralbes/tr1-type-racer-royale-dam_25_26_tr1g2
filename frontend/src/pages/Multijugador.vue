<script setup>
import { ref, onMounted, onBeforeUnmount, shallowRef } from 'vue'
import { useRouter, useRoute } from 'vue-router' // Añadir useRoute

const router = useRouter()
const route = useRoute() // Inicializar useRoute

// --- CONFIGURACIÓN ---
const WS_URL = 'ws://localhost:8080'
// OBTENER ID DE LA URL
const sessionId = route.query.sala 

// Si no hay sessionId, redirigir inmediatamente (Esto previene errores)
if (!sessionId) {
  router.replace('/inicial')
}

// --- ESTADOS ---
const ws = ref(null)
const ownClientId = ref(null)
const isConnected = ref(false)
// ...resto de estados (features, isPoseDetectorReady, isReady, partidaEmpezada, countdown)...

// El estado de los jugadores ahora incluye reps y ready
const playerStates = ref({}) // { clientId: { reps: N, ready: bool } }

// ...resto de estados (repeticiones, squatState, pushupState, ejercicioSeleccionado, ejercicios)...

// --- CONEXIÓN WEBSOCKET ---
function connectWebSocket() {
  if (!sessionId) return // Ya redirigimos, pero como seguridad

  ws.value = new WebSocket(WS_URL)

  ws.value.onopen = () => {
    isConnected.value = true
    console.log(`[WS] Conectado. Uniendo a sala ${sessionId}...`)
    // Usamos el sessionId dinámico
    ws.value.send(JSON.stringify({ type: 'JOIN_SESSION', sessionId })) 
  }

  ws.value.onmessage = (event) => {
    const data = JSON.parse(event.data)

    switch (data.type) {
      case 'welcome':
        ownClientId.value = data.clientId
        console.log(`[WS] ID asignado: ${ownClientId.value}`)
        break

      case 'SESSION_STATE':
        // Estado global de la sala (reps y ready de todos)
        playerStates.value = data.state
        // Verificar si todos están listos
        checkAllReady(data.state)
        break
        
      case 'SESSION_JOINED':
        console.log(`[WS] Unido a sala ${data.sessionId} como ${data.clientId}`)
        break

      case 'START_GAME':
        console.log('[WS] Partida iniciada.')
        partidaEmpezada.value = true
        countdown.value = 0
        break

      case 'STOP_GAME':
        console.log('[WS] Partida detenida.')
        detenerPartida()
        break
    }
  }
// ...resto de onclose y onerror...
}

// Función auxiliar para verificar si todos están listos y empezar el countdown
function checkAllReady(states) {
    const clientsInRoom = Object.keys(states).length;
    if (clientsInRoom === 0) return; // No hay nadie

    const allReady = Object.values(states).every(player => player.ready);

    if (allReady && clientsInRoom > 1 && !partidaEmpezada.value && countdown.value === 0) {
        startCountdown()
    }
}

// --- ENVÍOS WS ---
function sendRepsUpdate() {
  if (!ws.value || ws.value.readyState !== WebSocket.OPEN) return
  ws.value.send(JSON.stringify({
    type: 'REPS_UPDATE',
    sessionId, // Usar sessionId dinámico
    reps: repeticiones.value,
  }))
}

function sendReadyState(state) {
  if (!ws.value || ws.value.readyState !== WebSocket.OPEN) return
  isReady.value = state // Actualizar estado local
  ws.value.send(JSON.stringify({
    type: 'SET_READY',
    sessionId, // Usar sessionId dinámico
    ready: state
  }))
}

// --- READY Y COUNTDOWN ---
function setReady() {
  if (!isPoseDetectorReady.value || isReady.value) return
  sendReadyState(true) // Enviar true (listo)
  console.log('[PLAYER] Marcado como listo.')
}
// ...el resto de startCountdown, onFeatures, checkSquatRep, checkPushupRep, detenerPartida es igual...

onMounted(() => {
    if (sessionId) { // Conectarse solo si tenemos una sala
        connectWebSocket()
    }
})
// ...resto de onBeforeUnmount...
</script>

<template>
  <div class="multijugador">
    <h2 class="text-xl font-bold mb-2">Sala: {{ sessionId }}</h2>
    <p v-if="!isConnected">Conectando al servidor...</p>
    <p v-else>Conectado ✅</p>

    <div v-if="countdown > 0" class="text-3xl mt-4">Comienza en: {{ countdown }}</div>

    <div v-if="partidaEmpezada" class="mt-4 text-2xl">
      <p>Ejercicio: {{ ejercicioSeleccionado }}</p>
      <p>Repeticiones: {{ repeticiones }}</p>
    </div>

    <div class="mt-6">
      <h3 class="font-semibold">Jugadores conectados:</h3>
      <ul>
        <li v-for="(reps, id) in playerReps" :key="id">
          {{ id === ownClientId ? 'Tú' : id }} → {{ reps }} reps
        </li>
      </ul>
    </div>

    <button
      v-if="!partidaEmpezada"
      class="mt-6 px-4 py-2 bg-blue-500 text-white rounded"
      @click="setReady"
      :disabled="isReady"
    >
      {{ isReady ? 'Listo ✅' : 'Estoy listo' }}
    </button>
  </div>
</template>
