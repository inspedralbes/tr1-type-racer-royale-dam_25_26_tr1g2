<template>
  <v-app class="app-background">
    <v-main>
      <v-container class="fill-height d-flex align-center justify-center pa-4" fluid>
        <v-card
          elevation="16"
          class="pa-6 rounded-xl text-center card-elevated"
          max-width="800"
        >
          <v-card-title class="justify-center pt-0 pb-2">
            <span class="text-h6 font-weight-bold text-main text-uppercase mb-1">
              <v-icon small left color="primary">mdi-lightning-bolt</v-icon>
              Tecnologia en temps real
            </span>
            <h1 class="text-h4 text-md-h3 font-weight-black mb-2 text-main">
              TRAIN AI
            </h1>
          </v-card-title>

          <v-card-text>
            <p class="text-body-1 mb-3 text-muted {color: 'white'}">
              Benvingut/da a la plataforma d'entrenament sincronitzat. Analitzem els teus moviments amb MoveNet de TensorFlow.js per oferir feedback instantani i precís.
            </p>
            <p class="text-body-2 mb-4 text-secondary-text">
              La IA s'executa al client (privacitat garantida) i les dades es sincronitzen amb WebSockets natius.
            </p>

            <v-row class="mb-4">
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
              <div class="text-subtitle-1 font-weight-bold mb-2 text-main">
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
                class="button-shadow px-10 py-5 d-flex align-center justify-center"
                rounded
                @click="goToInicial"
                elevation="12"
              >
                <v-icon size="32" class="mr-2">mdi-run-fast</v-icon>
                <span class="text-h5 font-weight-bold">Comença a Entrenar ara</span>
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
/* DEFINICIÓN DE VARIABLES CSS NATIVAS (CSS Custom Properties)                 */
/* -------------------------------------------------------------------------- */

/* MODO CLARO (Default) */
:root {
  --bg-color: #f5f5f5;
  --card-color: #ffffff;
  --tech-card-color: #f8f8f8;
  --text-color: #222; /* Color principal de texto (H1, H2, etc.) */
  --text-muted: #555; /* Texto para párrafos */
  --secondary-color-text: #757575; /* Texto secundario */
  --primary-color-text: #1976D2; /* Color 'primary' de Vuetify en modo claro */
}

/* MODO OSCURO (Anula las variables anteriores si el sistema lo prefiere) */
@media (prefers-color-scheme: dark) {
  :root {
    --bg-color: linear-gradient(135deg, #121212 0%, #1c1c1c 100%);
    --card-color: #212121;
    --tech-card-color: #2c2c2c;
    --text-color: #e0e0e0;
    --text-muted: #aaa;
    --secondary-color-text: #999;
    --primary-color-text: #4FC3F7; /* Un azul más claro para 'primary' en modo oscuro */
  }
}

/* -------------------------------------------------------------------------- */
/* APLICACIÓN DE ESTILOS PERSONALIZADOS                                       */
/* -------------------------------------------------------------------------- */

/* CLASES DE TEXTO ADAPTATIVAS (Para reemplazar clases de Vuetify como primary--text) */
/* CLAVE: Usamos !important para asegurar que anule la clase de color por defecto de Vuetify. */
.text-main {
  color: var(--text-color) !important;
}
.text-muted {
  color: var(--text-muted) !important;
}
.text-secondary-text {
  color: var(--secondary-color-text) !important;
}

/* CLAVE: Reemplazar el color primario de Vuetify para que se adapte al tema */
.v-application .primary--text {
  color: var(--primary-color-text) !important;
  caret-color: var(--primary-color-text) !important;
}

/* ESTILOS DE LA APLICACIÓN Y COMPONENTES */

.app-background {
  background: var(--bg-color) !important;
  color: var(--text-color) !important;
  min-height: 100vh;
}

.card-elevated {
  background-color: var(--card-color) !important;
  /* Usamos una variable de texto atenuado para el borde, que se invierte con el tema */
  border: 1px solid var(--text-muted); 
}

.technologies-card {
  background-color: var(--tech-card-color) !important;
}

/* --- OTROS ESTILOS (BOTONES, CHIPS, ETC.) --- */
.feature-card {
  transition: transform 0.3s ease-in-out;
  opacity: 0.95;
}

.feature-card:hover {
  transform: translateY(-3px);
  opacity: 1;
}

.button-shadow {
  font-size: 1.2rem;
  height: 80px;
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

.tech-chip {
  font-weight: bold;
  color: #ffffff !important;
  background-color:rgb(20, 20, 20) !important;
}
</style>