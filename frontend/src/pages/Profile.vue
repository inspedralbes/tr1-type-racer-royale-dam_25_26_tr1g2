<template>
  <v-app dark class="app-background">
    <v-main>
      <v-container fluid class="pa-6">
        <v-row>
          <!-- Columna Izquierda: Avatar y datos -->
          <v-col cols="12" md="4">
            <v-card class="profile-card mb-6" elevation="10">
              <v-card-title class="d-flex flex-column align-center">
                <v-avatar size="150" class="mt-4 profile-avatar">
                  <v-img :src="selectedAvatar" @click="openAvatarDialog" />
                </v-avatar>
                <h2 class="mt-4">{{ username }}</h2>
                <v-chip color="primary" small class="mt-2">Nivel {{ level }}</v-chip>
              </v-card-title>

              <v-card-text>
                <v-list dense>
                  <v-list-item-title class="text-h6 mb-2">
                    Estadísticas principales
                  </v-list-item-title>
                  <v-divider></v-divider>

                  <v-list-item>
                    <v-list-item-content>
                      <v-list-item-title class="d-flex justify-space-between">
                        <span>HP</span><span>{{ stats.hp }}/{{ stats.maxHp }}</span>
                      </v-list-item-title>
                      <v-progress-linear
                        color="red"
                        :value="(stats.hp / stats.maxHp) * 100"
                        height="15"
                        rounded
                      />
                    </v-list-item-content>
                  </v-list-item>

                  <v-list-item>
                    <v-list-item-content>
                      <v-list-item-title class="d-flex justify-space-between">
                        <span>Daño</span><span>{{ stats.damage }}</span>
                      </v-list-item-title>
                      <v-progress-linear
                        color="orange"
                        :value="(stats.damage / 100) * 100"
                        height="15"
                        rounded
                      />
                    </v-list-item-content>
                  </v-list-item>

                  <v-list-item>
                    <v-list-item-content>
                      <v-list-item-title class="d-flex justify-space-between">
                        <span>Defensa</span><span>{{ stats.defense }}</span>
                      </v-list-item-title>
                      <v-progress-linear
                        color="blue"
                        :value="(stats.defense / 100) * 100"
                        height="15"
                        rounded
                      />
                    </v-list-item-content>
                  </v-list-item>
                </v-list>
              </v-card-text>
            </v-card>
          </v-col>

          <!-- Columna Derecha: Rutinas -->
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

        <!-- Diálogo Avatares -->
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
import { ref, reactive, onMounted } from 'vue'
import axios from 'axios'
axios.defaults.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:9000'

// 🔹 Obtener usuario logueado desde localStorage
const user = JSON.parse(localStorage.getItem('user')) || {}
const userId = user?.id || user?.userId || null  // ← FIX: acepta 'id' o 'userId'
const username = user?.usuari || 'Invitado'

// Avatar y stats
const selectedAvatar = ref('https://cdn.vuetifyjs.com/images/john.jpg')
const showAvatarDialog = ref(false)
const avatars = [
  { id: 1, url: 'https://cdn.vuetifyjs.com/images/john.jpg' },
  { id: 2, url: 'https://cdn.vuetifyjs.com/images/jane.jpg' }
]

const level = ref(1)
const stats = reactive({ hp: 80, maxHp: 100, damage: 65, defense: 45 })

// Rutinas del usuario
const routines = ref([])
const deletingId = ref(null)
const routineHeaders = [
  { text: 'Nombre', align: 'start', value: 'nom' },
  { text: 'Descripción', value: 'descripcio' },
  { text: 'Ejercicios', value: 'exercicis' },
  { text: 'Acciones', value: 'actions', sortable: false }
]

// 🔹 Cargar rutinas desde el backend
const loadRoutines = async () => {
  try {
    if (!userId) {
      console.warn('No hay usuario logueado, no se pueden cargar rutinas')
      routines.value = []
      return
    }

    const res = await axios.get(`http://localhost:9000/api/rutines/user/${userId}`)
    routines.value = res.data.rutines || []
  } catch (err) {
    console.error('Error al obtener rutinas:', err)
    routines.value = [] // fallback para evitar errores
  }
}
onMounted(() => {
  loadRoutines()
})

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
