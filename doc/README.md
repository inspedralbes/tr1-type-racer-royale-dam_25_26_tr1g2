# 🏋️ FitAI – Documentació Tècnica

Aquest document conté tota la informació tècnica necessària per entendre, desplegar i mantenir el projecte **FitAI**.

## 🌟 Resum del projecte
**FitAI** és una aplicació web per a sessions d’entrenament col·laboratives en temps real, amb:  
- IA client-side per analitzar moviments amb **TensorFlow.js + MoveNet**.  
- Comptatge de repeticions i feedback tècnic.  
- Comunicació instantània via **WebSockets natius**.  
- Persistència de dades amb **Node.js + MySQL**.

## 🎯 Objectius
- Permetre sessions d'entrenament col·laboratives en temps real.  
- Analitzar moviments amb IA client-side (TensorFlow.js + MoveNet).  
- Comptar repeticions i oferir feedback tècnic.  
- Mostrar un leaderboard en temps real amb les dades de tots els participants.  
- Garantir la persistència de dades i la integritat de la informació dels usuaris.

## 🏗 Arquitectura bàsica

### Tecnologies utilitzades
- Frontend: Vue.js + Vuetify + Pinia  
- Backend: Node.js + Express + WebSockets natius (ws)  
- IA: TensorFlow.js (MoveNet)  
- Base de dades: MySQL / MariaDB  
- Persistència opcional: JSON export  
- Plataforma de desplegament: HestiaCP (preproducció i producció)

### Interrelació de components
1. El client Vue consumeix la càmera, processa la IA i envia keypoints via WS.  
2. El servidor Node.js rep els keypoints, calcula repeticions totals i envia actualitzacions als clients.  
3. La base de dades MySQL desa usuaris, sessions i resultats finals.  
4. Opcionalment, el backend exporta JSON amb els resums finals de cada sessió.

## ⚡ Esbós de l’estructura **Pinia Store** (`pinia-store.md`)

```javascript
import { defineStore } from 'pinia'

export const useSessionStore = defineStore('session', {
  state: () => ({
    sessionId: null,
    userId: null,
    connectionStatus: 'disconnected', // disconnected | connecting | connected
    participants: [],
    leaderboard: [],
    userMetrics: {},
    currentExercise: null
  }),
  actions: {
    setSession(id) { this.sessionId = id },
    setUser(id) { this.userId = id },
    updateParticipants(list) { this.participants = list },
    updateLeaderboard(list) { this.leaderboard = list },
    updateMetrics(metrics) { this.userMetrics = metrics },
    setExercise(ex) { this.currentExercise = ex }
  }
})

Centralitza tot l’estat global del frontend, gestionant connexions WS, dades de participants, leaderboard i mètriques de l’usuari.
🌐 Protocol WebSockets v1.0 (ws-protocol.md)
Event	Client → Servidor	Servidor → Client	Descripció
join_room	✅	-	Sol·licita unir-se a una sessió (sessionId + userId)
joined_ack	-	✅	Confirmació i llista de participants actuals
pose_frame	✅	-	Fotograma amb keypoints del MoveNet
rep_update	-	✅	Actualitza reps i estat de moviment
technique_feedback	-	✅	Feedback tècnica (“Baixa més”, etc.)
leaderboard_request	✅	-	Demana el leaderboard actual
leaderboard_update	-	✅	Rànquing actualitzat
end_session	✅	-	Indica final de sessió
session_summary	-	✅	Resum final de la sessió
error	-	✅	Notificació d’errors
ack	-	✅	Confirmació genèrica de recepció/execució
🧠 Màquina d’estats IA (ia-state-machine.md)

Objectiu: Detecció de repeticions de squat basada en angles clau del cos.

Keypoints analitzats: caderes, genolls, tormells, espatlles
Angles calculats: knee angle, hip angle, torso lean, shoulder-mid-hip, ankle stability

Estats:

    Idle – Esperant iniciar

    Stand – Posició inicial dreta

    Descend – Fase de baixada

    Bottom – Squat complet

    Ascend – Fase de pujada

    Rep Complete – Repetició finalitzada correctament

Transicions basades en angles i posicions calculades.
Feedback tècnic derivat dels valors mesurats (ex: torso_massa_inclinat).
📝 Product Backlog MVP (backlog-mvp.md)
Història d’usuari	Prioritat
Com a usuari, vull unir-me a una sala amb un ID	Alta
Com a usuari, vull que l’aplicació compti automàticament les meves repeticions	Alta
Com a usuari, vull rebre feedback tècnic bàsic en temps real	Alta
Com a usuari, vull veure el leaderboard actualitzat a l’instant	Alta
Com a administrador, vull que els resultats finals es guardin en un JSON	Mitja
Com a usuari, vull que les repeticions incorrectes siguin identificades amb un warning	Mitja
Com a desenvolupador, vull que l’estat global s’administri amb Pinia	Alta
📡 Endpoints API Backend
POST /api/session/save

    Descripció: Desa el resum final d’una sessió.

    Request JSON exemple:

{
  "sessionId": "sess_12345",
  "participants": [
    { "userId": "user_1", "reps": 12, "aggregateMetrics": { "avgRepDurationMs": 1250 } }
  ]
}

    Resposta:

{ "status": "success", "message": "Sessió desada correctament" }

    Codis d’estat: 200 OK, 400 Bad Request

GET /api/session/:id

    Descripció: Obté el resum d’una sessió.

    Resposta JSON exemple:

{
  "sessionId": "sess_12345",
  "participants": [ { "userId": "user_1", "reps": 12 } ],
  "summary": { "totalReps": 12 }
}

    Codis d’estat: 200 OK, 404 Not Found

🔧 Entorn de desenvolupament

git clone <repo-url>
cd backend && npm install
cd ../frontend && npm install

    Configurar .env amb connexió a MySQL.

    Executar backend: node server.js

    Executar frontend: npm run serve

🚀 Desplegament a producció

    Contenidors HestiaCP per preproducció i producció.

    Base de dades MySQL/MariaDB.

    Push al repo → actualització automàtica del servidor.

🤖 Aplicació Android

    De moment, el projecte no inclou app nativa.

    La funcionalitat es fa via navegador web SPA.

📎 Altres elements

    Backend: Node.js + Express + ws

    Frontend: Vue.js + Vuetify + Pinia

    IA: TensorFlow.js MoveNet (client-side)

    Persistència: MySQL / opcional JSON export

    Idioma: Català

# Documentació
Llistat d'alguns dels punts que han de quedar explicats en aquesta carpeta. Poden ser tots en aquest fitxer o en diversos fitxers enllaçats.

És obligatori modificar aquest document!!

## Documentació bàsica MÍNIMA
 * Objectius
 * Arquitectura bàsica
   * Tecnologies utilitzades
   * Interrelació entre els diversos components
 * Com crees l'entorn de desenvolupament
 * Com desplegues l'aplicació a producció
 * Llistat d'endpoints de l'API de backend (també podeu documentar-ho amb swagger)
    * Rutes
   * Exemples de JSON de peticó
   * Exemples de JSON de resposta i els seus codis d'estat 200? 404?
 * Aplicació Android
 * Altres elements importants.
 * ...
