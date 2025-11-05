import { ref } from 'vue'

const isAuthenticated = ref(false)
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

export function useAuth() {
  const login = (userData) => {
    isAuthenticated.value = true
    user.value = userData
    try {
      localStorage.setItem('auth_user', JSON.stringify(userData))
    } catch (e) {}
  }

  const logout = () => {
    isAuthenticated.value = false
    user.value = null
    try {
      localStorage.removeItem('auth_user')
    } catch (e) {}
  }

  return {
    isAuthenticated,
    user,
    login,
    logout
  }
}
