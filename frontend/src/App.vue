<template>
  <v-app>
    <!-- Header global -->
    <AppHeader />

    <!-- Contenido de cada página -->
    <v-main>
      <router-view />
    </v-main>

    <!-- Footer global -->
    <AppFooter />
  </v-app>
</template>

<script>
import AppHeader from '@/components/AppHeader.vue'
import AppFooter from '@/components/AppFooter.vue'

export default {
  name: 'App',
  components: {
    AppHeader,
    AppFooter
  }
}
</script>
