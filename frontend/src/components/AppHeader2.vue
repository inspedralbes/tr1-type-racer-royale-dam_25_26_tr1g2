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
    <v-btn text to="/crearrutina" class="hidden-sm-and-down">
      <v-icon left>mdi-dumbbell</v-icon>
      Rutina
    </v-btn>
    <v-btn text to="/ayuda" class="hidden-sm-and-down">
      <v-icon left>mdi-help-circle-outline</v-icon>
      Ayuda
    </v-btn>

    <v-spacer></v-spacer>

    <!-- Refrescar página -->
    <v-btn icon title="Refrescar página" @click="refreshPage">
      <v-icon color="white">mdi-refresh</v-icon>
    </v-btn>

    <!-- Perfil y Cerrar sesión escritorio -->
    <v-btn text to="/profile" color="green" class="font-weight-bold mr-2 hidden-sm-and-down">
      <v-icon left>mdi-account</v-icon>
      PROFILE
    </v-btn>

    <v-btn
      text
      @click="handleLogout"
      color="error"
      class="font-weight-bold hidden-sm-and-down"
    >
      <v-icon left>mdi-logout</v-icon>
      CERRAR SESIÓN
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

      <v-list-item to="/crearrutina" @click="drawer = false">
        <v-icon left>mdi-dumbbell</v-icon>
        Rutina
      </v-list-item>

      <v-list-item to="/ayuda" @click="drawer = false">
        <v-icon left>mdi-help-circle-outline</v-icon>
        Ayuda
      </v-list-item>

      <v-list-item to="/profile" @click="drawer = false">
        <v-icon left>mdi-account</v-icon>
        Perfil
      </v-list-item>

      <!-- Botón de cerrar sesión en el drawer -->
      <v-list-item @click="handleLogout">
        <v-icon left color="error">mdi-logout</v-icon>
        Cerrar sesión
      </v-list-item>
    </v-list>
  </v-navigation-drawer>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useDisplay } from 'vuetify'
import { useAuth } from '@/composables/useAuth'
import { useRouter } from 'vue-router'

const { logout } = useAuth()
const router = useRouter()

const drawer = ref(false)
const { smAndDown } = useDisplay()
const isMobile = computed(() => smAndDown.value)

const handleLogout = () => {
  logout()
  router.push('/login')
}

const refreshPage = () => {
  window.location.reload()
}
</script>

<style scoped>
.v-toolbar__title {
  cursor: default;
}
</style>
