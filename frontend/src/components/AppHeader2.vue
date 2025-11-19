<template>
  <v-app-bar app color="#1c1c1c" dark flat>
    <!-- 1. Icono de Menú (Hamburguesa) - Visible solo en móviles -->
    <v-app-bar-nav-icon class="d-md-none" @click="emit('toggleDrawer')"></v-app-bar-nav-icon>

    <v-toolbar-title 
      class="font-weight-bold primary--text mr-md-8 text-subtitle-1 text-md-h6"
      @click="goHome"
    >
      TRAIN AI
    </v-toolbar-title>

    <!-- 2. Enlaces de Navegación - Ocultos en móvil (visibles de 'md' en adelante) -->
    <v-btn text to="/" class="d-none d-md-flex">
      <v-icon left>mdi-home</v-icon>
      Inicio
    </v-btn>
    <v-btn text to="/crearrutina" class="d-none d-md-flex">
      Rutina
    </v-btn>
    <v-btn text to="/ayuda" class="d-none d-md-flex">
      <v-icon left>mdi-help-circle-outline</v-icon>
      Ayuda
    </v-btn>

    <v-spacer></v-spacer>

    <v-btn icon title="Refrescar página" @click="refreshPage" class="d-none d-sm-flex">
      <v-icon color="white">mdi-refresh</v-icon>
    </v-btn>
    
    <v-btn text to="/profile" color="green" class="font-weight-bold mr-2">
      <v-icon left>mdi-account</v-icon>
      PROFILE
    </v-btn>
    
    <v-btn
      text
      @click="handleLogout"
      color="error"
      class="font-weight-bold"
    >
      <v-icon left>mdi-logout</v-icon>
      <span class="d-none d-sm-inline">CERRAR SESIÓN</span>
    </v-btn>
  </v-app-bar>
</template>

<script setup>
import { useAuth } from '@/composables/useAuth'
import { useRouter } from 'vue-router'

// 3. Definir el evento que el componente puede emitir
const emit = defineEmits(['toggleDrawer'])

const { logout } = useAuth()
const router = useRouter()

const handleLogout = () => {
  logout()
  router.push('/login')
}

const refreshPage = () => {
  window.location.reload();
}

const goHome = () => {
  router.push('/'); // Navega a la página de inicio/inicial
}
</script>

<style scoped>
.v-toolbar__title {
  cursor: pointer; 
}
</style>