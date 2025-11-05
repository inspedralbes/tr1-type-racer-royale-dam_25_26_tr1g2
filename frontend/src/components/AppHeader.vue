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

      <!-- Refresh button -->
      <v-btn icon title="Refrescar" class="mr-2" @click="refreshPage">
        <v-icon>mdi-refresh</v-icon>
      </v-btn>

      <v-btn text to="/login" color="white" class="font-weight-bold mr-2">
        LOGIN
      </v-btn>
      <v-btn color="primary" to="/register" class="font-weight-bold">
        SIGN UP
      </v-btn>
      
    </v-app-bar>
  </template>
  
  <script>
  export default {
    name: 'AppHeader',
    methods: {
      refreshPage() {
        try {
          window.location.reload()
        } catch (e) {
          // fallback: navigate to current location
          window.location.href = window.location.href
        }
      }
    }
  };
  </script>
  
  <style scoped>
  /* Estilos específicos para este componente si los necesitas */
  .v-toolbar__title {
    /* Asegura que el título sea clickeable o tenga un cursor diferente si lo envuelves en un router-link */
    cursor: default; 
  }
  </style>