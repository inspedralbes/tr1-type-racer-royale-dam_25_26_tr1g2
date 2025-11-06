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
  
              <!-- Input código de sala -->
              <v-text-field
                v-model="codigoSala"
                label="Código de Sala"
                outlined
                dense
                class="mb-4"
              ></v-text-field>

              <!-- Botón Unirse -->
              <v-btn
                color="success"
                class="button-shadow px-10 py-5 d-flex align-center justify-center"
                rounded
                @click="unirseSala"
                elevation="10"
                :disabled="!codigoSala"
                block
              >
                <v-icon left size="28">mdi-login-variant</v-icon>
                Unirse a Sala
              </v-btn>
  
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
const codigoSala = ref('')  // 👈 ESTA LÍNEA ES CLAVE

const API_BASE_URL = 'http://localhost:9000/api' // o el que uses
  
  async function unirseSala() {
    if (!codigoSala.value.trim()) return
  
    try {
      const userId = 2 // simulado, reemplaza por el usuario real
      const res = await axios.post(`${API_BASE_URL}/multiplayer/join`, {
        sessionId: codigoSala.value.trim(),
        userId,
      })
  
      if (res.data.success) {
        router.push({ name: 'MultiplayerMode', params: { id: codigoSala.value } })
      } else {
        alert(res.data.error || 'Error al unirse a la sala.')
      }
    } catch (err) {
      console.error(err)
      alert('No se pudo conectar al servidor.')
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
  