// filepath: frontend/src/pages/Login.vue
<template>
  <v-container class="fill-height">
    <v-row justify="center" align="center">
      <v-col cols="12" sm="8" md="6" lg="4">
        <v-card class="elevation-12 pa-6">
          <v-card-title class="text-h5 text-center mb-4">Iniciar sesión</v-card-title>
          <v-form @submit.prevent="handleLogin" v-model="isFormValid">
            <v-text-field
              v-model="email"
              label="Email"
              type="email"
              required
              prepend-icon="mdi-email"
              variant="outlined"
              class="mb-4"
            />
            <v-text-field
              v-model="password"
              label="Contraseña"
              type="password"
              required
              prepend-icon="mdi-lock"
              variant="outlined"
              class="mb-6"
            />
            <v-btn color="primary" block size="large" type="submit" :disabled="loading || !isFormValid" :loading="loading">
              Entrar
            </v-btn>
            <v-alert v-if="error" type="error" class="mt-4" closable>{{ error }}</v-alert>
          </v-form>
          <div class="text-center mt-4">
            ¿No tienes cuenta?
            <router-link to="/register" class="text-decoration-none">Regístrate</router-link>
          </div>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
const { login } = useAuth()
const router = useRouter()
const isFormValid = ref(true)
const loading = ref(false)
const error = ref(null)
const email = ref('')
const password = ref('')

// Usa la misma variable VITE_API_URL que Register.vue
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:9000'

const handleLogin = async () => {
  loading.value = true
  error.value = null
  try {
    const res = await fetch(`${API_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ correu: email.value, password: password.value })
    })

    if (!res.ok) {
      let errMsg = `Error ${res.status}`
      try {
        const errJson = await res.json()
        errMsg = errJson.error || errJson.message || errMsg
      } catch {}
      error.value = errMsg
      return
    }

    const data = await res.json()
    if (data.success) {
      // guarda userId/usuari si quieres
      localStorage.setItem('user', JSON.stringify({ id: data.userId, usuari: data.usuari }))
      router.push('/')
    } else {
      error.value = data.error || data.message || 'Error al iniciar sesión'
    }
  } catch (e) {
    console.error(e)
    error.value = 'Error de conexión con el servidor. Comprueba la URL del API y CORS.'
  } finally {
    loading.value = false
  }
  try {
    loading.value = true
    error.value = null
await new Promise(resolve => setTimeout(resolve, 1000))
login({
      email: email.value,
     })
router.push('/inicial')
  } catch (err) {
    error.value = 'Error al iniciar sesión. Por favor, verifica tus credenciales.'
    console.error('Error de login:', err)
  } finally {
    loading.value = false
  }
   
}
</script>

<style scoped>
.v-container { background-color: rgba(245,245,245,0.13); }
</style>