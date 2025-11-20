# 🏋️ **FitAI**

### **DAM_25_26_TR1G2**

Aquest document serveix com a introducció al projecte, incloent l'organització, arquitectura i procés de desplegament.

---

## 📑 Contingut

- [Metadades del Projecte](#-metadades-del-projecte)
- [Arquitectura](#-arquitectura)
  - [Components Principals](#1-components-principals)
  - [Gestió de l’Estat i Connexions](#2-gestió-de-lestat-i-connexions)
  - [Autenticació i Seguretat](#3-autenticació-i-seguretat)
- [Desplegament Local (Docker)](#-desplegament-local-docker)
- [Estructura i Prototipatge](#-estructura-i-prototipatge)
- [Metodologia de Treball](#-metodologia-de-treball)

---

## 👥 **Metadades del Projecte**

| Camp               | Detall |
|--------------------|--------|
| **Grup**           | Grup 2 |
| **Integrants**     | Veure taula següent amb GitHub handles |
| **Objectiu Breu**  | Desenvolupar una aplicació web per a sessions d’entrenament conjuntes, analitzant el moviment en temps real amb MoveNet (TensorFlow.js), comptant repeticions i sincronitzant dades via WebSockets. |
| **Estat Breu**     | Acabat: Backend i frontend estructurats, IA MoveNet integrada, WebSockets operatius i MVP funcional. Backlog gestionat a Taiga. |
| **Link del Projecte** | [https://trainai.dam.inspedralbes.cat](https://trainai.dam.inspedralbes.cat) |
| **Tasques (Taiga)** | [https://tree.taiga.io/project/pul2-tr1-fitai/timeline](https://tree.taiga.io/project/pul2-tr1-fitai/timeline) |

### 👥 **Integrants del projecte i GitHub**

| Nom | GitHub |
|-----|--------|
| Arnau Perera Ganuza | [elperera](https://github.com/elperera) |
| Matías Arturo Negrón Carranza | [maatiasnc](https://github.com/maatiasnc) |
| Marta Haro Font | [Mxrta22](https://github.com/Mxrta22) |
| Hugo Córdoba Cobo | [hugooocc](https://github.com/hugooocc) |
| Pau Uclés | [PauGit2134](https://github.com/PauGit2134) |

---

## 🏗️ **Arquitectura**

El backend segueix un model d’**Arquitectura de Servidor Dual**, separant processament transaccional i comunicació en temps real.

### **1. Components Principals**

| Component              | Port | Tecnologies            | Funció                                                             |
| ---------------------- | ---- | ---------------------- | ------------------------------------------------------------------ |
| **Servidor API HTTP**  | 9000 | Express.js, bcrypt     | Registre/Login, gestió de rutines, operacions sense estat.         |
| **Servidor WebSocket** | 8082 | ws (Node.js)           | Sessions de joc en temps real, xat, sincronització de repeticions. |
| **Base de Dades**      | 3306 | MySQL (mysql2/promise) | Emmagatzematge persistent: usuaris, rutines i sessions.            |

---

### **2. Gestió de l’Estat i Connexions**

#### **Connexió MySQL**

* Pool de connexions compartit
* Reintents automàtics (fins a 10)
* 3 segons entre intents
* En cas de fallar: l’aplicació s’atura (evita inconsistències)

#### **Estat WebSocket**

* `sessions`: agrupació de connexions per *sessionId*
* `clientMetadata`: estat de cada client (ws, userId, reps actuals)

---

### **3. Autenticació i Seguretat**

* Contrasenyes encriptades amb **bcrypt (10 salts)**
* Sistema de migració d’usuaris convidats → compte real

#### ⚠️ **Risc Actual**

L’aplicació **no utilitza tokens (JWT)** ni middleware d’autorització.  
El backend confia en el `userId` rebut del client → *Risc d’impersonació i manipulació de dades*.

🔐 **Acció imprescindible:** implementar validació de sessió amb tokens.

---

## 🚀 **Desplegament Local (Docker)**

Tot el projecte s’executa via **Docker Compose**.

### **1. Requisits**

* Docker
* Docker Compose

### **2. Fitxers Clau**

| Fitxer                 | Funció                                 |
| ---------------------- | -------------------------------------- |
| **.env**               | Variables d’entorn, credencials, ports |
| **docker-compose.yml** | Orquestració del backend i MySQL       |

### **3. Passos**

```bash
# 1. Clonar repositori
git clone https://github.com/inspedralbes/tr1-type-racer-royale-dam_25_26_tr1g2.git
cd FitAI

# 2. Configurar .env
NODE_ENV=development
API_PORT=3000
WS_PORT=8080

# 3. Executar amb Docker
docker-compose up --build

# Logs esperats
[MySQL] Pool conectado a db:3306/fitai_db
Servidor Express en puerto 9000
WebSocket Server listening on port 8082

# 4. Tancament
docker-compose down

```
## 🎨 **Estructura i Prototipatge**

### **1. Carpetes Principals**

| Carpeta         | Contingut |
|-----------------|-----------|
| **`/node_modules`** | Paquets i dependències instal·lades de Node.js necessàries per al backend i/o eines del projecte. |
| **`/frontend`**     | Arxius del client: HTML, CSS, JavaScript, imatges i tota la interfície que es serveix a l’usuari. |
| **`/proxy`**        | Configuració i arxius de **Nginx**: reverse proxy, redireccions, gestió de rutes i forwarding cap al backend Express. |
| **`/backend`**      | Backend en **Node.js/Express**: rutes API, WebSockets, lògica del servidor i connexió a la base de dades. |

## 🗺️ **Metodologia de Treball**

Metodologia **Agile/Kanban**, enfocada en entrega contínua.

| Fase               | Descripció                                         | Freqüència        |
| ------------------ | -------------------------------------------------- | ----------------- |
| **Sprints**        | Blocs curts de desenvolupament amb objectius clars | Setmanal          |
| **Planificació**   | Definició d’objectius i tasques                    | Inici de setmana  |
