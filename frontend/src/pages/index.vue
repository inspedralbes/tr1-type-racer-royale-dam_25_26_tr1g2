<template>
  <v-app class="app-background">
    <v-main>
      <v-container class="fill-height d-flex align-center justify-center pa-4" fluid>
        <v-card
          elevation="16"
          class="pa-6 rounded-xl text-center card-elevated"
          max-width="800"
        >
          <v-card-title class="justify-center flex-column pt-0 pb-2 text-center">
            <div class="d-flex align-center justify-center flex-wrap text-center title-container">
              <v-icon small left color="primary" class="mr-1">mdi-lightning-bolt</v-icon>
              <span class="text-h6 font-weight-bold text-main text-uppercase mb-1 title-responsive">
                Tecnologia en temps real
              </span>
            </div>
            <h1 class="text-h4 text-md-h3 font-weight-black mb-2 text-main title-train-ai">
              TRAIN AI
            </h1>
          </v-card-title>

          <v-card-text>
            <p class="text-body-1 mb-3 text-muted">
              Benvingut/da a la plataforma d'entrenament sincronitzat. Analitzem els teus moviments amb MoveNet de TensorFlow.js per oferir feedback instantani i precís.
            </p>
            <p class="text-body-2 mb-4 text-secondary-text">
              La IA s'executa al client (privacitat garantida) i les dades es sincronitzen amb WebSockets natius.
            </p>

         <v-row class="mb-4 d-none d-sm-flex">
              <v-col
                v-for="(feature, i) in features"
                :key="i"
                cols="12"
                sm="6"
                lg="3"
              >
                <v-card
                  flat
                  class="pa-3 rounded-lg feature-card"
                  :style="{ backgroundColor: feature.color }"
                >
                  <v-icon large class="mb-1" color="white">{{ feature.icon }}</v-icon>
                  <div class="text-subtitle-1 font-weight-bold white--text">{{ feature.title }}</div>
                </v-card>
              </v-col>
            </v-row>

            <v-card flat class="pa-2 rounded-lg technologies-card mb-6">
              <div class="text-subtitle-1 font-weight-bold mb-2 text-main tech-title">
                Tecnologies
              </div>
              <div class="d-flex flex-wrap justify-center">
                <v-chip
                  v-for="(tech, i) in technologies"
                  :key="i"
                  class="ma-1 tech-chip"
                  small
                >
                  {{ tech }}
                </v-chip>
              </div>
            </v-card>

            <div class="d-flex justify-center">
              <v-btn
                color="primary"
                class="button-shadow d-flex align-center justify-center text-center"
                rounded
                @click="goToInicial"
                elevation="12"
              >
                <div class="d-flex align-center justify-center flex-nowrap">
                  <v-icon size="28" class="mr-2">mdi-run-fast</v-icon>
                  <span class="text-h6 font-weight-bold no-wrap-text">Comença a Entrenar ara</span>
                </div>
              </v-btn>
            </div>

            <p class="caption mt-4 text-muted">
              Projecte col·laboratiu.
            </p>
          </v-card-text>
        </v-card>
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup>
import { useRouter } from 'vue-router'
const router = useRouter()
const goToInicial = () => router.push('/inicial')

const technologies = [
  'Vue.js', 'Vuetify', 'Pinia', 'Node.js', 'WebSockets', 'MySQL', 'TensorFlow.js'
]

const features = [
  { icon: 'mdi-brain', title: 'IA al Client', color: '#00796B' },
  { icon: 'mdi-timer-sand', title: 'Feedback Ràpid', color: '#C62828' },
  { icon: 'mdi-web', title: 'Multijugador', color: '#1565C0' },
  { icon: 'mdi-database', title: 'Dades Segures', color: '#4527A0' }
]
</script>

<style>
/* -------------------------------------------------------------------------- */
/* VARIABLES DE COLOR */
/* -------------------------------------------------------------------------- */

:root {
  --bg-color: #f5f5f5;
  --card-color: #ffffff;
  --tech-card-color: #f8f8f8;
  --text-color: #222;
  --text-muted: #555;
  --secondary-color-text: #757575;
  --primary-color-text: #1976D2;
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg-color: linear-gradient(135deg, #121212 0%, #1c1c1c 100%);
    --card-color: #212121;
    --tech-card-color: #2c2c2c;
    --text-color: #e0e0e0;
    --text-muted: #aaa;
    --secondary-color-text: #999;
    --primary-color-text: #4FC3F7;
  }
}

/* -------------------------------------------------------------------------- */
/* ESTILOS GENERALES */
/* -------------------------------------------------------------------------- */

.text-main { color: var(--text-color) !important; }
.text-muted { color: var(--text-muted) !important; }
.text-secondary-text { color: var(--secondary-color-text) !important; }

.app-background {
  background: var(--bg-color) !important;
  color: var(--text-color) !important;
  min-height: 100vh;
}

.card-elevated {
  background-color: var(--card-color) !important;
  border: 1px solid var(--text-muted);
}

/* -------------------------------------------------------------------------- */
/* TÍTULOS Y BOTÓN RESPONSIVOS */
/* -------------------------------------------------------------------------- */

.title-container {
  flex-wrap: wrap;
  text-align: center;
}

.title-responsive {
  white-space: normal;
  word-wrap: break-word;
  line-height: 1.2;
  text-align: center;
}

.title-train-ai {
  font-size: 2.2rem;
}

@media (max-width: 600px) {
  .title-responsive {
    font-size: 1.1rem;
    display: block;
    text-align: center;
  }

  .title-train-ai {
    font-size: 1.8rem !important;
  }

  .button-shadow {
    font-size: 1rem !important;
    padding: 14px 20px !important;
    height: auto;
    white-space: normal;
  }

  .no-wrap-text {
    white-space: normal !important;
    text-align: center;
  }
}

/* -------------------------------------------------------------------------- */
/* BOTÓN */
/* -------------------------------------------------------------------------- */

.button-shadow {
  font-size: 1.2rem;
  min-height: 60px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6px 20px 0 rgba(33, 150, 243, 0.45);
  transition: all 0.25s ease-in-out;
  text-align: center;
}

.button-shadow:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 30px 0 rgba(33, 150, 243, 0.7);
}

.v-btn__content {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.no-wrap-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* -------------------------------------------------------------------------- */
/* OTRAS TARJETAS */
/* -------------------------------------------------------------------------- */

.technologies-card {
  background-color: var(--tech-card-color) !important;
}

.feature-card {
  transition: transform 0.3s ease-in-out;
  opacity: 0.95;
}

.feature-card:hover {
  transform: translateY(-3px);
  opacity: 1;
}

.tech-chip {
  font-weight: bold;
  color: #ffffff !important;
  background-color: rgb(20, 20, 20) !important;
}
</style>
