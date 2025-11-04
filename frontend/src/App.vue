<template>
  <v-app>
    <!-- Header condicional basado en autenticación -->
    <AppHeader v-if="!isAuthenticated" />
    <AppHeader2 v-else />

    <!-- Contenido de cada página -->
    <v-main>
      <router-view />
    </v-main>

    <!-- Footer global -->
    <AppFooter />
  </v-app>
</template>

<script setup>
import AppHeader from '@/components/AppHeader.vue'
import AppHeader2 from '@/components/AppHeader2.vue'
import AppFooter from '@/components/AppFooter.vue'
import { useAuth } from '@/composables/useAuth'

const { isAuthenticated } = useAuth()
</script>
