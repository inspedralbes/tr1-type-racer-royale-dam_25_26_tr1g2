<template>
  <v-container class="py-8">
    <v-row justify="center">
      <v-col cols="12" md="8">
        <v-card class="elevation-2">
          <v-card-title class="text-h4 text-center py-6 primary--text">
            Guía de Ayuda
          </v-card-title>
          
          <v-card-text class="pa-6">
            <v-expansion-panels>
              <!-- Introducción -->
              <v-expansion-panel>
                <v-expansion-panel-title>
                  <v-icon start color="primary" class="mr-2">mdi-information</v-icon>
                  ¿Qué es Train AI?
                </v-expansion-panel-title>
                <v-expansion-panel-text>
                  Train AI es una aplicación educativa que combina el aprendizaje con la diversión. Te permite mejorar tus habilidades mientras compites con otros usuarios en tiempo real.
                </v-expansion-panel-text>
              </v-expansion-panel>

              <!-- Cómo Empezar -->
              <v-expansion-panel>
                <v-expansion-panel-title>
                  <v-icon start color="primary" class="mr-2">mdi-play-circle</v-icon>
                  Cómo Empezar
                </v-expansion-panel-title>
                <v-expansion-panel-text>
                  <ol class="ml-4">
                    <li class="mb-2">Regístrate en la plataforma usando el botón "SIGN UP"</li>
                    <li class="mb-2">Inicia sesión con tus credenciales</li>
                    <li class="mb-2">Únete a una sala existente o crea una nueva</li>
                    <li>¡Comienza a jugar y aprender!</li>
                  </ol>
                </v-expansion-panel-text>
              </v-expansion-panel>

              <!-- Funcionalidades Principales -->
              <v-expansion-panel>
                <v-expansion-panel-title>
                  <v-icon start color="primary" class="mr-2">mdi-star</v-icon>
                  Funcionalidades Principales
                </v-expansion-panel-title>
                <v-expansion-panel-text>
                  <v-list>
                    <v-list-item>
                      <v-list-item-title class="font-weight-bold">Crear Sala</v-list-item-title>
                      <v-list-item-subtitle>Configura una nueva sala de juego con tus preferencias</v-list-item-subtitle>
                    </v-list-item>

                    <v-list-item>
                      <v-list-item-title class="font-weight-bold">Unirse a Sala</v-list-item-title>
                      <v-list-item-subtitle>Únete a salas existentes y compite con otros jugadores</v-list-item-subtitle>
                    </v-list-item>

                    <v-list-item>
                      <v-list-item-title class="font-weight-bold">Jugar</v-list-item-title>
                      <v-list-item-subtitle>Participa en las competencias y mejora tus habilidades</v-list-item-subtitle>
                    </v-list-item>
                  </v-list>
                </v-expansion-panel-text>
              </v-expansion-panel>

              <!-- Reglas del Juego -->
              <v-expansion-panel>
                <v-expansion-panel-title>
                  <v-icon start color="primary" class="mr-2">mdi-gavel</v-icon>
                  Reglas del Juego
                </v-expansion-panel-title>
                <v-expansion-panel-text>
                  <ul class="ml-4">
                    <li class="mb-2">Sé respetuoso con todos los participantes</li>
                    <li class="mb-2">No uses herramientas de auto-completado o bots</li>
                    <li class="mb-2">Espera a que la partida comience antes de empezar</li>
                    <li>¡Diviértete y aprende!</li>
                  </ul>
                </v-expansion-panel-text>
              </v-expansion-panel>

              <!-- Solución de Problemas -->
              <v-expansion-panel>
                <v-expansion-panel-title>
                  <v-icon start color="primary" class="mr-2">mdi-help-circle</v-icon>
                  Solución de Problemas
                </v-expansion-panel-title>
                <v-expansion-panel-text>
                  <v-list>
                    <v-list-item>
                      <v-list-item-title class="font-weight-bold">Problemas de Conexión</v-list-item-title>
                      <v-list-item-subtitle>Verifica tu conexión a internet y recarga la página</v-list-item-subtitle>
                    </v-list-item>

                    <v-list-item>
                      <v-list-item-title class="font-weight-bold">Error al Crear Sala</v-list-item-title>
                      <v-list-item-subtitle>Intenta cerrar sesión y volver a iniciar</v-list-item-subtitle>
                    </v-list-item>

                    <v-list-item>
                      <v-list-item-title class="font-weight-bold">Otros Problemas</v-list-item-title>
                      <v-list-item-subtitle>Contacta con el soporte técnico</v-list-item-subtitle>
                    </v-list-item>
                  </v-list>
                </v-expansion-panel-text>
              </v-expansion-panel>
            </v-expansion-panels>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
// No se necesita lógica adicional por ahora
</script>

<style scoped>
.v-expansion-panel-text__wrapper {
  padding: 12px;
}

.v-list-item {
  padding: 12px 0;
}
</style>