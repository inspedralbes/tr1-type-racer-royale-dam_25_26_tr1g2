<template>
  <v-app>
    <v-navigation-drawer 
      v-model="drawer" 
      app 
      temporary
      color="#212121"
      dark
    >
      <v-list nav dense>
        <v-list-item link to="/" @click="drawer = false">
          <v-list-item-title class="font-weight-medium">
            <v-icon left>mdi-home</v-icon> Inici
          </v-list-item-title>
        </v-list-item>

        <v-list-item link to="/crearrutina" @click="drawer = false">
          <v-list-item-title class="font-weight-medium">
            <v-icon left>mdi-dumbbell</v-icon> Crear Rutina
          </v-list-item-title>
        </v-list-item>

        <v-list-item link to="/ayuda" @click="drawer = false">
          <v-list-item-title class="font-weight-medium">
            <v-icon left>mdi-help-circle-outline</v-icon> Ajuda
          </v-list-item-title>
        </v-list-item>
        
        <v-divider class="my-2"></v-divider>
        
        <v-list-item link to="/profile" color="green" @click="drawer = false">
          <v-list-item-title class="font-weight-bold green--text text--lighten-1">
            <v-icon left color="green">mdi-account</v-icon> PERFIL
          </v-list-item-title>
        </v-list-item>
      </v-list>
    </v-navigation-drawer>

    <AppHeader v-if="!isAuthenticated" />
    <AppHeader2 v-else @toggleDrawer="drawer = !drawer" />

    <v-main>
      <router-view />
    </v-main>

    <AppFooter />
  </v-app>
</template>

<script setup>
import { ref } from 'vue' // Importar ref para el estado del drawer
import AppHeader from '@/components/AppHeader.vue'
import AppHeader2 from '@/components/AppHeader2.vue'
import AppFooter from '@/components/AppFooter.vue'
import { useAuth } from '@/composables/useAuth'

const { isAuthenticated } = useAuth()

// 💡 Estado para controlar la apertura del menú lateral (Navigation Drawer)
const drawer = ref(false) 
</script>