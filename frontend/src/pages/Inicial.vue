<template>
  <v-app dark class="app-background">
    <v-main>
      <v-container class="fill-height d-flex align-center justify-center pa-4" fluid>
        <v-card elevation="20" class="pa-8 rounded-xl text-center start-card" max-width="700" dark>
          <v-card-title class="justify-center pb-6">
            <h1 class="text-h4 font-weight-black mb-2">Entrenador Virtual</h1>
            <p class="subtitle-1 grey--text text--lighten-1">
              Escull una opció per començar el teu entrenament:
            </p>
          </v-card-title>

          <v-card-text>
            <v-row class="mt-4" dense>
              <v-col cols="12" sm="12" md="12" class="mb-4">
                <v-btn color="primary" xx-large rounded block @click="goCreateRoom">
                  <v-icon left large>mdi-plus-box</v-icon>
                  Crear Sala
                </v-btn>
              </v-col>
              <v-col cols="12" sm="12" md="12" class="mb-4">
                <v-btn color="secondary" xx-large rounded block @click="goJoinRoom">
                  <v-icon left large>mdi-account-multiple-plus</v-icon>
                  Unirse a Sala
                </v-btn>
              </v-col>
              <v-col cols="12" sm="12" md="12">
                <v-btn color="teal" xx-large rounded block @click="goSoloMode">
                  <v-icon left large>mdi-run-fast</v-icon>
                  Modo Individual
                </v-btn>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup>
import { useRouter } from 'vue-router'
const router = useRouter()

const goCreateRoom = () => router.push('/crearSala')
const goJoinRoom = () => router.push('/unirsala')
const goSoloMode = () => router.push('/individual')
</script>

<style>
.app-background {
  background: linear-gradient(135deg, #121212 0%, #1c1c1c 100%);
  color: #E0E0E0;
}

.start-card {
  border: 1px solid #333;
}

.v-btn {
  font-weight: bold;
}
</style>
