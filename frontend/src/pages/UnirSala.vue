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
            <h2 class="text-h5 font-weight-black">Unirse a Sala</h2>
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
            Volver
          </v-btn>

          <v-card-text>
            <p class="text-body-1 mb-4 grey--text text--lighten-1">
              Introduce el código de la sala que recibiste y únete al juego.
            </p>

            <v-text-field
              v-model="codigoSala"
              label="Código de Sala"
              outlined
              dense
              class="mb-4"
            ></v-text-field>

            <!-- NUEVOS BOTONES PARA SELECCIONAR MODO -->
            <div class="d-flex flex-column ga-4">
              <v-btn
                color="primary"
                class="button-shadow px-10 py-5"
                rounded
                @click="unirseSala('multijugador')"
                elevation="10"
                :disabled="!codigoSala"
                block
              >
                <v-icon left size="28">mdi-sword-cross</v-icon>
                Unirse a Multijugador (2vs2)
              </v-btn>

              <v-btn
                color="amber"
                class="button-shadow px-10 py-5"
                rounded
                @click="unirseSala('incursion')"
                elevation="10"
                :disabled="!codigoSala"
                block
              >
                <v-icon left size="28">mdi-robot-angry</v-icon>
                Unirse a Incursión (Jefe)
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
import axios from 'axios'
import { useRouter } from 'vue-router'

const router = useRouter()
const codigoSala = ref('')  
const API_BASE_URL = 'http://localhost:9000'
const api = axios.create({ baseURL: API_BASE_URL });

function obtenerUsuarioId() {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  return user?.id || null;
}

async function unirseSala(modo) {
  const codigo = codigoSala.value.trim();
  if (!codigo) return;

  try {
    const userId = obtenerUsuarioId();
    if (!userId) {
      alert('Debes iniciar sesión para unirte a una sala.');
      await router.push({ name: 'login' });
      return;
    }

    // Redirigir directamente según el modo seleccionado por el usuario
    if (modo === 'incursion') {
      await router.push({ name: 'incursion', query: { sala: codigo } });
    } else if (modo === 'multijugador') {
      await router.push({ name: 'multijugador', query: { sala: codigo } });
    } else {
      // Fallback por si se llama sin modo
      console.error("Modo de juego no especificado.");
      alert("Por favor, selecciona un modo de juego.");
    }
  } catch (err) {
    const errorMsg = err.response?.data?.error || err.message || 'No se pudo conectar al servidor o la sala no existe.';
    console.error('Error al unirse a la sala:', errorMsg);
  }
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
