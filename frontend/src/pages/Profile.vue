<template>
  <v-app dark class="app-background">
    <v-main>
      <v-container fluid class="pa-6">
        <v-row>
          <!-- Columna Izquierda: Avatar y Estadísticas Principales -->
          <v-col cols="12" md="4">
            <v-card class="profile-card mb-6" elevation="10">
              <v-card-title class="d-flex flex-column align-center">
                <v-avatar size="150" class="mt-4 profile-avatar">
                  <v-img :src="selectedAvatar" @click="openAvatarDialog"/>
                </v-avatar>
                <h2 class="mt-4">{{ username }}</h2>
                <v-chip color="primary" small class="mt-2">Nivel {{ level }}</v-chip>
              </v-card-title>

              <v-card-text>
                <v-list dense>
                  <v-list-item>
                    <v-list-item-content>
                      <v-list-item-title class="text-h6">
                        Estadísticas Principales
                      </v-list-item-title>
                    </v-list-item-content>
                  </v-list-item>

                  <v-divider></v-divider>

                  <!-- Barra de HP -->
                  <v-list-item>
                    <v-list-item-content>
                      <v-list-item-title class="d-flex justify-space-between">
                        <span>HP</span>
                        <span>{{ stats.hp }}/{{ stats.maxHp }}</span>
                      </v-list-item-title>
                      <v-progress-linear
                        color="red"
                        :value="(stats.hp / stats.maxHp) * 100"
                        height="15"
                        rounded
                      ></v-progress-linear>
                    </v-list-item-content>
                  </v-list-item>

                  <!-- Barra de Daño -->
                  <v-list-item>
                    <v-list-item-content>
                      <v-list-item-title class="d-flex justify-space-between">
                        <span>Daño</span>
                        <span>{{ stats.damage }}</span>
                      </v-list-item-title>
                      <v-progress-linear
                        color="orange"
                        :value="(stats.damage / 100) * 100"
                        height="15"
                        rounded
                      ></v-progress-linear>
                    </v-list-item-content>
                  </v-list-item>

                  <!-- Barra de Defensa -->
                  <v-list-item>
                    <v-list-item-content>
                      <v-list-item-title class="d-flex justify-space-between">
                        <span>Defensa</span>
                        <span>{{ stats.defense }}</span>
                      </v-list-item-title>
                      <v-progress-linear
                        color="blue"
                        :value="(stats.defense / 100) * 100"
                        height="15"
                        rounded
                      ></v-progress-linear>
                    </v-list-item-content>
                  </v-list-item>
                </v-list>
              </v-card-text>
            </v-card>
          </v-col>

          <!-- Columna Derecha: Rutinas Creadas -->
          <v-col cols="12" md="8">
            <v-card class="profile-card" elevation="10">
              <v-card-title class="d-flex justify-space-between align-center">
                <span>Mis Rutinas</span>
                <v-btn color="primary" @click="createRoutine" rounded>
                  <v-icon left>mdi-plus</v-icon>
                  Nueva Rutina
                </v-btn>
              </v-card-title>

              <v-card-text>
                <v-data-table
                  :headers="routineHeaders"
                  :items="routines"
                  :items-per-page="5"
                  class="routine-table"
                >
                  <template v-slot:item.actions="{ item }">
                    <v-icon small class="mr-2" @click="editRoutine(item)">
                      mdi-pencil
                    </v-icon>
                    <v-icon small @click="deleteRoutine(item)">
                      mdi-delete
                    </v-icon>
                  </template>
                </v-data-table>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <!-- Diálogo para seleccionar avatar (con upload) -->
        <v-dialog v-model="showAvatarDialog" max-width="640px">
          <v-card>
            <v-card-title class="d-flex flex-column">
              <div class="d-flex align-center justify-space-between w-100">
                <span class="text-h6">Seleccionar Avatar</span>
                <v-btn color="primary" small @click="$refs.fileInput.click()">
                  <v-icon left>mdi-upload</v-icon>
                  Subir Imagen
                </v-btn>
              </div>
              <input ref="fileInput" type="file" accept="image/*" style="display:none" @change="handleFileUpload" />
            </v-card-title>
            <v-card-text>
              <v-row>
                <v-col v-for="avatar in avatars" :key="avatar.id" cols="4" sm="3">
                  <v-hover v-slot="{ isHovering, props }">
                    <v-card v-bind="props" :elevation="isHovering ? 8 : 2" class="pa-2 avatar-card">
                      <v-avatar size="80" @click="selectAvatar(avatar.url)" :class="{'selected-avatar': selectedAvatar === avatar.url}">
                        <v-img :src="avatar.url" />
                      </v-avatar>
                      <v-overlay v-if="isHovering && avatar.isCustom" absolute contained class="align-center justify-center">
                        <v-btn icon color="error" @click.stop="deleteAvatar(avatar.id)">
                          <v-icon>mdi-delete</v-icon>
                        </v-btn>
                      </v-overlay>
                    </v-card>
                  </v-hover>
                </v-col>
              </v-row>
            </v-card-text>
            <v-card-actions>
              <v-spacer />
              <v-btn color="primary" text @click="showAvatarDialog = false">Cerrar</v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'

// Usuario y nivel
const username = ref('Usuario')
const level = ref(1)

// Estadísticas
const stats = reactive({
  hp: 80,
  maxHp: 100,
  damage: 65,
  defense: 45
})

// Avatar y persistencia de uploads
import { useAuth } from '@/composables/useAuth'
const { user, login } = useAuth()

const showAvatarDialog = ref(false)
// iniciar con la foto guardada en el usuario (si existe)
const selectedAvatar = ref(user.value?.profilePicture || 'https://cdn.vuetifyjs.com/images/john.jpg')

// Avatares por defecto + los custom del usuario
const defaultAvatars = [
  { id: 1, url: 'https://cdn.vuetifyjs.com/images/john.jpg' },
  { id: 2, url: 'https://cdn.vuetifyjs.com/images/jane.jpg' }
]

const userAvatars = ref([])

// key en localStorage por usuario (si tenemos userId) para evitar mezclar usuarios
const avatarsStorageKey = computed(() => {
  const uid = user.value?.userId || user.value?.id || 'guest'
  return `user_avatars_${uid}`
})

// cargar avatares del storage al inicio
try {
  const raw = localStorage.getItem(avatarsStorageKey.value)
  if (raw) userAvatars.value = JSON.parse(raw)
} catch (e) {
  console.error('Error reading user avatars from storage', e)
}

const avatars = computed(() => {
  // combinar default + custom (cada custom almacena solo {url})
  return [...defaultAvatars, ...userAvatars.value.map((a, i) => ({ id: `custom_${i}`, url: a.url, isCustom: true }))]
})

// Rutinas
const routineHeaders = [
  { text: 'Nombre', align: 'start', value: 'name' },
  { text: 'Dificultad', value: 'difficulty' },
  { text: 'Última vez', value: 'lastPlayed' },
  { text: 'Puntuación', value: 'score' },
  { text: 'Acciones', value: 'actions', sortable: false }
]

const routines = ref([
  {
    name: 'Rutina Diaria',
    difficulty: 'Media',
    lastPlayed: '2025-10-31',
    score: 850
  },
  // Agregar más rutinas aquí
])

// Funciones
const openAvatarDialog = () => {
  showAvatarDialog.value = true
}

const selectAvatar = (url) => {
  selectedAvatar.value = url
  // Persistir la selección en el objeto user (useAuth guarda en localStorage)
  try {
    const updated = { ...(user.value || {}), profilePicture: url }
    login(updated)
  } catch (e) {
    console.error('Error updating user profile picture', e)
  }
  showAvatarDialog.value = false
}

const handleFileUpload = (event) => {
  const file = event.target.files && event.target.files[0]
  if (!file) return

  // tamaño máximo 5MB
  if (file.size > 5 * 1024 * 1024) {
    alert('La imagen es demasiado grande. Máx 5MB.')
    event.target.value = ''
    return
  }

  const reader = new FileReader()
  reader.onload = (e) => {
    const dataUrl = e.target.result
    // push en userAvatars y persistir
    userAvatars.value.push({ url: dataUrl })
    try {
      localStorage.setItem(avatarsStorageKey.value, JSON.stringify(userAvatars.value))
    } catch (err) {
      console.error('Error saving user avatars', err)
    }
    // forzar recompute by assigning to selectedAvatar and closing dialog
    selectedAvatar.value = dataUrl
    try { login({ ...(user.value || {}), profilePicture: dataUrl }) } catch (e) {}
    event.target.value = ''
    showAvatarDialog.value = false
  }
  reader.readAsDataURL(file)
}

const deleteAvatar = (avatarId) => {
  // avatarId: 'custom_<index>' or default id
  const idx = avatars.value.findIndex(a => a.id === avatarId)
  if (idx === -1) return
  const av = avatars.value[idx]
  if (!av.isCustom) return // no borrar por defecto

  // find in userAvatars by url
  const userIdx = userAvatars.value.findIndex(u => u.url === av.url)
  if (userIdx !== -1) userAvatars.value.splice(userIdx, 1)

  try {
    localStorage.setItem(avatarsStorageKey.value, JSON.stringify(userAvatars.value))
  } catch (err) {
    console.error('Error saving user avatars after delete', err)
  }

  // if deleted avatar was selected, reset to default
  if (selectedAvatar.value === av.url) {
    const defaultUrl = defaultAvatars[0].url
    selectedAvatar.value = defaultUrl
    try { login({ ...(user.value || {}), profilePicture: defaultUrl }) } catch (e) {}
  }
}

const createRoutine = () => {
  // Implementar lógica para crear nueva rutina
}

const editRoutine = (item) => {
  // Implementar lógica para editar rutina
}

const deleteRoutine = (item) => {
  // Eliminar la rutina pasada (buscamos por referencia primero)
  const idx = routines.value.indexOf(item)
  if (idx !== -1) {
    routines.value.splice(idx, 1)
    return
  }

  // Si no se encuentra por referencia (por ejemplo objetos recreados), buscar por campos clave
  const fallbackIdx = routines.value.findIndex(r => r.name === item.name && r.lastPlayed === item.lastPlayed && r.score === item.score)
  if (fallbackIdx !== -1) {
    routines.value.splice(fallbackIdx, 1)
  }
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
  position: relative;
  overflow: hidden;
  border-radius: 50%;
}

.profile-avatar::after {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(255,255,255,0.06); /* subtle overlay for dark mode */
  opacity: 0;
  transition: opacity 0.18s ease-in-out;
  pointer-events: none;
}

.profile-avatar:hover {
  transform: scale(1.05);
}

.profile-avatar:hover::after {
  opacity: 1;
}

.selected-avatar {
  border: 3px solid #1976D2;
}

.routine-table {
  background-color: transparent !important;
}

/* Ajustes para modo claro del sistema/buscador */
@media (prefers-color-scheme: light) {
  .app-background {
    /* gradiente claro similar al resto de pantallas */
    background: linear-gradient(135deg, #f5f7fa 0%, #ffffff 100%);
    color: #1c1c1c;
  }

  /* Hacer ambos recuadros (avatar/estadísticas y rutinas) blancos con borde negro */
  .profile-card {
    background-color: #ffffff;
    border: 1px solid #000000; /* borde negro solicitado */
    color: #1c1c1c;
    box-shadow: 0 6px 20px rgba(16,24,40,0.06);
  }

  .profile-card .v-card-title,
  .profile-card .v-card-text {
    color: #1c1c1c;
  }

  .profile-avatar {
    border: 5px solid #1976D2;
  }

  .selected-avatar {
    border: 5px solid #1976D2;
  }

  .routine-table {
    background-color: #ffffff !important;
    color: #1c1c1c !important;
  }

  /* Ajustes para los textos y chips dentro de la tarjeta */
  .profile-card .v-chip {
    background-color: #1976D2;
    color: #fff;
  }

  /* Asegurar que los iconos y botones sean visibles */
  .profile-card .v-icon,
  .profile-card .v-btn {
    color: inherit;
  }
}
</style>
