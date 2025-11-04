import { ref } from 'vue'

const isAuthenticated = ref(false)
const user = ref(null)

export function useAuth() {
  const login = (userData) => {
    isAuthenticated.value = true
    user.value = userData
  }

  const logout = () => {
    isAuthenticated.value = false
    user.value = null
  }

  return {
    isAuthenticated,
    user,
    login,
    logout
  }
}