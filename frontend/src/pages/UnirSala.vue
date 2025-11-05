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
  import { useRouter } from 'vue-router'
  // Asegúrate de tener una forma de hacer llamadas HTTP (ej. axios, fetch)
  import axios from 'axios' // Asumiendo que usas axios
   
  const router = useRouter()
  const API_BASE_URL = 'http://localhost:3000/api' // Ajusta si tu puerto de API es diferente
  const codigoSala = ref('')
   
  // Función para unirse a la sala
  async function unirseSala() {
    const code = codigoSala.value.trim().toUpperCase()
    if (!code) return
    
    try {
      // 1. Verificar si la sala existe
      const response = await axios.get(`${API_BASE_URL}/session/${code}`)
      
      // Si la respuesta es exitosa (código 200), la sala existe
      if (response.data.session) {
        alert(`Te has unido a la sala: ${code}`)
        // 2. Redirigir a la página de juego, pasando el código de sala como query param
        router.push({ name: 'multijugador', query: { sala: code } })
      }
    } catch (error) {
      // Manejar errores como 404 (Sala no encontrada)
      if (error.response && error.response.status === 404) {
        alert(`La sala con código ${code} no fue encontrada.`)
      } else {
        console.error('Error al unirse a la sala:', error)
        alert('Error de conexión al verificar la sala.')
      }
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
  