<template>
  <v-app-bar app color="#1c1c1c" dark flat>
    <!-- Ícono hamburguesa para móviles -->
    <v-app-bar-nav-icon
      class="hidden-md-and-up"
      @click="drawer = !drawer"
    ></v-app-bar-nav-icon>

    <v-toolbar-title class="font-weight-bold text-h6 primary--text mr-8">
      TRAIN AI
    </v-toolbar-title>

    <!-- Navegación escritorio -->
    <v-btn text to="/" class="hidden-sm-and-down">
      <v-icon left>mdi-home</v-icon>
      Inicio
    </v-btn>
    <v-btn text to="/ayuda" class="hidden-sm-and-down">
      <v-icon left>mdi-help-circle-outline</v-icon>
      Ayuda
    </v-btn>

    <v-spacer></v-spacer>

    <!-- Botones de login/registro escritorio -->
    <v-btn text to="/login" color="white" class="font-weight-bold mr-2 hidden-sm-and-down">
      LOGIN
    </v-btn>
    <v-btn color="primary" to="/register" class="font-weight-bold hidden-sm-and-down">
      SIGN UP
    </v-btn>
  </v-app-bar>

  <!-- Drawer lateral solo móvil -->
  <v-navigation-drawer
    v-if="isMobile"
    v-model="drawer"
    app
    color="#121212"
    dark
  >
    <v-list dense nav>
      <v-list-item to="/" @click="drawer = false">
        <v-icon left>mdi-home</v-icon>
        Inicio
      </v-list-item>

      <v-list-item to="/ayuda" @click="drawer = false">
        <v-icon left>mdi-help-circle-outline</v-icon>
        Ayuda
      </v-list-item>

      <v-list-item to="/login" @click="drawer = false">
        <v-icon left>mdi-login</v-icon>
        Iniciar sesión
      </v-list-item>
    </v-list>
  </v-navigation-drawer>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useDisplay } from 'vuetify'

const drawer = ref(false)
const { smAndDown } = useDisplay()

// Solo mostrar drawer en móvil
const isMobile = computed(() => smAndDown.value)
</script>

<style scoped>
.v-toolbar__title {
  cursor: default;
}
</style>
