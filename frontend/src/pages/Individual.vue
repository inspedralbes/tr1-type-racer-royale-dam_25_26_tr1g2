<script setup>
import { ref, onBeforeUnmount, shallowRef, onMounted, computed, watch } from 'vue'
import PoseSkeleton from '../components/PoseSkeleton.vue'
import PoseFeatures from '../components/PoseFeatures.vue'
import axios from 'axios'

// --- ESTADO PRINCIPAL ---
const user = ref(JSON.parse(localStorage.getItem('user')) || {})
const repeticiones = ref(0)
const features = shallowRef(null)
const isPartidaActiva = ref(false)
const isPoseDetectorReady = ref(false)
const ejercicioSeleccionado = ref('Sentadillas')
const maxReps = ref(10)
const intervalRef = ref(null)
const panelAbierto = ref([]) // Para expansion-panels con multiple

const userRoutines = ref([])
const selectedRoutineId = ref(null)

// --- LISTA DE EJERCICIOS ---
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

// --- LÓGICA DE DETECCIÓN ---
const squatState = ref('up')
const MIN_SQUAT_ANGLE = 120
const MAX_SQUAT_ANGLE = 165

function checkSquatRep(angles) {
  if (!angles.leftKnee || !angles.rightKnee) return
  const avgKneeAngle = (angles.leftKnee + angles.rightKnee)/2
  if (avgKneeAngle < MIN_SQUAT_ANGLE && squatState.value==='up') squatState.value='down'
  else if (avgKneeAngle > MAX_SQUAT_ANGLE && squatState.value==='down') {
    repeticiones.value++
    squatState.value='up'
    if (repeticiones.value >= maxReps.value) detenerPartida()
  }
}

const pushupState = ref('up')
const MIN_PUSHUP_ANGLE = 100
const MAX_PUSHUP_ANGLE = 160

function checkPushupRep(angles) {
  if (!angles.leftElbow || !angles.rightElbow) return
  const avgElbowAngle = (angles.leftElbow + angles.rightElbow)/2
  if (avgElbowAngle < MIN_PUSHUP_ANGLE && pushupState.value==='up') pushupState.value='down'
  else if (avgElbowAngle > MAX_PUSHUP_ANGLE && pushupState.value==='down') {
    repeticiones.value++
    pushupState.value='up'
    if (repeticiones.value >= maxReps.value) detenerPartida()
  }
}

// --- GESTIÓN DE PARTIDA ---
function onFeatures(payload) {
  if (payload && !isPoseDetectorReady.value) isPoseDetectorReady.value=true
  features.value = (typeof structuredClone==='function') ? structuredClone(payload) : JSON.parse(JSON.stringify(payload))
  
  if (isPartidaActiva.value && features.value?.angles) {
    const selected = ejercicioSeleccionado.value
    if (selected==='Sentadillas') checkSquatRep(features.value.angles)
    else if (selected==='Flexiones') checkPushupRep(features.value.angles)
  }
}

function iniciarPartida() {
  if (isPartidaActiva.value) return
  if (!isPoseDetectorReady.value) { console.error('Detector no listo'); return }
  repeticiones.value=0
  squatState.value='up'
  pushupState.value='up'
  isPartidaActiva.value=true
  if(intervalRef.value){ clearInterval(intervalRef.value); intervalRef.value=null }
}

function detenerPartida() {
  isPartidaActiva.value=false
  if(intervalRef.value){ clearInterval(intervalRef.value); intervalRef.value=null }
}

onBeforeUnmount(()=>{ detenerPartida() })

// --- RUTINAS DE USUARIO ---
const loadUserRoutines = async ()=>{
  const userData = JSON.parse(localStorage.getItem('user')) || {}
  const userId = userData?.id || userData?.userId
  if(userId){
    try{
      const resp = await axios.get(`http://localhost:9000/api/rutines/user/${userId}`)
      userRoutines.value = resp.data.rutines || []
    }catch(e){ console.error(e); userRoutines.value=[] }
  } else userRoutines.value=[]
}

onMounted(()=>{
  loadUserRoutines()
  window.addEventListener('user-logged-in', loadUserRoutines)
})
onBeforeUnmount(()=> window.removeEventListener('user-logged-in', loadUserRoutines))

watch(selectedRoutineId,(newId)=>{
  if(newId){
    const routine = userRoutines.value.find(r=>r.id===newId)
    if(routine && routine.exercicis.length>0) ejercicioSeleccionado.value = routine.exercicis[0].nom_exercicis
  } else ejercicioSeleccionado.value='Sentadillas'
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
  </div>
  
  <div class="d-flex gap-4">
    <v-btn color="primary" large rounded class="button-shadow button-pulse" @click="iniciarPartida" :disabled="isPartidaActiva || !isPoseDetectorReady">
      <v-icon left>mdi-run-fast</v-icon>
      {{ isPoseDetectorReady ? 'Iniciar Partida' : 'Esperando Cámara...' }}
    </v-btn>
    <v-btn color="red darken-1" large rounded class="button-shadow button-stop" @click="detenerPartida" :disabled="!isPartidaActiva">
      <v-icon left>mdi-stop</v-icon>Detener Partida
    </v-btn>
  </div>
</v-col>

<!-- EJERCICIO + RUTINA -->
<v-col cols="12" md="3" class="d-flex flex-column align-center justify-start">
  <!-- Selección de rutina -->
  <v-select v-model="selectedRoutineId" :items="userRoutines" item-title="nom" item-value="id" label="Selecciona una Rutina" outlined dense dark class="mb-4 exercise-select" prepend-inner-icon="mdi-clipboard-list" :disabled="isPartidaActiva" clearable/>

  <!-- Selección de ejercicio -->
  <v-select v-model="ejercicioSeleccionado" :items="ejerciciosDisponibles" label="Selecciona Ejercicio" outlined dense dark class="mb-4 exercise-select" prepend-inner-icon="mdi-dumbbell" :disabled="isPartidaActiva"/>

  <!-- Máx. repeticiones -->
  <v-text-field v-model.number="maxReps" label="Máx. repeticiones" type="number" min="1" outlined dense dark class="mb-4 exercise-select" prepend-inner-icon="mdi-counter" :disabled="isPartidaActiva"/>

  <!-- Repeticiones -->
  <v-card elevation="8" class="pa-6 rounded-lg repetitions-card" dark>
    <div class="text-h7 font-weight-bold mb-2">Repeticiones</div>
    <div class="text-h4 font-weight-black">{{ repeticiones }}</div>
    <div class="mt-2 text-caption font-weight-bold">
      Estado: 
      <span v-if="ejercicioSeleccionado==='Sentadillas'">{{ squatState }}</span>
      <span v-else-if="ejercicioSeleccionado==='Flexiones'">{{ pushupState }}</span>
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
.app-background { background: linear-gradient(135deg, #121212 0%, #1c1c1c 100%); color:#E0E0E0; height:100vh; }
.card-elevated { background-color:#212121 !important; border:1px solid #333; }
.custom-container { max-width:1000px !important; }
.card-full-width { width:100%; max-width:none !important; }
.webcam-container { position:relative; width:100%; padding-top:56.25%; background-color:#1c1c1c; border:2px dashed #555; border-radius:12px; overflow:hidden; box-shadow:0 8px 25px rgba(0,0,0,0.4); }
.webcam-container {
  position: relative;
  width: 80%;
  min-height: 400px; /* asegura que haya altura mínima */
  background-color: #1c1c1c;
  border: 2px dashed #555;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 8px 25px rgba(0,0,0,0.4);
}

.video-feed {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.repetitions-card { width:100%; max-width:250px; text-align:center; background-color:#2c2c2c !important; color:#4CAF50 !important; border:2px solid #4CAF50; }
.features-card { width:100%; max-width:250px; background-color:#2c2c2c !important; border:1px solid #444; }
.exercise-select { width:100%; max-width:250px; max-height:56px; }
.button-shadow { font-size:1.2rem; display:flex; align-items:center; justify-content:center; transition:all 0.25s ease-in-out; }
.back-button { box-shadow:0 6px 20px 0 rgba(244,67,54,0.45) !important; }
.button-pulse { box-shadow:0 6px 20px 0 rgba(33,150,243,0.45); }
.button-pulse:not([disabled]):hover { transform:translateY(-3px); box-shadow:0 10px 30px 0 rgba(33,150,243,0.7); }
.button-stop { background-color:#D32F2F !important; box-shadow:0 6px 20px 0 rgba(211,47,47,0.45); }
.button-stop:not([disabled]):hover { transform:translateY(-3px); box-shadow:0 10px 30px 0 rgba(211,47,47,0.7); }
.v-btn--disabled { opacity:0.5 !important; box-shadow:none !important; }
</style>
