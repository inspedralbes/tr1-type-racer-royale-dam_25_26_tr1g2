<template>
    <v-app-bar app color="#1c1c1c" dark flat> 
      <v-toolbar-title class="font-weight-bold text-h6 primary--text mr-8">
        TRAIN AI
      </v-toolbar-title>
  
      <v-btn text to="/" class="hidden-sm-and-down">
        <v-icon left>mdi-home</v-icon>
        Inicio
      </v-btn>
      <v-btn text to="/ayuda" class="hidden-sm-and-down">
        <v-icon left>mdi-help-circle-outline</v-icon>
        Ayuda
      </v-btn>
  
      <v-spacer></v-spacer>
  
      <v-btn text to="/profile" color="green" class="font-weight-bold mr-2">
        PROFILE
      </v-btn>
      
    </v-app-bar>
  </template>
  
  <script>
  export default {
    name: 'AppHeader2',
    // Si usas Vue 3 con el Composition API, puedes usar <script setup> sin el export default
  };
  </script>
  
  <style scoped>
  /* Estilos específicos para este componente si los necesitas */
  .v-toolbar__title {
    /* Asegura que el título sea clickeable o tenga un cursor diferente si lo envuelves en un router-link */
    cursor: default; 
  }
  </style>