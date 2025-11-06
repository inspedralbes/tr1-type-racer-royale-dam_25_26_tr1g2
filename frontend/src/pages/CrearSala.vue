<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
// Mantengo solo un import de axios
import axios from 'axios' 
// Reemplaza esto con tu forma real de obtener el ID del usuario
// Asumiendo que getUserId devuelve el ID del usuario loggeado.
// Si no tienes esta función, debes simularla o implementarla.
const getUserId = () => 1; // EJEMPLO: Asumo ID 1. ¡AJUSTA ESTO!

const router = useRouter()
const API_BASE_URL = 'http://localhost:9000/api' // Ajusta si tu puerto de API es diferente

const codigoSala = ref('')
const salaIniciada = ref(false)
const maxPersonas = ref(2)
const personasOptions = [2,3,4,5,6,7,8]

// Generar código llamando a la API y guardándolo en la DB
async function generarCodigo() {
  const creadorId = getUserId();
  if (!creadorId) return alert('Debes iniciar sesión.');
  console.log('Intentando conectar con:', `${API_BASE_URL}/multiplayer/create`);
  try {
    const response = await axios.post(`${API_BASE_URL}/multiplayer/create`, {
      creatorId: creadorId,
      maxPlayers: maxPersonas.value,
    });

    // ✅ No hace falta comprobar .success, solo sessionId
    if (response.data.sessionId) {
      codigoSala.value = response.data.sessionId;
      alert(`Sala creada con código: ${codigoSala.value}`);
    } else {
      alert('Error al crear sala (respuesta inválida).');
      console.error('Respuesta del servidor:', response.data);
    }
  } catch (err) {
    console.error('Error al conectar con el servidor:', err);
    alert('Error al conectar con el servidor.');
  }
}


// Copiar al portapapeles
function copiarCodigo() {
  // Uso de navigator.clipboard.writeText es correcto
  navigator.clipboard.writeText(codigoSala.value)
    .then(() => alert(`Código copiado: ${codigoSala.value}`))
}

// Iniciar sala y redirigir al componente de multijugador
function iniciarSala() {
  if (!codigoSala.value) return
  salaIniciada.value = true
  console.log('Redirigiendo a sala:', codigoSala.value)
  router.push({ name: 'MultiplayerMode', params: { id: codigoSala.value } })
}

</script>

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