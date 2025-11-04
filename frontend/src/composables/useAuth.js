import { ref } from 'vue'

const isAuthenticated = ref(false)
<<<<<<< HEAD
// load persisted user
let initialUser = null
try {
  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem('auth_user')
    if (raw) initialUser = JSON.parse(raw)
  }
} catch (e) {
  initialUser = null
}

const user = ref(initialUser)
if (user.value) isAuthenticated.value = true
=======
const user = ref(null)
>>>>>>> 59f4dc8 (Sync: Actualizar carpeta frontend desde frontend-develop)

export function useAuth() {
  const login = (userData) => {
    isAuthenticated.value = true
    user.value = userData
<<<<<<< HEAD
    try {
      localStorage.setItem('auth_user', JSON.stringify(userData))
    } catch (e) {}
=======
>>>>>>> 59f4dc8 (Sync: Actualizar carpeta frontend desde frontend-develop)
  }

  const logout = () => {
    isAuthenticated.value = false
    user.value = null
<<<<<<< HEAD
    try {
      localStorage.removeItem('auth_user')
    } catch (e) {}
=======
>>>>>>> 59f4dc8 (Sync: Actualizar carpeta frontend desde frontend-develop)
  }

  return {
    isAuthenticated,
    user,
    login,
    logout
  }
<<<<<<< HEAD
}
=======
}
>>>>>>> 59f4dc8 (Sync: Actualizar carpeta frontend desde frontend-develop)
