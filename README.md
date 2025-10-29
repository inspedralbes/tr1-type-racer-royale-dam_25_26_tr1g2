# Grup 2

## 👥 Integrants del projecte

- Hugo Córdoba Cobo
- Matías Arturo Negrón Carranza
- Marta Haro Font
- Arnau Perera Ganuza
- Pau Uclés Lahuerta

# 🌟 Nom del Projecte
FitAI

# 🎯 Objectiu breu del projecte
# 📈 Estat breu del projecte
# 🌐 Enllaços del projecte
Taiga: https://tree.taiga.io/project/pul2-tr1-fitai/timeline
# 🗂️ Estructura del projecte

# Arquitectura i Lògica 
## ⚙️ Taula d’Esdeveniments

| 🧩 **Nom de l’esdeveniment (`action`)** | 📤 **Enviat per** | 💬 **Descripció / Explicació**                                                                                          |
| --------------------------------------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `join_room`                             | Client → Servidor | El client demana unir-se a una sessió (enviant `sessionId` i `userId`).                                                 |
| `joined_ack`                            | Servidor → Client | El servidor confirma que el client s’ha unit correctament i envia la llista de participants actuals.                    |
| `pose_frame`                            | Client → Servidor | El client envia un fotograma amb els **keypoints** (punts del cos) detectats per *MoveNet* per analitzar el moviment.   |
| `rep_update`                            | Servidor → Client | El servidor informa que s’ha comptat una **nova repetició** o que ha canviat l’estat del moviment (pujant, baixant...). |
| `technique_feedback`                    | Servidor → Client | El servidor envia **feedback sobre la tècnica** de l’usuari (ex: “Baixa més”, “Mantén l’esquena recta”).                |
| `leaderboard_request`                   | Client → Servidor | El client demana veure la classificació actual dels participants.                                                       |
| `leaderboard_update`                    | Servidor → Client | El servidor respon amb el **rànquing actualitzat** (participants i nombre de repeticions).                              |
| `end_session`                           | Client → Servidor | El client (o host) indica que la sessió ha acabat.                                                                      |
| `session_summary`                       | Servidor → Client | El servidor envia el **resum final** de la sessió (resultats, reps totals, arxiu JSON de resultats, etc.).              |
| `error`                                 | Servidor → Client | El servidor informa d’un **error** (per exemple, sessió inexistent o dades incorrectes).                                |
| `ack`                                   | Servidor → Client | Confirmació genèrica que una acció s’ha rebut o processat correctament.                                                 |

# Diagrama del Sistema Client-Servidor
<img width="641" height="471" alt="Esquema del client-servidor" src="https://github.com/user-attachments/assets/7573870f-318d-458a-b757-87ac8efd015b" />

## 📊 Dades de sessió (Exemple)
{
  "sessionId": "sess_12345",
  "hostId": "host_1",
  "startedAt": 1690000000000,
  "endedAt": 1690000035000,
  "exercise": "squat",
  "settings": {
    "thresholds": {
      "knee_bottom_deg": 90,
      "knee_stand_deg": 160,
      "torso_lean_max_deg": 25
    },
    "smoothing_window": 5
  },
  "participants": [
    {
      "userId": "user_1",
      "displayName": "Anna",
      "reps": 12,
      "repDetails": [
        {
          "repIndex": 1,
          "startedAt": 1690000001000,
          "endedAt": 1690000002400,
          "durationMs": 1400,
          "quality": "good",
          "feedback": []
        },
        {
          "repIndex": 2,
          "startedAt": 1690000003000,
          "endedAt": 1690000004200,
          "durationMs": 1200,
          "quality": "poor",
          "feedback": [
            "torso_massa_inclinat"
          ]
        }
      ],
      "aggregateMetrics": {
        "avgRepDurationMs": 1250,
        "goodReps": 9,
        "badReps": 3,
        "maxDepthAchievedDeg": 85
      }
    }
  ],
  "summary": {
    "totalParticipants": 2,
    "totalReps": 20,
    "leaderboard": [
      {
        "userId": "user_2",
        "reps": 12
      },
      {
        "userId": "user_1",
        "reps": 8
      }
    ]
  },
  "rawDataRef": "frames/sess_12345_user_1_frames.json",
  "version": "1.0"
}

## 🔑 Keypoints Analitzats
- **Caderes:** Left Hip, Right Hip  
- **Genolls:** Left Knee, Right Knee  
- **Tormells:** Left Ankle, Right Ankle  
- **Espatlles:** Left Shoulder, Right Shoulder 

## 📐 Angles i Posicions Calculades
- **Knee Angle:** Angle entre Hip → Knee → Ankle (flexió de genoll)  
- **Hip Angle:** Angle entre Shoulder → Hip → Knee (profunditat del squat)  
- **Torso Lean:** Inclinació de l’esquena  
- **Shoulder-Mid-Hip:** Posició relativa de l’espatlla al centre de la cadera  
- **Ankle Stability:** Projecció del peu vs genoll (estabilitat)  

Aquestes mesures permeten **avaluar la tècnica i seguretat de cada squat**.  

## 🎛 Màquina d’Estats
La lògica de seguiment segueix una **màquina d’estats simple**:  

1. **Idle** – Esperant iniciar  
2. **Stand** – Posició inicial dreta  
3. **Descend** – Fase de baixada del squat  
4. **Bottom** – Posició baixa, squat complet  
5. **Ascend** – Fase de pujada  
6. **Rep Complete** – Repetició finalitzada correctament  

Cada transició depèn dels **angles i posicions calculades** per assegurar una rep correcta.

## ✨ Contacte
Per dubtes o incidències, contactar amb qualsevol membre de l’equip. 

# transversals
Esquema mínim de carpetes pels projectes transversals

És obligatori seguir aquesta estructura tot i que la podeu ampliar.

## Atenció
Un cop comenceu heu de canviar aquesta explicació amb la corresponent al vostre projecte (utilitzant markdown)

# Aquest fitxer ha de contenir com a mínim:
 * Nom dels integrants
 * Nom del projecte
 * Petita descripció
 * Adreça del gestor de tasques (taiga, jira, trello...)
 * Adreça del prototip gràfic del projecte (Penpot, figma, moqups...)
 * URL de producció (quan la tingueu)
 * Estat: (explicació d'en quin punt està)

