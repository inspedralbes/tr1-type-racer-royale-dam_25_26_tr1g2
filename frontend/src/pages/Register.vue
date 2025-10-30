<template>
  <v-container class="fill-height">
    <v-row justify="center" align="center">
      <v-col cols="12" sm="8" md="6" lg="4">
        <v-card class="elevation-12 pa-6">
          <v-card-title class="text-h5 text-center mb-4">
            Registro de Usuario
          </v-card-title>
          <v-form @submit.prevent="handleRegister" v-model="isFormValid">
            <v-text-field
              v-model="username"
              :rules="usernameRules"
              label="Nombre de usuario"
              required
              prepend-icon="mdi-account"
              variant="outlined"
              class="mb-4"
            ></v-text-field>

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
              Registrarse
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
            ¿Ya tienes una cuenta?
            <router-link to="/login" class="text-decoration-none">
              Iniciar sesión
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
const username = ref('')
const email = ref('')
const password = ref('')

// Reglas de validación
const usernameRules = [
  v => !!v || 'El nombre de usuario es requerido',
  v => v.length >= 3 || 'El nombre de usuario debe tener al menos 3 caracteres'
]

const emailRules = [
  v => !!v || 'El email es requerido',
  v => /.+@.+\..+/.test(v) || 'El email debe ser válido'
]

const passwordRules = [
  v => !!v || 'La contraseña es requerida',
  v => v.length >= 6 || 'La contraseña debe tener al menos 6 caracteres'
]

// Función de registro
const handleRegister = async () => {
  try {
    loading.value = true
    error.value = null

    // Aquí deberías implementar la lógica de registro con tu backend
    // Por ejemplo:
    // await fetch('/api/register', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     username: username.value,
    //     email: email.value,
    //     password: password.value
    //   })
    // })

    // Si el registro es exitoso, redirigir al login
    router.push('/login')
  } catch (err) {
    error.value = 'Error al registrar el usuario. Por favor, inténtalo de nuevo.'
    console.error('Error de registro:', err)
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
