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

    <!-- navegación explícita para evitar ambigüedades -->
    <v-btn text color="white" class="font-weight-bold mr-2" @click="$router.push('/login')">
      LOGIN
    </v-btn>
    <v-btn color="primary" class="font-weight-bold" @click="$router.push('/register')">
      SIGN UP
    </v-btn>
  </v-app-bar>
</template>

<script>
export default {
  name: 'AppHeader'
}
</script>

<style scoped>
.v-toolbar__title { cursor: default; }
</style>