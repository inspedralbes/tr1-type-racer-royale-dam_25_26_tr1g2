<template>
  <v-app dark class="app-background">
    <v-main>
      <v-container class="fill-height d-flex align-center justify-center pa-4" fluid>
        <v-card
          elevation="20"
          class="pa-8 rounded-xl text-center start-card"
          max-width="700"
          dark
        >
          <v-card-title class="justify-center flex-column pb-6 text-center">
            <h1 class="title-main font-weight-black mb-3">
              Entrenador Virtual
            </h1>
            <p class="subtitle-1 grey--text text--lighten-1 title-sub">
              Escull una opció per començar el teu entrenament:
            </p>
          </v-card-title>

          <v-card-text>
            <v-row class="mt-4" dense>
              <v-col cols="12" class="mb-3">
                <v-btn
                  color="primary"
                  x-large
                  rounded
                  block
                  class="responsive-btn"
                  @click="goCreateRoom"
                >
                  <v-icon left large>mdi-plus-box</v-icon>
                  Crear Sala
                </v-btn>
              </v-col>

              <v-col cols="12" class="mb-3">
                <v-btn
                  color="secondary"
                  x-large
                  rounded
                  block
                  class="responsive-btn"
                  @click="goJoinRoom"
                >
                  <v-icon left large>mdi-account-multiple-plus</v-icon>
Unir-se a Sala
                </v-btn>
              </v-col>

              <v-col cols="12" class="mb-3">
                <v-btn
                  color="teal"
                  x-large
                  rounded
                  block
                  class="responsive-btn"
                  @click="goSoloMode"
                >
                  <v-icon left large>mdi-run-fast</v-icon>
            Mode Individual                
              </v-btn>
              </v-col>

              <v-col cols="12" class="mb-3">
                <v-btn
                  x-large
                  rounded
                  block
                  class="responsive-btn"
                  style="background: linear-gradient(90deg, #b71c1c 0%, #ff1744 100%); color: #fff;"
                  @click="goRaidMode"
                >
                  <v-icon left large>mdi-fire</v-icon>
            Mode Incursió                
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
const goRaidMode = () => router.push('/incursion')
</script>

<style>
/* -------------------------------------------------------------------------- */
/* FONDO Y TARJETA PRINCIPAL */
/* -------------------------------------------------------------------------- */

.app-background {
  background: linear-gradient(135deg, #121212 0%, #1c1c1c 100%);
  color: #E0E0E0;
}

.start-card {
  border: 1px solid #333;
  background-color: #1E1E1E !important;
}

/* -------------------------------------------------------------------------- */
/* TÍTULOS */
/* -------------------------------------------------------------------------- */

.title-main {
  color: #fff;
  font-size: clamp(1.8rem, 4vw, 2.6rem);
  text-align: center;
  margin-bottom: 1rem;
}

.title-sub {
  white-space: normal;
  word-wrap: break-word;
  text-align: center;
  line-height: 1.4;
  margin: 0 auto;
  max-width: 90%;
  font-size: clamp(0.95rem, 2.5vw, 1.2rem);
  color: #ccc;
}

/* -------------------------------------------------------------------------- */
/* BOTONES */
/* -------------------------------------------------------------------------- */

.v-btn {
  font-weight: bold;
  text-transform: none;
}

.responsive-btn {
  display: flex !important;
  align-items: center;
  justify-content: center;
  white-space: normal !important;
  text-align: center !important;
  padding: 14px 18px !important;
  font-size: clamp(1rem, 2.5vw, 1.2rem) !important;
  min-height: 58px;
  transition: transform 0.25s ease, box-shadow 0.25s ease;
}

.responsive-btn:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 20px rgba(255, 255, 255, 0.15);
}

.v-btn__content {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  flex-wrap: nowrap !important;
}

.v-icon {
  margin-right: 8px;
}

/* -------------------------------------------------------------------------- */
/* RESPONSIVE */
/* -------------------------------------------------------------------------- */

@media (max-width: 600px) {
  .start-card {
    padding: 24px !important;
  }

  .title-main {
    line-height: 1.2;
  }

  .title-sub {
    font-size: 1rem;
    max-width: 100%;
    padding: 0 8px;
  }

  .responsive-btn {
    font-size: 1rem !important;
    padding: 12px 10px !important;
  }

  .v-icon {
    font-size: 22px !important;
    margin-right: 6px !important;
  }
}
</style>
