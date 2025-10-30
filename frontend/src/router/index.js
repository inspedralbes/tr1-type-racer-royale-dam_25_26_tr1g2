import { createRouter, createWebHistory } from 'vue-router'
import Welcome from '@/pages/index.vue'
import Inicial from '@/pages/Inicial.vue'
import Register from '@/pages/Register.vue'
import Login from '@/pages/Login.vue'
import Ayuda from '@/pages/Ayuda.vue'
import CrearSala from '@/pages/CrearSala.vue'
import UnirSala from '@/pages/UnirSala.vue'
const routes = [
  { path: '/', component: Welcome },
  { path: '/inicial', component: Inicial },  // <-- nueva ruta
  { path: '/register', component: Register, name: 'register' },
  { path: '/login', component: Login, name: 'login' },
  { path: '/ayuda', component: Ayuda, name: 'ayuda' },
  { path: '/crearsala', component: CrearSala, name: 'crearsala' },
  { path: '/unirsala', component: UnirSala, name: 'unirsala' },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

export default router
