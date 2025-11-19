<template>
  <v-app dark class="app-background">
    <v-main>
      <v-container fluid class="pa-4 pa-sm-6">
        <v-row>
          <!-- Perfil -->
          <v-col cols="12" md="4">
            <v-card class="profile-card mb-6" elevation="10">
              <v-card-title class="d-flex flex-column align-center">
                <v-avatar size="150" class="mt-4 profile-avatar" @click="openAvatarDialog">
                  <v-img :src="selectedAvatar" cover />
                  <v-icon class="edit-icon" size="40">mdi-camera-plus</v-icon>
                </v-avatar>
                <h2 class="mt-4 white--text">{{ username }}</h2>
                <v-chip color="primary" small class="mt-2">Nivel {{ level }}</v-chip>
              </v-card-title>
            </v-card>
          </v-col>

          <!-- Rutinas -->
          <v-col cols="12" md="8">
            <v-card class="profile-card" elevation="10">
              <v-card-title class="white--text">Mis Rutinas Creadas</v-card-title>

              <v-card-text class="pa-0">
                <!-- Tabla Desktop -->
                <v-data-table
                  :headers="routineHeaders"
                  :items="routines"
                  :items-per-page="5"
                  class="routine-table elevation-0 d-none d-sm-table"
                  dense
                >
                  <template v-slot:item.id="{ item, props }">
                    <v-td v-bind="props" class="white--text font-weight-bold">{{ item.id }}</v-td>
                  </template>

                  <template v-slot:item.descripcio="{ item, props }">
                    <v-td v-bind="props" class="white--text">{{ item.descripcio || '-' }}</v-td>
                  </template>

                  <template v-slot:item.data_creacio="{ item, props }">
                    <v-td v-bind="props">
                      <span class="text-caption grey--text text--lighten-2">{{ formatDate(item.data_creacio) }}</span>
                    </v-td>
                  </template>

                  <template v-slot:item.exercicis="{ item, props }">
                    <v-td v-bind="props" class="white--text">
                      <ul class="routine-list">
                        <li v-for="ex in item.exercicis" :key="ex.id">
                          {{ ex.nom_exercicis }} — {{ ex.n_repeticions }} reps
                        </li>
                      </ul>
                    </v-td>
                  </template>
                </v-data-table>

                <!-- Cards Móvil -->
               <div class="d-sm-none pa-3">
  <v-card v-for="(routine, index) in routines" :key="index" class="mobile-routine-card mb-3">
    <v-card-title class="text-subtitle-1 pb-1 routine-title-mobile">
      {{ routine.nom }}
    </v-card-title>
    
    <v-card-text class="pt-1">
      <div class="mb-1"><strong>ID:</strong> {{ routine.id }}</div>
      
      <div class="mb-1"><strong>Descripción:</strong> {{ routine.descripcio || '-' }}</div>
      <div class="mb-1"><strong>Creada:</strong> {{ formatDate(routine.data_creacio) }}</div>
      <strong class="text-caption grey--text text--lighten-1">Ejercicios:</strong>
      <ul class="mobile-routine-list white--text">
        <li v-for="ex in routine.exercicis" :key="ex.id" class="text-body-2">
          {{ ex.nom_exercicis }} — {{ ex.n_repeticions }} reps
        </li>
      </ul>
      <v-chip small class="mt-2" color="teal">Total: {{ routine.exercicis.length }} Ejercicios</v-chip>
    </v-card-text>
  </v-card>
  <p v-if="routines.length === 0" class="text-center mt-4 grey--text">
    Aún no tienes rutinas creadas.
  </p>
</div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <!-- Dialogo Avatar -->
        <v-dialog v-model="showAvatarDialog" max-width="500px">
          <v-card class="profile-card">
            <v-card-title class="white--text text-h6">Seleccionar Icono de Perfil</v-card-title>
            <v-card-text>
              <v-text-field
                label="Pegar URL de imagen personalizada"
                v-model="customAvatarUrl"
                @input="updatePreviewFromUrl"
                clearable
                dense
                dark
              ></v-text-field>

              <v-divider class="mb-4"></v-divider>
              <p class="white--text text-subtitle-2 mb-3">O elige uno de nuestros avatares:</p>

              <v-row>
                <v-col v-for="avatar in avatars" :key="avatar.id" cols="4" sm="3" class="d-flex justify-center">
                  <v-avatar
                    size="80"
                    @click="selectAvatar(avatar.url)"
                    :class="{'selected-avatar-preview': previewAvatar === avatar.url}"
                  >
                    <v-img :src="avatar.url" cover />
                  </v-avatar>
                </v-col>
              </v-row>
            </v-card-text>
            <v-card-actions>
              <v-spacer />
              <v-btn color="grey" text @click="showAvatarDialog = false">Cancelar</v-btn>
              <v-btn color="success" @click="saveAvatarChange" :disabled="!previewAvatar || previewAvatar === selectedAvatar">Guardar</v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import apiClient from '@/plugins/axios.js'

const userId = ref(null)
const username = ref('Invitado')
const level = ref(1)
const routines = ref([])

const selectedAvatar = ref('https://cdn.vuetifyjs.com/images/john-smirk.png')
const showAvatarDialog = ref(false)
const previewAvatar = ref(null)
const customAvatarUrl = ref('')

const avatars = reactive([
  { id: 1, url: 'https://cdn.vuetifyjs.com/images/cards/halcyon.png' },
  { id: 2, url: 'https://cdn.vuetifyjs.com/images/john-smirk.png' },
  { id: 3, url: 'https://cdn.vuetifyjs.com/images/parallax/material.jpg' },
])

const routineHeaders = reactive([
  { title: 'ID', align: 'start', key: 'id' },
  { title: 'Nombre', align: 'start', key: 'nom' },
  { title: 'Descripción', align: 'start', key: 'descripcio' },
  { title: 'Creada', align: 'end', key: 'data_creacio' },
  { title: 'Ejercicios', align: 'start', key: 'exercicis' },
])

function formatDate(dateString) {
  if (!dateString) return 'N/A'
  try {
    return new Date(dateString).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch { return dateString }
}

const loadRoutines = async () => {
  if (!userId.value) { routines.value = []; return }
  try {
    // Corregido: Usar apiClient y la ruta correcta sin /api
    const res = await apiClient.get(`/rutinas/user/${userId.value}?t=${Date.now()}`)
    routines.value = res.data.rutines || []
  } catch { routines.value = [] }
}

const updateProfileState = () => {
  const newUser = JSON.parse(localStorage.getItem('user')) || {}
  const newId = newUser?.id || newUser?.userId || null
  if (newId !== userId.value) {
    userId.value = newId
    username.value = newUser?.usuari || newUser?.username || 'Invitado'
    selectedAvatar.value = newUser?.avatar_url || 'https://cdn.vuetifyjs.com/images/john-smirk.png'
    level.value = newUser?.level || 1
    loadRoutines()
  } else if (newId && routines.value.length === 0) {
    loadRoutines()
  }
}

const openAvatarDialog = () => { previewAvatar.value = selectedAvatar.value; customAvatarUrl.value = ''; showAvatarDialog.value = true }
const selectAvatar = (url) => { previewAvatar.value = url; customAvatarUrl.value = '' }
const updatePreviewFromUrl = () => { if (customAvatarUrl.value.startsWith('http')) previewAvatar.value = customAvatarUrl.value; else if (!customAvatarUrl.value) previewAvatar.value = selectedAvatar.value }
const saveAvatarChange = () => {
  if (!previewAvatar.value || previewAvatar.value === selectedAvatar.value) { showAvatarDialog.value = false; return }
  selectedAvatar.value = previewAvatar.value
  const currentUser = JSON.parse(localStorage.getItem('user')) || {}
  currentUser.avatar_url = previewAvatar.value
  localStorage.setItem('user', JSON.stringify(currentUser))
  window.dispatchEvent(new Event('storage'))
  showAvatarDialog.value = false
}

onMounted(() => {
  updateProfileState()
  window.addEventListener('storage', updateProfileState)
  window.addEventListener('user-logged-in', updateProfileState)
})
onUnmounted(() => {
  window.removeEventListener('storage', updateProfileState)
  window.removeEventListener('user-logged-in', updateProfileState)
})
</script>

<style scoped>
.app-background { background: linear-gradient(135deg,#121212 0%,#1c1c1c 100%); color:#E0E0E0; min-height:100vh }
.profile-card { background-color:#212121; border:1px solid #333; color:#E0E0E0 }
.profile-avatar { border:3px solid #1976D2; cursor:pointer; transition:transform .2s; position:relative }
.profile-avatar:hover { transform: scale(1.05) }
.profile-avatar .edit-icon { position:absolute; bottom:0; right:0; background:rgba(0,0,0,.7); border-radius:50%; padding:5px; color:#1976D2; pointer-events:none }
.selected-avatar-preview { border:4px solid #4CAF50 !important; transform: scale(1.1); transition:all .2s }
.routine-table { background-color:transparent !important; color:#E0E0E0 }
.routine-table :deep(th), .routine-table :deep(td) { border-bottom:1px solid #333 !important; color:#E0E0E0 !important }
.routine-table :deep(tbody tr:hover) { background-color:#333 !important }
.routine-list { list-style-type:'👉 '; padding-left:1.5em; color:#E0E0E0 }
.routine-list li { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:100%; padding-top:2px }
.mobile-routine-card { background-color:#2c2c2c !important; border-left:5px solid #1976D2 }
.routine-title-mobile { color:#42A5F5 }
.mobile-routine-list { list-style-type:'• '; padding-left:1.2em; color:#E0E0E0 }
@media(max-width:600px){.profile-card{margin-bottom:20px}}
</style>

