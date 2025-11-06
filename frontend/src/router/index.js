// ...existing code...
import { createRouter, createWebHistory } from 'vue-router'
import Welcome from '@/pages/index.vue'
import Inicial from '@/pages/Inicial.vue'
import Register from '@/pages/Register.vue'
import Login from '@/pages/Login.vue'
import Ayuda from '@/pages/Ayuda.vue'
import CrearSala from '@/pages/CrearSala.vue'
import UnirSala from '@/pages/UnirSala.vue'
import Individual from '@/pages/Individual.vue'
import Incursion from '@/pages/Incursion.vue'
import Profile from '@/pages/Profile.vue'
import CrearRutina from '@/pages/CrearRutina.vue'

const routes = [
  { path: '/', component: Welcome },
  { path: '/inicial', component: Inicial },
  { path: '/register', component: Register, name: 'register' },
  { path: '/login', component: Login, name: 'login' },
  { path: '/ayuda', component: Ayuda, name: 'ayuda' },
  { path: '/crearSala', component: CrearSala, name: 'crearSala' },
  { path: '/unirsala', component: UnirSala, name: 'unirsala' },
  { path: '/individual', component: Individual, name: 'individual' },
  { path: '/incursion', component: Incursion, name: 'incursion' },
  { path: '/profile', component: Profile, name: 'profile' },
  { path: '/crearRutina', component: CrearRutina, name: 'crearRutina' },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

export default router
// ...existing code...