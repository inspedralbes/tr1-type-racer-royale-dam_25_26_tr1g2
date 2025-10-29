# 📚 Documentació FitAI – Entrenador Virtual en Temps Real

Aquest document recull tota la documentació mínima requerida per al projecte, organitzada per seccions. Es pot expandir amb fitxers addicionals enllaçats si cal.

---

## 1. Objectius
L'objectiu principal del projecte és desenvolupar una aplicació web completa que permeti a diversos usuaris participar en una sessió d'entrenament física de forma síncrona. L’aplicació utilitza la càmera web i un model d’Intel·ligència Artificial per:

- Analitzar els moviments en temps real.  
- Comptar repeticions de l’exercici.  
- Avaluar la tècnica.  
- Mostrar un leaderboard en temps real per a tots els participants.  

MVP: unir-se a una sala, comptar repeticions d’un exercici, leaderboard en temps real.  
Stretch Goal: feedback més detallat de tècnica, suport a més d’un exercici.

---

## 2. Arquitectura bàsica

### 2.1 Tecnologies Utilitzades
- **Frontend:** Vue.js + Vuetify (SPA)  
- **Gestió d’Estat:** Pinia  
- **Backend:** Node.js + Express + WebSockets natius (`ws`)  
- **Base de Dades:** MySQL / MariaDB (Docker)  
- **Intel·ligència Artificial:** TensorFlow.js amb model MoveNet (execució al client)  

### 2.2 Interrelació entre components
- **Client:** Captura vídeo, detecta keypoints, calcula angles, màquina d’estats, envia dades via WebSockets.  
- **Servidor:** Gestiona sessions, participants, leaderboard, broadcast de dades.  
- **Base de Dades:** Emmagatzema usuaris, sessions i resultats finals.  

### 2.3 Estructura de components (Frontend)
- `WorkoutView.vue` – vista principal.  
- `VideoProcessor.vue` – càmera i processament d’IA.  
- `UserStats.vue` – mètriques de l’usuari actual.  
- `Leaderboard.vue` – classificació en temps real.  
- **Pinia Store:** centralitza estat global i comunicació WebSocket.

---

## 3. Entorn de desenvolupament
1. Clonar repositori.  
2. Configurar Docker amb MySQL/MariaDB.  
3. Instal·lar dependències frontend i backend:
```bash
cd backend && npm install
cd frontend && npm install


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
