# Grup 2

# 👥 Integrants del projecte

Hugo Córdoba Cobo
Matías Arturo Negrón Carranza
Marta Haro Font
Arnau Perera Ganuza
Pau Uclés Lahuerta

# 🌟 Nom del Projecte
FitAI

# 🎯 Objectiu breu del projecte
# 📈 Estat breu del projecte
# 🌐 Enllaços del projecte
# 🗂️ Estructura del projecte

# Arquitectura i Lògica 
# ⚙️ Taula d’Esdeveniments

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

# Diagrama del Sistema
<img width="641" height="471" alt="Esquema del client-servidor" src="https://github.com/user-attachments/assets/7573870f-318d-458a-b757-87ac8efd015b" />

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
