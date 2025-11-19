<template>
  <v-container class="fill-height">
    <v-row justify="center" align="center">
      <v-col cols="12" sm="8" md="6" lg="4">
        <v-card class="elevation-12 pa-6">
          <v-card-title class="text-h5 text-center mb-4">
Inicia la Sessió
          </v-card-title>
          <v-form @submit.prevent="handleLogin" v-model="isFormValid">
            <v-text-field
              v-model="email"
              :rules="emailRules"
              label="Correu Electrònic"
              type="email"
              required
              prepend-icon="mdi-email"
              variant="outlined"
              class="mb-4"
            ></v-text-field>

            <v-text-field
              v-model="password"
              :rules="passwordRules"
              label="Contrasenya"
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
Inicia la Sessió            </v-btn>

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
No tens un compte?            <router-link to="/register" class="text-decoration-none">
Registra-t'hi aquí            </router-link>
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
  v => !!v || 'El correu electrònic és requerit',
  v => /.+@.+\..+/.test(v) || 'El correu electrònic ha de ser vàlid'
]

const passwordRules = [
  v => !!v || 'La contrasenya és requerida',
  v => v.length >= 6 || 'La contrasenya ha de tenir almenys 6 caràcters'
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
    const response = await axios.post('/api/users/login', {
      email: email.value,
      password: password.value
    })

    // La respuesta de Sequelize ahora no tiene `success`, directamente devuelve los datos o un error.
    if (response.data && response.data.token) {
      const userData = { ...response.data.user, token: response.data.token };
      // Centralizamos el guardado en el composable
      login(userData);
      localStorage.setItem('user', JSON.stringify(userData)); // Guardamos todo el objeto de usuario
      // Disparar evento para que otras partes de la app reaccionen
      window.dispatchEvent(new CustomEvent('user-logged-in'))
      // Redirigir a la página principal
      router.push('/inicial')
    } else {
      error.value = response.data.error || 'Error en iniciar la sessió.'
    }
  } catch (err) {
    if (err.response && err.response.data && err.response.data.error) {
      // Si el backend envía un error específico (p.ej. "Usuario no encontrado")
      error.value = err.response.data.error;
    } else {
      // Error de red u otro problema
      error.value = 'Error en iniciar la sessió. Si us plau, verifica les teves credencials i la connexió.'
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
