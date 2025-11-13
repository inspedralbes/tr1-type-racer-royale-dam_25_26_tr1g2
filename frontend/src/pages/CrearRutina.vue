<template>
  <v-app class="app-background">
    <v-main>
      <v-container class="py-8">
        <v-card elevation="12" class="pa-6 rounded-xl">
          <v-card-title class="text-h5 font-weight-bold justify-center">
            Crear Nueva Rutina
          </v-card-title>

          <v-card-text>
            <v-text-field
              v-model="nombreRutina"
              label="Nombre de la rutina"
              outlined
              dense
              prepend-inner-icon="mdi-pencil"
              class="mb-4"
              hide-details
            />

            <v-divider class="my-4"></v-divider>

            <!-- Bucle de Ejercicios Adaptado para Móviles -->
            <v-row v-for="(ex, index) in ejerciciosRutina" :key="index" class="mb-4" align="center" no-gutters>
              <!-- Selector de Ejercicio: 12 columnas en móvil, 6 en escritorio -->
              <v-col cols="12" sm="6" md="5" class="py-1">
                <v-select
                  v-model="ex.nom_exercicis"
                  :items="ejerciciosDisponibles"
                  label="Ejercicio"
                  outlined
                  dense
                  prepend-inner-icon="mdi-dumbbell"
                  hide-details
                ></v-select>
              </v-col>

              <!-- Input de Repeticiones: 8 columnas en móvil (para ser ancho), 4 en escritorio -->
              <v-col cols="8" sm="4" md="5" class="py-1 pr-2">
                <v-text-field
                  v-model="ex.n_repeticions"
                  label="Repeticiones"
                  outlined
                  dense
                  type="number"
                  prepend-inner-icon="mdi-counter"
                  hide-details
                ></v-text-field>
              </v-col>

              <!-- Botón de Eliminar: 4 columnas en móvil, 2 en escritorio. Se coloca junto a las repeticiones -->
              <v-col cols="4" sm="2" md="2" class="py-1 d-flex justify-end">
                <v-btn
                  icon
                  color="error"
                  @click="eliminarEjercicio(index)"
                  v-if="ejerciciosRutina.length > 1"
                  size="large"
                >
                  <v-icon>mdi-delete</v-icon>
                </v-btn>
              </v-col>
            </v-row>

            <v-btn color="primary" class="mt-2" @click="agregarEjercicio" rounded>
              <v-icon left>mdi-plus</v-icon> Añadir ejercicio
            </v-btn>
          </v-card-text>

          <v-card-actions class="justify-center mt-6">
            <v-btn
              color="success"
              :loading="cargando"
              rounded
              large
              @click="guardarRutina"
            >
              <v-icon left>mdi-content-save</v-icon>
              Guardar Rutina
            </v-btn>

            <v-btn color="error" rounded large to="/inicial">
              <v-icon left>mdi-arrow-left</v-icon>
              Volver
            </v-btn>
          </v-card-actions>

          <v-alert
            v-if="mensaje"
            :type="mensaje.includes('Rutina creada') ? 'success' : 'error'"
            class="mt-6 text-center"
          >
            {{ mensaje }}
          </v-alert>
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
const API_URL = 'http://localhost:9000'
axios.defaults.baseURL = API_URL

const nombreRutina = ref('')
const ejerciciosRutina = ref([{ nom_exercicis: '', n_repeticions: '' }])
const cargando = ref(false)
const mensaje = ref('')
const idRutinaCreada = ref(null)

const ejerciciosDisponibles = [
  'Sentadillas', 'Flexiones', 'Abdominales', 'Burpees', 'Dominadas',
  'Fondos', 'Zancadas', 'Plancha', 'Jumping Jacks', 'Mountain Climbers',
  'Curl de Bíceps', 'Press de Hombros', 'Peso Muerto', 'Press de Banca', 'Remo'
]

function agregarEjercicio() {
  ejerciciosRutina.value.push({ nom_exercicis: '', n_repeticions: '' })
}

function eliminarEjercicio(index) {
  ejerciciosRutina.value.splice(index, 1)
}

async function guardarRutina() {
  if (!nombreRutina.value.trim()) {
    mensaje.value = 'Por favor, ponle un nombre a tu rutina.'
    return
  }

  cargando.value = true
  mensaje.value = ''

  try {
    // Obtener el ID del usuario desde localStorage
    const user = JSON.parse(localStorage.getItem('user')) || {}
    const userId = user?.id || user?.userId || null

    // Filtrar ejercicios válidos
    const ejerciciosParaGuardar = ejerciciosRutina.value.filter(
      ex => ex.nom_exercicis && String(ex.nom_exercicis).trim() && Number(ex.n_repeticions) > 0
    )

    // Llamada al backend
    const response = await axios.post('/api/session/save', {
      userId,
      nom: nombreRutina.value,
      descripcio: null, // opcional: añadir descripción si quieres
      exercicis: ejerciciosParaGuardar
    })

    if (response.data?.success) {
      mensaje.value = 'Rutina creada correctamente.'
      // opcional: guardar ID creada
      idRutinaCreada.value = response.data.rutinaId
      setTimeout(() => router.push('/individual'), 1500)
    } else {
      mensaje.value = 'Error al guardar la rutina.'
    }
  } catch (error) {
    console.error('Error en guardarRutina:', error)
    if (error.response?.data?.error) {
      mensaje.value = `Error: ${error.response.data.error}`
    } else {
      mensaje.value = 'Error al guardar la rutina.'
    }
  } finally {
    cargando.value = false
  }
}
</script>

<style scoped>
.app-background {
  background: linear-gradient(135deg, #121212, #1c1c1c);
  color: #E0E0E0;
  min-height: 100vh;
}
.v-card {
  background-color: #212121 !important;
  border: 1px solid #333;
  color: white;
}
.v-btn {
  font-weight: bold;
}
</style>