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

// Importar useAuth
import { useAuth } from '@/composables/useAuth'
const { login } = useAuth()

// Función de login
const handleLogin = async () => {
  try {
    loading.value = true
    error.value = null

    // Aquí implementarías la lógica de login con tu backend
    // Por ahora, simulamos un login exitoso
    await new Promise(resolve => setTimeout(resolve, 1000)) // Simular delay de red
    
    // Login exitoso: establecer estado de autenticación
    login({
      email: email.value,
      // Aquí puedes incluir más datos del usuario si es necesario
    })

    // Redirigir a la página principal
    router.push('/inicial')
  } catch (err) {
    error.value = 'Error al iniciar sesión. Por favor, verifica tus credenciales.'
    console.error('Error de login:', err)
  } finally {
    loading.value = false
  }
}
</script>

