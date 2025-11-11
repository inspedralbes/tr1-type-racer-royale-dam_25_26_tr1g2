<template>
  <v-app dark class="app-background">
    <v-main>
      <v-container fluid class="pa-6">
        <v-row>
          <v-col cols="12" md="4">
            <v-card class="profile-card mb-6" elevation="10">
              <v-card-title class="d-flex flex-column align-center">
                <v-avatar size="150" class="mt-4 profile-avatar">
                  <v-img :src="selectedAvatar" @click="openAvatarDialog" />
                </v-avatar>
                <h2 class="mt-4">{{ username }}</h2>
                <v-chip color="primary" small class="mt-2">Nivel {{ level }}</v-chip>
              </v-card-title>
            </v-card>
          </v-col>

          <v-col cols="12" md="8">
            <v-card class="profile-card" elevation="10">
              <v-card-title class="d-flex justify-space-between align-center">
                <span>Mis Rutinas</span>
              </v-card-title>

              <v-card-text>
                <v-data-table
                  :headers="routineHeaders"
                  :items="routines"
                  :items-per-page="5"
                  class="routine-table"
                >
                  <template v-slot:item.exercicis="{ item }">
                    <ul>
                      <li v-for="ex in item.exercicis" :key="ex.id">
                        {{ ex.nom_exercicis }} — {{ ex.n_repeticions }} reps
                      </li>
                    </ul>
                  </template>
                        
                  </v-data-table>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <v-dialog v-model="showAvatarDialog" max-width="500px">
          <v-card>
            <v-card-title>Seleccionar Avatar</v-card-title>
            <v-card-text>
              <v-row>
                <v-col v-for="avatar in avatars" :key="avatar.id" cols="4" sm="3">
                  <v-avatar
                    size="80"
                    @click="selectAvatar(avatar.url)"
                    :class="{'selected-avatar': selectedAvatar === avatar.url}"
                  >
                    <v-img :src="avatar.url" />
                  </v-avatar>
                </v-col>
              </v-row>
            </v-card-text>
            <v-card-actions>
              <v-spacer />
              <v-btn color="primary" text @click="showAvatarDialog = false">
                Cerrar
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>
      </v-container>
    </v-main>
  </v-app>
</template>


<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue' // Añadido onUnmounted para limpiar
import axios from 'axios'

axios.defaults.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:9000'

const user = ref({})
const userId = ref(null)
const username = ref('Invitado')

// ... (Resto de variables reactivas) ...
const routines = ref([])
// ... (Resto de headers) ...

// 🔹 Función para cargar rutinas desde el backend
// Profile.vue

const loadRoutines = async () => {
  try {
    if (!userId.value) {
      console.warn('No hay usuario logueado, no se pueden cargar rutinas')
      routines.value = []
      return
    }
    
    // 💡 AÑADIR UNA MARCA DE TIEMPO para invalidar la caché
    const timestamp = Date.now(); 
    const res = await axios.get(`/api/rutines/user/${userId.value}?t=${timestamp}`) 
    
    routines.value = res.data.rutines || []
  } catch (err) {
    console.error('Error al obtener rutinas:', err)
    routines.value = []
  }
}

const updateProfileState = () => {
    const newUser = JSON.parse(localStorage.getItem('user')) || {};
    const newId = newUser?.id || newUser?.userId || null;
    
    // Si el ID de usuario ha cambiado (ej. de Invitado a Usuario Real), o de Usuario a Logout
    if (newId !== userId.value) {
        userId.value = newId;
        username.value = newUser?.usuari || 'Invitado';
        loadRoutines(); // Llama a la carga
    } else if (newId && routines.value.length === 0) {
        // Caso de recarga de página donde el ID no ha cambiado pero las rutinas están vacías (seguridad)
        loadRoutines();
    }
}

// -------------------- Lógica de Montaje y Escucha --------------------

onMounted(() => {
    // 1. Carga inicial del perfil
    updateProfileState();
    
    // 2. Escuchar cambios de 'user' en OTRAS pestañas/ventanas (evento 'storage')
    window.addEventListener('storage', (event) => {
        if (event.key === 'user') {
            updateProfileState(); 
        }
    });

    // 3. 🔑 ESCUCHA EL EVENTO QUE DISPARA TU FUNCIÓN DE LOGIN EN LA MISMA PESTAÑA
    window.addEventListener('user-logged-in', updateProfileState); 
});

onUnmounted(() => {
    // Limpiar listeners al salir del componente
    window.removeEventListener('storage', updateProfileState);
    window.removeEventListener('user-logged-in', updateProfileState);
});

// Acciones botones
const openAvatarDialog = () => (showAvatarDialog.value = true)
const selectAvatar = (url) => {
  selectedAvatar.value = url
  showAvatarDialog.value = false
}
</script>


<style>
.app-background {
  background: linear-gradient(135deg, #121212 0%, #1c1c1c 100%);
  color: #E0E0E0;
  min-height: 100vh;
}
.profile-card {
  background-color: #212121;
  border: 1px solid #333;
}
.profile-avatar {
  border: 3px solid #1976D2;
  cursor: pointer;
  transition: transform 0.2s;
}
.profile-avatar:hover {
  transform: scale(1.05);
}
.selected-avatar {
  border: 3px solid #1976D2;
}
.routine-table {
  background-color: transparent !important;
}
</style>