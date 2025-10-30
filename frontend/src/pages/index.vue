<template>
  <v-app dark class="app-background">
    <v-main>
      <v-container class="fill-height d-flex align-center justify-center pa-4" fluid>
        <v-card
          elevation="16"
          class="pa-6 rounded-xl text-center card-elevated"
          max-width="800"
          dark
        >
          <v-card-title class="justify-center pt-0 pb-2">
            <span class="text-h6 font-weight-bold primary--text text-uppercase mb-1">
              <v-icon small left color="primary">mdi-lightning-bolt</v-icon>
              Tecnologia en temps real
            </span>
            <h1 class="text-h4 text-md-h3 font-weight-black mb-2">
              TRAIN AI
            </h1>
          </v-card-title>

          <v-card-text>
            <p class="text-body-1 mb-3 grey--text text--lighten-1">
              Benvingut/da a la plataforma d'entrenament sincronitzat. Analitzem els teus moviments amb MoveNet de TensorFlow.js per oferir feedback instantani i precís.
            </p>
            <p class="text-body-2 mb-4 secondary--text">
              La IA s'executa al client (privacitat garantida) i les dades es sincronitzen amb WebSockets natius.
            </p>

            <!-- FEATURES -->
            <v-row class="mb-4">
              <v-col v-for="(feature, i) in features" :key="i" cols="12" sm="6" lg="3">
                <v-card flat class="pa-3 rounded-lg feature-card" dark :color="feature.color">
                  <v-icon large class="mb-1" color="white">{{ feature.icon }}</v-icon>
                  <div class="text-subtitle-1 font-weight-bold white--text">{{ feature.title }}</div>
                </v-card>
              </v-col>
            </v-row>

            <!-- TECHNOLOGIES -->
            <v-card flat class="pa-2 rounded-lg technologies-card mb-6" dark>
              <div class="text-subtitle-1 font-weight-bold mb-2 primary--text">Tecnologies</div>
              <div class="d-flex flex-wrap justify-center">
                <v-chip
                  v-for="(tech, i) in technologies"
                  :key="i"
                  class="ma-1 tech-chip"
                  small
                  dark
                >
                  {{ tech }}
                </v-chip>
              </div>
            </v-card>

            <!-- BOTÓN -->
            <div class="d-flex justify-center">
            <v-btn
              color="primary"
              class="button-shadow px-10 py-5 d-flex align-center justify-center"
              rounded
              @click="goToInicial"
              elevation="12"
              >
              <v-icon size="32" class="mr-2">mdi-run-fast</v-icon>
             <span class="text-h5 font-weight-bold">Comença a Entrenar ara</span>
              </v-btn>
            </div>


            <p class="caption mt-4 grey--text text--lighten-1">
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
  { icon: 'mdi-brain', title: 'IA al Client', color: 'teal darken-3' },
  { icon: 'mdi-timer-sand', title: 'Feedback Ràpid', color: 'red darken-3' },
  { icon: 'mdi-web', title: 'Multijugador', color: 'blue darken-3' },
  { icon: 'mdi-database', title: 'Dades Segures', color: 'deep-purple darken-3' }
]
</script>

<style>
.app-background {
  background: linear-gradient(135deg, #121212 0%, #1c1c1c 100%);
  color: #E0E0E0;
}

/* CARD */
.card-elevated {
  background-color: #212121;
  border: 1px solid #333;
}

/* Botón más visible */
.button-shadow {
  font-size: 1.2rem;
  height: 80px; /* un poco más alto */
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6px 20px 0 rgba(33, 150, 243, 0.45);
  transition: all 0.25s ease-in-out;
}

.button-shadow:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 30px 0 rgba(33, 150, 243, 0.7);
}

.v-btn__content {
  display: flex;
  align-items: center;
  justify-content: center;
}


/* Mini cards */
.feature-card {
  transition: transform 0.3s ease-in-out;
  opacity: 0.9;
}
.feature-card:hover {
  transform: translateY(-3px);
  opacity: 1;
}

.technologies-card {
  background-color: #2c2c2c;
}

.tech-chip {
  font-weight: bold;
  color: #ffffff !important;
  background-color: #1de9b6;
}
</style>
