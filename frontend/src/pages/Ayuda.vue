<template>
  <v-container class="py-8">
    <v-row justify="center">
      <v-col cols="12" md="8">
        <v-card class="elevation-2">
          <v-card-title class="text-h4 text-center py-6 primary--text">
Guia d'Ajuda
          </v-card-title>
          
          <v-card-text class="pa-6">
            <v-expansion-panels>
              <!-- Introducción -->
              <v-expansion-panel>
                <v-expansion-panel-title>
                  <v-icon start color="primary" class="mr-2">mdi-information</v-icon>
Què és Train AI?                </v-expansion-panel-title>
                <v-expansion-panel-text>
Train AI és una aplicació educativa que combina l'aprenentatge amb la diversió. Et permet millorar les teves habilitats mentre competeixes amb altres usuaris en temps real.                </v-expansion-panel-text>
              </v-expansion-panel>

              <!-- Cómo Empezar -->
              <v-expansion-panel>
                <v-expansion-panel-title>
                  <v-icon start color="primary" class="mr-2">mdi-play-circle</v-icon>
Com Començar                </v-expansion-panel-title>
                <v-expansion-panel-text>
                  <ol class="ml-4">
                    <li class="mb-2">Registra't a la plataforma utilitzant el botó "REGISTRE"</li>
                    <li class="mb-2">Inicia la sessió amb les teves credencials</li>
                    <li class="mb-2">Uneix-te a una sala existent o crea una de nova</li>
                    <li>Comença a jugar i a aprendre!</li>
                  </ol>
                </v-expansion-panel-text>
              </v-expansion-panel>

              <!-- Funcionalidades Principales -->
              <v-expansion-panel>
                <v-expansion-panel-title>
                  <v-icon start color="primary" class="mr-2">mdi-star</v-icon>
Funcionalitats Principals                </v-expansion-panel-title>
                <v-expansion-panel-text>
                  <v-list>
                    <v-list-item>
                      <v-list-item-title class="font-weight-bold">Crear Sala</v-list-item-title>
                      <v-list-item-subtitle>Configura una nova sala de joc amb les teves preferències</v-list-item-subtitle>
                    </v-list-item>

                    <v-list-item>
                      <v-list-item-title class="font-weight-bold">Unir-se a Sala</v-list-item-title>
                      <v-list-item-subtitle>Uneix-te a sales existents i competeix amb altres jugadors</v-list-item-subtitle>
                    </v-list-item>

                    <v-list-item>
                      <v-list-item-title class="font-weight-bold">Jugar</v-list-item-title>
                      <v-list-item-subtitle>Participa en les competicions i millora les teves habilitats</v-list-item-subtitle>
                    </v-list-item>
                  </v-list>
                </v-expansion-panel-text>
              </v-expansion-panel>

              <!-- Reglas del Juego -->
              <v-expansion-panel>
                <v-expansion-panel-title>
                  <v-icon start color="primary" class="mr-2">mdi-gavel</v-icon>
Regles del Joc                </v-expansion-panel-title>
                <v-expansion-panel-text>
                 <ul class="ml-4">
                    <li class="mb-2">Sigues respectuós amb tots els participants</li>
                    <li class="mb-2">No utilitzis eines d'autocompleció o bots</li>
                    <li class="mb-2">Espera que la partida comenci abans de començar</li>
                    <li>Diverteix-te i aprèn!</li>
                  </ul>
                </v-expansion-panel-text>
              </v-expansion-panel>

              <!-- Solución de Problemas -->
              <v-expansion-panel>
                <v-expansion-panel-title>
                  <v-icon start color="primary" class="mr-2">mdi-help-circle</v-icon>
Solució de Problemes                </v-expansion-panel-title>
                <v-expansion-panel-text>
                  <v-list>
                    <v-list-item>
                      <v-list-item-title class="font-weight-bold">Problemes de Connexió</v-list-item-title>
                      <v-list-item-subtitle>Verifica la teva connexió a internet i recarrega la pàgina</v-list-item-subtitle>
                    </v-list-item>

                    <v-list-item>
                      <v-list-item-title class="font-weight-bold">Error en Crear Sala</v-list-item-title>
                      <v-list-item-subtitle>Intenta tancar la sessió i tornar a iniciar</v-list-item-subtitle>
                    </v-list-item>

                    <v-list-item>
                      <v-list-item-title class="font-weight-bold">Altres Problemes</v-list-item-title>
                      <v-list-item-subtitle>Contacta amb el suport tècnic</v-list-item-subtitle>
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