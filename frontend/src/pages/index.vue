<template>
  <v-app dark class="app-background">
    <v-main>
      <v-container class="fill-height d-flex align-center justify-center pa-4 pa-sm-8" fluid>
        <v-card
          elevation="20"
          class="pa-8 pa-md-12 rounded-xl text-center card-elevated"
          max-width="900"
          dark
        >
          <v-card-title class="justify-center pt-0 pb-6">
            <span class="text-h6 font-weight-bold primary--text text-uppercase mb-2">
              <v-icon small left color="primary">mdi-lightning-bolt</v-icon>
              Tecnologia en temps real
            </span>
            <h1 class="text-h4 text-sm-h3 text-md-h1 font-weight-black mb-4">
              TRAIN IA
            </h1>
          </v-card-title>
          <v-card-text>
            <p class="text-body-1 mb-6 grey--text text--lighten-1">
              Benvingut/da a la plataforma d'entrenament sincronitzat. Analitzem els teus moviments mitjançant el model MoveNet de TensorFlow.js per a un feedback instantani i precís sobre la teva tècnica i repeticions.
            </p>
            <p class="text-body-2 mb-8 secondary--text">
              La IA s'executa al client (privacitat garantida) i les dades es sincronitzen amb WebSockets natius.
            </p>

            <v-row class="mb-8">
              <v-col v-for="(feature, i) in features" :key="i" cols="12" sm="6" lg="3">
                <v-card flat class="pa-4 rounded-lg feature-card" dark :color="feature.color">
                  <v-icon large class="mb-2" color="white">{{ feature.icon }}</v-icon>
                  <div class="text-subtitle-1 font-weight-bold white--text">{{ feature.title }}</div>
                  <div class="caption white--text">{{ feature.text }}</div>
                </v-card>
              </v-col>
            </v-row>

            <v-card flat class="pa-4 rounded-lg technologies-card" dark>
              <div class="text-subtitle-1 font-weight-bold mb-2 primary--text">Tecnologies Implementades</div>
              <div class="d-flex flex-wrap justify-center">
                <v-chip v-for="(tech, i) in technologies" :key="i" class="ma-1 tech-chip" small dark>
                  {{ tech }}
                </v-chip>
              </div>
            </v-card>

            <v-btn color="primary" x-large rounded @click="goToInicial">
            <v-icon left>mdi-run-fast</v-icon>
            Comença a Entrenar ara
            </v-btn>

            <p class="caption mt-6 grey--text text--lighten-1">
              Projecte de programació col·laborativa - Tècniques Modernes de Web i IA.
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
  'Vue.js (Composition API)', 'Vuetify', 'Pinia', 'Node.js/Express', 'WebSockets Natius',
  'MySQL', 'TensorFlow.js', 'MoveNet'
];

const features = [
  { icon: 'mdi-brain', title: 'IA al Client', text: "Anàlisi MoveNet sense enviar dades al servidor per a màxima privacitat.", color: 'teal darken-3' },
  { icon: 'mdi-timer-sand', title: 'Feedback Instantani', text: 'Correcció de tècnica i recompte de repeticions en mil·lisegons.', color: 'red darken-3' },
  { icon: 'mdi-web', title: 'Multijugador', text: "Sincronització de l'estat de tots els usuaris en temps real via WebSockets.", color: 'blue darken-3' },
  { icon: 'mdi-database', title: 'Persistència de Dades', text: 'Guardem sessions i progressions a la base de dades MySQL.', color: 'deep-purple darken-3' },
];
</script>

<style>
.app-background {
  background: linear-gradient(135deg, #121212 0%, #1c1c1c 100%);
  color: #E0E0E0;
}

.card-elevated {
  background-color: #212121;
  border: 1px solid #333;
}

.mt-8 button-shadow{
  height: 100px;
}
.button-shadow {
  box-shadow: 0 5px 20px 0 rgba(0, 188, 212, 0.4);
  transition: all 0.3s ease-in-out;
}
.button-shadow:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px 0 rgba(0, 188, 212, 0.6);
}

.feature-card {
  transition: transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out;
  cursor: default;
  opacity: 0.9;
}
.feature-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 20px -5px rgba(0, 0, 0, 0.5);
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
