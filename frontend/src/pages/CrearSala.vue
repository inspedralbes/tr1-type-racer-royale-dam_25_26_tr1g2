<template>
  <v-app dark class="app-background">
    <v-main>
      <v-container class="fill-height d-flex align-center justify-center pa-4" fluid>
        <v-card
          elevation="16"
          class="pa-6 rounded-xl text-center card-elevated"
          max-width="500"
          dark
        >
          <v-card-title class="justify-center pt-0 pb-4">
            <h2 class="text-h5 font-weight-black">Crear Sala de Juego</h2>
          </v-card-title>

          <v-card-text>
            <!-- Botón Volver -->
            <v-btn
              color="error"
              class="mb-4 button-shadow"
              rounded
              to="/inicial"
              elevation="2"
              block
            >
              <v-icon left>mdi-arrow-left</v-icon>
              Volver
            </v-btn>

            <v-divider class="my-4"></v-divider>

            <p class="text-body-1 mb-4 grey--text text--lighten-1">
              Genera un código único para tu sala, compártelo con tus amigos y empieza a jugar.
            </p>

            <!-- Botón generar código -->
            <v-btn
              color="primary"
              class="button-shadow mb-4 px-8 py-4 d-flex align-center justify-center"
              rounded
              @click="generarCodigo"
            >
              <v-icon left size="28">mdi-plus-box</v-icon>
              Generar Código
            </v-btn>

            <!-- Campo de código -->
            <v-text-field
              v-model="codigoSala"
              label="Código de Sala"
              readonly
              outlined
              dense
              class="mb-4"
            >
              <template #append>
                <v-btn icon @click="copiarCodigo" :disabled="!codigoSala">
                  <v-icon>mdi-content-copy</v-icon>
                </v-btn>
              </template>
            </v-text-field>


            <div class="d-flex align-center justify-center mt-4" style="gap: 16px;">
              <v-select
                v-model="maxPersonas"
                :items="personasOptions"
                label="Máx. personas"
                dense
                outlined
                style="max-width: 140px;"
                :disabled="salaIniciada"
              />
              <v-btn
                color="success"
                class="button-shadow px-10 py-5 d-flex align-center justify-center"
                rounded
                @click="iniciarSala"
                elevation="10"
                :disabled="!codigoSala || salaIniciada"
              >
                <v-icon left size="28">mdi-play-circle</v-icon>
                {{ salaIniciada ? 'Sala Iniciada' : 'Iniciar Sala' }}
              </v-btn>
            </div>

            <p class="caption mt-4 grey--text text--lighten-1">
              Projecte col·laboratiu.
            </p>
          </v-card-text>
        </v-card>
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup>
import { ref } from 'vue'


const codigoSala = ref('')
const salaIniciada = ref(false)
const maxPersonas = ref(2)
const personasOptions = [2,3,4,5,6,7,8]

// Generar un código aleatorio de 6 caracteres
function generarCodigo() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let codigo = ''
  for (let i = 0; i < 6; i++) {
    codigo += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  codigoSala.value = codigo
  salaIniciada.value = false
}

// Copiar al portapapeles
function copiarCodigo() {
  navigator.clipboard.writeText(codigoSala.value)
    .then(() => alert(`Código copiado: ${codigoSala.value}`))
}

// Iniciar sala (solo cambia el estado)
function iniciarSala() {
  salaIniciada.value = true
}
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
