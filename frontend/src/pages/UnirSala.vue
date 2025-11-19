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
                Unirse a Multijugador
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
      alert('Debes iniciar sesión para unirte a una sala.'); // Usamos alert para notificaciones simples
      await router.push({ name: 'login' });
      return;
    }

    // 1. Comprobar si la sala existe y su modo en el servidor
    const response = await api.get(`/api/salas/check/${codigo}`);
    const salaInfo = response.data;

    // 2. Validar que la sala existe y el modo coincide
    if (salaInfo.exists && salaInfo.modo === modo) {
      // 3. Redirigir si todo es correcto
      if (modo === 'incursion') {
        await router.push({ name: 'incursion', query: { sala: codigo } });
      } else { // modo === 'multijugador'
        await router.push({ name: 'multijugador', query: { sala: codigo } });
      }
    } else {
      // La sala existe pero no es del modo correcto, o no existe en absoluto
      throw new Error(`La sala no existe o no es una sala de ${modo}.`);
    }
  } catch (err) {
    const errorMsg = err.response?.data?.error || err.message || 'No se pudo conectar al servidor o la sala no existe.';
    console.error('Error al unirse a la sala:', errorMsg);
    alert(errorMsg); // Mostramos el error al usuario
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
