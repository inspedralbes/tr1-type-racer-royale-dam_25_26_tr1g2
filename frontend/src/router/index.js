import { createRouter, createWebHistory } from 'vue-router'
import Welcome from '@/pages/index.vue'
import Inicial from '@/pages/Inicial.vue'
import Joc from '@/pages/Joc.vue'

const routes = [
  { path: '/', component: Welcome },
  { path: '/inicial', component: Inicial },  // <-- nueva ruta
  { path: '/joc', component: Joc },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

export default router
