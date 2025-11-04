import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

// Si usas Vuetify
import vuetify from './plugins/vuetify'

// Si usas Pinia
import { createPinia } from 'pinia'

const app = createApp(App)



app.use(router)
app.use(vuetify)
app.use(createPinia())

app.mount('#app')