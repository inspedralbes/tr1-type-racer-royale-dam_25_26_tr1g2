import { createRouter, createWebHistory } from 'vue-router'
import Welcome from '@/pages/index.vue'
import Inicial from '@/pages/Inicial.vue'
import Register from '@/pages/Register.vue'
import Login from '@/pages/Login.vue'
import Ayuda from '@/pages/Ayuda.vue'
import CrearSala from '@/pages/CrearSala.vue'
import UnirSala from '@/pages/UnirSala.vue'
import Individual from '@/pages/Individual.vue'
<<<<<<< HEAD
<<<<<<< HEAD
import Incursion from '@/pages/Incursion.vue'
import Profile from '@/pages/Profile.vue'
=======
>>>>>>> 3aa0bca (Cambios en subpaginas de multijugador e individual)

=======
>>>>>>> 59f4dc8 (Sync: Actualizar carpeta frontend desde frontend-develop)
import Incursion from '@/pages/Incursion.vue'
import Profile from '@/pages/Profile.vue'

const routes = [
  { path: '/', component: Welcome },
  { path: '/inicial', component: Inicial },  // <-- nueva ruta
  { path: '/register', component: Register, name: 'register' },
  { path: '/login', component: Login, name: 'login' },
  { path: '/ayuda', component: Ayuda, name: 'ayuda' },
  { path: '/crearsala', component: CrearSala, name: 'crearsala' },
  { path: '/unirsala', component: UnirSala, name: 'unirsala' },
  { path: '/individual', component: Individual, name: 'individual' },
<<<<<<< HEAD
<<<<<<< HEAD
  { path: '/incursion', component: Incursion, name: 'incursion' },
  { path: '/profile', component: Profile, name: 'profile' },
<<<<<<< HEAD
=======
>>>>>>> 3aa0bca (Cambios en subpaginas de multijugador e individual)
=======
  { path: '/incursion', component: Incursion, name: 'incursion' },
>>>>>>> 172f3db (incursió afegida)
=======
>>>>>>> 59f4dc8 (Sync: Actualizar carpeta frontend desde frontend-develop)
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

export default router
