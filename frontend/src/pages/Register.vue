<template>
  <v-container class="fill-height">
    <v-row justify="center" align="center">
      <v-col cols="12" sm="8" md="6" lg="4">
        <v-card class="elevation-12 pa-6">
          <v-card-title class="text-h5 text-center mb-4">
Registre d'Usuari
          </v-card-title>
          <v-form @submit.prevent="handleRegister" v-model="isFormValid">
            <v-text-field
              v-model="username"
              :rules="usernameRules"
              label="Nom d'usuari"
              required
              prepend-icon="mdi-account"
              variant="outlined"
              class="mb-4"
            ></v-text-field>

            <v-text-field
              v-model="email"
              :rules="emailRules"
              label="Correu electrònic"
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
              Registrar-se
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
Ja tens un compte?
            <router-link to="/login" class="text-decoration-none">
Inicia la sessió
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
  v => !!v || 'El nom d\'usuari és obligatori',
  v => v.length >= 3 || 'El nom d\'usuari ha de tenir almenys 3 caràcters'
]
const emailRules = [
  v => !!v || 'El correu electrònic és obligatori',
  v => /.+@.+\..+/.test(v) || 'El correu electrònic ha de ser vàlid'
]

const passwordRules = [
  v => !!v || 'La contrasenya és obligatòria',
  v => v.length >= 6 || 'La contrasenya ha de tenir almenys 6 caràcters'
]

const API_URL = 'http://localhost:9000';

const handleRegister = async () => {
  try {
    loading.value = true
    error.value = null

    const res = await fetch(`${API_URL}/api/users/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: username.value,
        email: email.value,
        password: password.value
      })
    })

    if (res.ok) {
      router.push('/login')
    } else {
      const data = await res.json()
      error.value = data.error || 'Error al registrar el usuario.'
    }
  } catch (err) {
    error.value = 'Error en registrar l\'usuari. Si us plau, intenta-ho de nou.' // Traduït
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
