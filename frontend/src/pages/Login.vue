<template>
  <v-container class="fill-height">
    <v-row justify="center" align="center">
      <v-col cols="12" sm="8" md="6" lg="4">
        <v-card class="elevation-12 pa-6">
          <v-card-title class="text-h5 text-center mb-4">
            Iniciar Sesión
          </v-card-title>
          <v-form @submit.prevent="handleLogin" v-model="isFormValid">
            <v-text-field
              v-model="email"
              :rules="emailRules"
              label="Email"
              type="email"
              required
              prepend-icon="mdi-email"
              variant="outlined"
              class="mb-4"
            ></v-text-field>

            <v-text-field
              v-model="password"
              :rules="passwordRules"
              label="Contraseña"
              type="password"
              required
              prepend-icon="mdi-lock"
              variant="outlined"
              class="mb-6"
            ></v-text-field>

            <v-btn
              color="primary"
              block
              size="large"
              type="submit"
              :disabled="!isFormValid"
              :loading="loading"
            >
              Iniciar Sesión
            </v-btn>

            <v-alert
              v-if="error"
              type="error"
              class="mt-4"
              closable
            >
              {{ error }}
            </v-alert>
          </v-form>

          <div class="text-center mt-4">
            ¿No tienes una cuenta?
            <router-link to="/register" class="text-decoration-none">
              Regístrate aquí
            </router-link>
          </div>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const isFormValid = ref(false)
const loading = ref(false)
const error = ref(null)

// Campos del formulario
const email = ref('')
const password = ref('')

// Reglas de validación
const emailRules = [
  v => !!v || 'El email es requerido',
  v => /.+@.+\..+/.test(v) || 'El email debe ser válido'
]

const passwordRules = [
  v => !!v || 'La contraseña es requerida',
  v => v.length >= 6 || 'La contraseña debe tener al menos 6 caracteres'
]

import { useAuth } from '@/composables/useAuth'
const { login } = useAuth()

import axios from 'axios'
axios.defaults.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:9000'

// Función de login
const handleLogin = async () => {
  try {
    loading.value = true
    error.value = null
    const response = await axios.post('/api/login', {
      correu: email.value,
      password: password.value
    })

    if (response.data.success) {
      // Guardar datos del usuario en localStorage
      login(response.data)
      localStorage.setItem('userId', response.data.userId) // Guardamos el ID directamente
      localStorage.setItem('username', response.data.usuari) // Guardamos el nombre de usuario
      localStorage.setItem('user', JSON.stringify(response.data))
      // Disparar evento para que otras partes de la app reaccionen
      window.dispatchEvent(new CustomEvent('user-logged-in'))
      // Redirigir a la página principal
      router.push('/inicial')
    } else {
      error.value = response.data.error || 'Error al iniciar sesión.'
    }
  } catch (err) {
    if (err.response && err.response.data && err.response.data.error) {
      // Si el backend envía un error específico (p.ej. "Usuario no encontrado")
      error.value = err.response.data.error;
    } else {
      // Error de red u otro problema
      error.value = 'Error al iniciar sesión. Por favor, verifica tus credenciales y la conexión.'
    }
    console.error('Error de login:', err)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.v-container {
  background-color:rgba(245, 245, 245, 0.13);
}
</style>
