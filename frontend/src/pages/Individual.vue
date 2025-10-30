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
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
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