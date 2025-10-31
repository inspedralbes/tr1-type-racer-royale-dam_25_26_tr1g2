<template>
  <v-app dark class="app-background">
    <v-main>
      <v-container class="fill-height d-flex align-center justify-center pa-4" fluid>
        <v-card elevation="20" class="pa-8 rounded-xl text-center raid-card" max-width="700" dark>
          <v-card-title class="justify-center pb-6">
            <h1 class="text-h4 font-weight-black mb-2" style="color:#ff1744">
              <v-icon left large color="red darken-3">mdi-fire</v-icon>
              Modo Incursión
            </h1>
            <p class="subtitle-1 grey--text text--lighten-1">
              ¡Prepárate para el reto más intenso! Enfréntate a desafíos cooperativos de alta dificultad.
            </p>
          </v-card-title>
          <v-card-text>
            <v-alert type="error" border="left" colored-border elevation="2" class="mb-6">
              Este modo está en desarrollo. ¡Próximamente disponible!
            </v-alert>
            <v-btn color="primary" rounded to="/inicial">
              <v-icon left>mdi-arrow-left</v-icon>
              Volver
            </v-btn>
          </v-card-text>
        </v-card>
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup>
import { useRouter } from 'vue-router'
const router = useRouter()
const goBack = () => router.push('/')
</script>

<style>
.raid-card {
  border: 2px solid #b71c1c;
  box-shadow: 0 0 24px 4px #ff174455;
}
.app-background {
  background: linear-gradient(135deg, #121212 0%, #1c1c1c 100%);
  color: #E0E0E0;
}
</style>
