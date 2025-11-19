<template>
  <v-container fluid class="pa-4 incursion-background">
    <v-row class="mb-4 align-center justify-space-between">
      <v-col cols="auto">
        <v-btn color="error" rounded large to="/inicial">
          <v-icon left>mdi-arrow-left</v-icon>
          Volver
        </v-btn>
      </v-col>
      
      <v-col cols="auto" class="text-center">
        <h1 class="text-h4 text-sm-h3 font-weight-black battle-title">
          INCURSIÓN CONTRA EL JEFE
        </h1>
        <div v-if="bossSessionId" class="text-center mt-2">
          <v-chip color="primary" small class="text-caption text-sm-body-2">
            <v-icon left small>mdi-account-group</v-icon>
            Jugadores: {{ numParticipantes }} / {{ maxParticipants }}
          </v-chip>
          <v-chip color="secondary" small class="text-caption text-sm-body-2 ml-2" @click="copiarCodigo">
            <v-icon left small>mdi-pound</v-icon>
            Código: {{ bossSessionId }}
          </v-chip>
        </div> 
      </v-col>
      
      <v-col cols="auto" class="text-right" v-if="bossSessionId">
        <div class="reps-display">
          MIS REPS: <span class="text-h4">{{ misReps }}</span>
        </div>
      </v-col>
    </v-row> 
    
    <v-row>
      <v-col cols="12" md="6" order-md="1">
        <v-card class="pa-3 pa-sm-4 game-card player-card fill-height">
          <h2 class="text-h6 text-sm-h5 font-weight-bold mb-3 text-center player-title">TU ENTRENADOR</h2>

          <div class="mb-4">
            <div class="d-flex align-center justify-space-between mb-1">
                <div class="text-caption font-weight-bold text-truncate">TU HP ({{ jugadorVidaActual }}/{{ jugadorVidaMaxima }})</div>
            </div>
            <v-progress-linear
                :value="jugadorVidaPorcentaje"
                height="25"
                rounded
                :color="colorVidaJugador" 
                class="hp-bar"
            >
                 <template v-slot:default="{ value }">
                  <strong class="health-text text-body-2">{{ Math.ceil(value) }}%</strong>
                </template>
            </v-progress-linear>
          </div>
          
          <div class="webcam-stage mb-4">
            <PoseSkeleton @features="onFeatures" />
            
            <div v-if="!isPoseDetectorReady" class="loader-overlay">
                <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
                <p class="mt-2 text-caption font-weight-bold">Cargando modelos...</p>
            </div>
            
            <div class="combat-log-overlay">
              <div class="message-log" ref="messageLogRef">
                <p v-for="msg in logMensajes" :key="msg.id" :class="[msg.type, { 'fade-out': msg.leaving }]">
                  <strong>[{{ msg.time }}]</strong> {{ msg.text }}
                </p>
              </div>
            </div>
            
          </div>
          
          <v-row align="center" class="mt-4">
            <v-col cols="12">
              <div v-if="!bossSessionId" class="d-flex justify-center">
                <v-btn
                  color="success"
                  large
                  @click="gestionarUnionIncursion"
                  :loading="buscandoPartida"
                  :disabled="buscandoPartida || !isPoseDetectorReady"
                  class="action-btn"
                >
                  <v-icon left>mdi-magnify</v-icon>
                  Crear Incursión
                </v-btn>
              </div>

              <div class="d-flex justify-center gap-2 flex-wrap" v-else>
                <v-btn
                  v-if="esCreador"
                  color="success"
                  small
                  @click="iniciarPartidaAPI"
                  :disabled="isPartidaActiva || !isPoseDetectorReady"
                  class="action-btn flex-grow-1"
                >
                  <v-icon left small>mdi-sword</v-icon>
                  <span class="text-truncate">{{ textoBotonInicio }}</span>
                </v-btn>
                <v-btn
                  color="error"
                  small
                  @click="salirDeLaIncursion"
                  :disabled="buscandoPartida"
                  class="action-btn flex-grow-1"
                >
                  <v-icon left small>mdi-exit-run</v-icon>
                  <span class="text-truncate">SALIR</span>
                </v-btn> 
              </div>
            </v-col>
          </v-row>
        </v-card>
      </v-col>

      <v-col cols="12" md="6" order-md="2">
        
        <v-card class="pa-3 pa-sm-4 game-card mb-4 ruleta-card" dark>
            <div class="d-flex align-center justify-space-between">
                <h3 class="text-subtitle-1 font-weight-bold text-truncate">PRÓXIMO ATAQUE:</h3>
                <div class="text-h5 text-sm-h4 font-weight-black" :class="{'error--text': tiempoRestante < 15}">
                    {{ tiempoFormateado }}
                </div>
            </div>
            
            <v-divider class="my-2"></v-divider>
            
            <div class="text-center">
                <p class="mb-1 text-caption text-sm-subtitle-1">¡El Jefe exige!</p>
                <h2 class="text-h5 text-sm-h3 font-weight-black exercise-demand text-truncate">
                    {{ ejercicioMostrado }}
                </h2>
                <v-progress-linear
                    :value="porcentajeTiempo"
                    height="8"
                    rounded
                    :color="colorBarraTiempo"
                    class="mt-3"
                ></v-progress-linear>
            </div>
        </v-card>
        
        <v-card 
            class="pa-3 pa-sm-4 game-card enemy-card"
            :class="{'hit-animation': isJefeGolpeado}"
        >
          <div class="d-flex align-center justify-space-between mb-3">
            <h2 class="text-h6 text-sm-h5 font-weight-bold enemy-title text-truncate">JEFE DE GIMNASIO</h2>
            <div class="text-subtitle-2 font-weight-bold">
              HP: {{ jefeVidaActual }} / {{ jefeVidaMaximaEscalada }}
            </div>
          </div>
          
          <div class="mb-3">
            <v-progress-linear
              :value="jefeVidaPorcentajeEscalada"
              height="25"
              rounded
              :color="colorVidaJefe"
              class="hp-bar"
            >
              <template v-slot:default="{ value }">
                <strong class="health-text text-body-2">{{ Math.ceil(value) }}%</strong>
              </template>
            </v-progress-linear>
          </div>
          
          <div class="text-center boss-image-area">
              <v-icon size="80" class="boss-icon">mdi-robot-angry</v-icon>
              <div v-if="isJefeGolpeado" class="hit-indicator">
                <v-icon size="80" color="yellow lighten-1">mdi-flash</v-icon>
              </div>
          </div>

          <v-list dense class="participants-list mt-4">
            <v-list-subheader class="white--text font-weight-bold">EQUIPO DE INCURSIÓN ({{ numParticipantes }})</v-list-subheader>
            <v-list-item
              v-for="p in participantesOrdenados"
              :key="p.id"
              class="participant-item"
            >
              <v-list-item-title class="font-weight-bold white--text">
                {{ p.nombre }} <span v-if="String(p.id) === String(userId)">(Tú)</span>
              </v-list-item-title>
              
              <v-list-item-subtitle class="grey--text text--lighten-1">
                 Reps: <strong class="white--text">{{ calcularReps(p.damageDealt) }}</strong> 
                 <span class="text-caption ml-1">(Daño: {{ p.damageDealt || 0 }})</span>
              </v-list-item-subtitle>
              
              <template v-slot:append>
                <v-icon v-if="String(p.id) === String(creadorId)" color="amber">mdi-crown</v-icon>
              </template>
            </v-list-item>
          </v-list>
        </v-card>
      </v-col>
    </v-row>

  </v-container>
</template>

<script setup>
import { ref, computed, nextTick, onBeforeUnmount, onMounted } from 'vue'
import PoseSkeleton from '../components/PoseSkeleton.vue'
import { useRoute, useRouter } from 'vue-router'
import { 
  checkSquatRep, 
  checkPushupRep, 
  checkSitupRep,    
  checkLungeRep,
  checkJumpingJacksRep,
  checkMountainClimbersRep
} from '../utils/exercise-detection.js' 
import { useDisplay } from 'vuetify'

const DAÑO_AL_JEFE_POR_REP = 5
const CURACION_JUGADOR_POR_REP = 5
const DAÑO_AL_JUGADOR_POR_FALLO = 5
const MAX_PARTICIPANTS = 10
const DURACION_RULETA = 60
const UMBRAL_POBRE_SCORE = 0.25
const JEFE_VIDA_BASE = 300
const JUGADOR_VIDA_MAXIMA = 100

const features = ref(null)
const isPoseDetectorReady = ref(false)
const isPartidaActiva = ref(false)
const user = ref(JSON.parse(localStorage.getItem('user')) || {})
const router = useRouter()
const route = useRoute()
const { xsOnly, smAndUp } = useDisplay()

const bossSessionId = ref(null)
const creadorId = ref(null)
const buscandoPartida = ref(false)
const participantes = ref([])

const jefeVidaActualServer = ref(JEFE_VIDA_BASE)
const jugadorVidaActual = ref(JUGADOR_VIDA_MAXIMA)
const logMensajes = ref([{ time: '00:00', text: '¡Bienvenido! Busca una incursión.', type: '' }])
const messageLogRef = ref(null)
const isJefeGolpeado = ref(false)

const squatState = ref('up')
const pushupState = ref('up')
const situpState = ref('up')    
const lungeState = ref('up')
const jumpingJacksState = ref('down')
const mountainClimbersState = ref('up')

const ejercicioSeleccionado = ref('Esperando...')
const tiempoRestante = ref(DURACION_RULETA)
let dañoJugadorTimeout = null

const ws = ref(null)
const isConnected = ref(false)

const userId = computed(() => user.value?.id)
const esCreador = computed(() => String(creadorId.value) === String(userId.value))
const numParticipantes = computed(() => participantes.value.length)
const maxParticipants = computed(() => MAX_PARTICIPANTS)
const jugadorVidaMaxima = computed(() => JUGADOR_VIDA_MAXIMA)
const misReps = computed(() => {
    const me = participantes.value.find(p => String(p.id) === String(userId.value))
    return me ? Math.floor((me.damageDealt || 0) / 5) : 0
})
const textoBotonInicio = computed(() => isPartidaActiva.value ? 'EN CURSO' : 'INICIAR COMBATE')
const ejercicioMostrado = computed(() => ejercicioSeleccionado.value ? ejercicioSeleccionado.value.toUpperCase() : '')

const jefeVidaMaximaEscalada = computed(() => {
    return JEFE_VIDA_BASE + (participantes.value.length * 50)
})

const jefeVidaActual = computed(() => {
    const porcentajeServer = jefeVidaActualServer.value / JEFE_VIDA_BASE
    return Math.floor(jefeVidaMaximaEscalada.value * porcentajeServer)
})

const jefeVidaPorcentajeEscalada = computed(() => (jefeVidaActual.value / jefeVidaMaximaEscalada.value) * 100)
const jugadorVidaPorcentaje = computed(() => (jugadorVidaActual.value / JUGADOR_VIDA_MAXIMA) * 100)

const tiempoFormateado = computed(() => {
    const min = Math.floor(tiempoRestante.value / 60)
    const sec = tiempoRestante.value % 60
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
})

const porcentajeTiempo = computed(() => (tiempoRestante.value / DURACION_RULETA) * 100)

const participantesOrdenados = computed(() => {
  return [...participantes.value].sort((a, b) => (b.damageDealt || 0) - (a.damageDealt || 0))
})

const colorVidaJugador = computed(() => calcularColorVida(jugadorVidaPorcentaje.value))
const colorVidaJefe = computed(() => calcularColorVida(jefeVidaPorcentajeEscalada.value))
const colorBarraTiempo = computed(() => calcularColorVida(porcentajeTiempo.value))

function calcularColorVida(porcentaje) {
  if (porcentaje <= 30) return 'error'
  if (porcentaje <= 60) return 'warning'
  return 'success'
}

function calcularReps(dano) {
    return Math.floor((dano || 0) / 5)
}

function añadirMensaje(text, type = '') {
    const time = new Date().toLocaleTimeString('es-ES', { minute: '2-digit', second: '2-digit' })
    const id = Date.now() + Math.random()
    logMensajes.value.unshift({ id, time, text, type, leaving: false })
    if (logMensajes.value.length > 8) logMensajes.value.pop()
}

function copiarCodigo() {
  if (!bossSessionId.value) return
  navigator.clipboard.writeText(bossSessionId.value)
  añadirMensaje('Código copiado', 'info--text')
}

function resetExerciseStates() {
    squatState.value = 'up'
    pushupState.value = 'up'
    situpState.value = 'up'
    lungeState.value = 'up'
    jumpingJacksState.value = 'down'
    mountainClimbersState.value = 'up'
}

function onFeatures(payload) {
    if (payload && !isPoseDetectorReady.value) isPoseDetectorReady.value = true
    features.value = payload ? structuredClone(payload) : null
    
    if (!isPartidaActiva.value || !features.value || ejercicioSeleccionado.value === 'Esperando...') return

    if (features.value?.score < UMBRAL_POBRE_SCORE) {
        aplicarDanoJugador(DAÑO_AL_JUGADOR_POR_FALLO, "Mala Pose")
        return
    }

    const detectionInput = ejercicioSeleccionado.value === 'Jumping Jacks' ? features.value : features.value.angles
    
    const exerciseHandlers = {
        'Sentadillas': { detect: checkSquatRep, state: squatState },
        'Flexiones': { detect: checkPushupRep, state: pushupState },
        'Abdominales': { detect: checkSitupRep, state: situpState },
        'Zancadas': { detect: checkLungeRep, state: lungeState },
        'Jumping Jacks': { detect: checkJumpingJacksRep, state: jumpingJacksState },
        'Mountain Climbers': { detect: checkMountainClimbersRep, state: mountainClimbersState }
    }

    const handler = exerciseHandlers[ejercicioSeleccionado.value]
    if (handler) {
        const result = handler.detect(detectionInput, handler.state.value)
        handler.state.value = result.newState

        if (result.repCompleted) {
            aplicarDanoJefe(DAÑO_AL_JEFE_POR_REP)
            curarJugador(CURACION_JUGADOR_POR_REP)
        }
    }
}

function aplicarDanoJefe(dano) {
    if (!isPartidaActiva.value || !ws.value) return

    ws.value.send(JSON.stringify({ type: 'INCURSION_ATTACK', damage: dano }))

    isJefeGolpeado.value = true
    setTimeout(() => { isJefeGolpeado.value = false }, 200)
    
    const me = participantes.value.find(p => String(p.id) === String(userId.value))
    if (me) me.damageDealt = (me.damageDealt || 0) + dano
}

function aplicarDanoJugador(dano, razon) {
    if (dañoJugadorTimeout) return
    
    jugadorVidaActual.value = Math.max(0, jugadorVidaActual.value - dano)
    añadirMensaje(`¡${razon}! -${dano} HP`, 'error--text')
    
    if (jugadorVidaActual.value <= 0) {
        detenerPartida()
        añadirMensaje('¡DERROTA! Te has quedado sin fuerzas.', 'critical--text')
    }
    dañoJugadorTimeout = setTimeout(() => { dañoJugadorTimeout = null }, 2000)
}

function curarJugador(cantidad) {
    if (jugadorVidaActual.value < JUGADOR_VIDA_MAXIMA) {
        jugadorVidaActual.value = Math.min(JUGADOR_VIDA_MAXIMA, jugadorVidaActual.value + cantidad)
    }
}

function conectarWebSocket() {
  if (ws.value) ws.value.close()
  ws.value = new WebSocket('ws://localhost:8082')

  ws.value.onopen = () => {
    isConnected.value = true
    ws.value.send(JSON.stringify({
      type: 'INCURSION_JOIN',
      sessionId: bossSessionId.value,
      userId: user.value?.id,
      nombre: user.value?.usuari || 'Jugador'
    }))
    buscandoPartida.value = false
  }

  ws.value.onmessage = (event) => {
    const data = JSON.parse(event.data)
    switch (data.type) {
      case 'INCURSION_STATE':
        bossSessionId.value = data.sessionId 
        participantes.value = data.participantes 
        creadorId.value = data.creadorId
        jefeVidaActualServer.value = data.jefeVidaActual
        
        if (data.message) añadirMensaje(data.message, 'info--text')
        
        if (jefeVidaActualServer.value <= 0 && isPartidaActiva.value) {
             finalizarVictoria()
        }
        break

      case 'INCURSION_STARTED':
        iniciarPartidaLocal()
        break

      case 'BOSS_HEALTH_UPDATE':
        jefeVidaActualServer.value = data.jefeVidaActual
        añadirMensaje(`¡${data.attackerName} golpea! -5 PS`, 'success--text')
        if (jefeVidaActualServer.value <= 0) finalizarVictoria()
        break

      case 'NEW_EXERCISE':
        if (String(data.userId) === String(user.value?.id)) {
            ejercicioSeleccionado.value = data.exercise
            añadirMensaje(`¡NUEVA ORDEN! Haz: ${data.exercise}`, 'warning--text')
            resetExerciseStates()
        }
        break;
        
      case 'TIMER_UPDATE':
        tiempoRestante.value = data.tiempo
        break
        
      case 'JOIN_ERROR':
        añadirMensaje(`Error: ${data.message}`, 'error--text')
        buscandoPartida.value = false
        salirDeLaIncursion()
        break
        
      case 'LEADER_LEFT':
        añadirMensaje('El líder se fue. Incursión terminada.', 'error--text')
        salirDeLaIncursion()
        break
    }
  }

  ws.value.onclose = () => isConnected.value = false
}

function gestionarUnionIncursion() {
    if (!user.value?.id) return alert("Inicia sesión primero")
    buscandoPartida.value = true
    añadirMensaje('Conectando...', 'info--text')
    conectarWebSocket()
}

function iniciarPartidaAPI() {
    if (ws.value) ws.value.send(JSON.stringify({ type: 'INCURSION_START' }))
}

function iniciarPartidaLocal() {
    isPartidaActiva.value = true
    jugadorVidaActual.value = JUGADOR_VIDA_MAXIMA
    añadirMensaje('¡INCURSIÓN INICIADA! ¡Protege tu HP!', 'critical--text')
}

function detenerPartida() {
    isPartidaActiva.value = false
}

function finalizarVictoria() {
    detenerPartida()
    añadirMensaje('¡VICTORIA! Jefe derrotado.', 'success--text')
}

function salirDeLaIncursion() {
    bossSessionId.value = null
    isPartidaActiva.value = false
    participantes.value = []
    if (ws.value) {
        ws.value.close()
        ws.value = null
    }
    if (route.query.sala) router.replace('/inicial')
}

onMounted(() => {
    if (route.query.sala) {
        bossSessionId.value = route.query.sala
        gestionarUnionIncursion()
    }
})

onBeforeUnmount(() => {
    if (ws.value) ws.value.close()
})
</script>

<style scoped>
.incursion-background { background: linear-gradient(135deg, #1d2630 0%, #313c4a 100%); min-height: 100vh; color: #f5f5f5; }
.battle-title { color: #FFD700; text-shadow: 2px 2px 4px rgba(0,0,0,0.8); }
.game-card { background-color: rgba(30, 30, 30, 0.9) !important; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; }
.enemy-card { border-color: #FF5252; }
.player-card { border-color: #42A5F5; }
.reps-display { font-weight: 900; font-size: 1.2rem; }

.webcam-stage { position: relative; width: 100%; aspect-ratio: 4/3; background: #000; border-radius: 8px; overflow: hidden; }
.webcam-overlay, .loader-overlay { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.8); z-index: 20; color: white; flex-direction: column; }

.combat-log-overlay {
    position: absolute;
    top: 10px;
    left: 10px;
    width: 70%;
    height: 50%;
    z-index: 15;
    pointer-events: none;
    overflow: hidden;
}

.message-log {
    display: flex;
    flex-direction: column; 
    gap: 4px;
}

.message-log p {
    background: rgba(0, 0, 0, 0.6);
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 0.75rem;
    color: white;
    width: fit-content;
    backdrop-filter: blur(2px);
    animation: slideIn 0.3s ease;
}

@keyframes slideIn { from { transform: translateX(-20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }

.hit-animation { animation: shake 0.2s ease-in-out; }
@keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }

.boss-image-area { min-height: 120px; display: flex; align-items: center; justify-content: center; }
.hit-indicator { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; z-index: 10; }

.hp-bar { box-shadow: 0 2px 5px rgba(0,0,0,0.3); }

.action-btn { width: 100%; max-width: 300px; }
.success--text { color: #69F0AE !important; }
.warning--text { color: #FFD600 !important; }
.error--text { color: #FF5252 !important; }
.critical--text { color: #FF1744 !important; font-weight: bold; }
.info--text { color: #40C4FF !important; }

.participants-list { background: rgba(0,0,0,0.3) !important; border-radius: 8px; }
.participant-item { border-bottom: 1px solid rgba(255,255,255,0.1); }
</style>