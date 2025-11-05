// src/utils/exercise-detection.js

// --- UMBRALES GENERALES ---
export const MIN_SQUAT_ANGLE = 120 
export const MAX_SQUAT_ANGLE = 165 

export const MIN_PUSHUP_ANGLE = 100 
export const MAX_PUSHUP_ANGLE = 160 

// --- NUEVOS UMBRALES ---
// Abdominales (Sit-ups): Ángulo en la cadera (Hip) para detectar la flexión
export const MIN_SITUP_HIP_ANGLE = 90  // Flexionado (cuerpo arriba)
export const MAX_SITUP_HIP_ANGLE = 165 // Extendido (cuerpo abajo, plano)

// Zancadas (Lunges): Ángulo en la rodilla trasera (Knee)
export const MIN_LUNGE_KNEE_ANGLE = 90  // Rodilla flexionada (casi toca el suelo)
export const MAX_LUNGE_KNEE_ANGLE = 160 // Rodilla extendida (posición inicial)

/**
 * Función genérica de máquina de estados para contar repeticiones.
 * @param {number} angle - El ángulo clave para la detección.
 * @param {string} currentState - 'up' o 'down'.
 * @param {number} minAngle - El ángulo que define la posición de 'down'.
 * @param {number} maxAngle - El ángulo que define la posición de 'up'.
 * @returns {{newState: string, repCompleted: boolean}}
 */
function checkRep(angle, currentState, minAngle, maxAngle) {
    if (!Number.isFinite(angle)) return { newState: currentState, repCompleted: false };

    let newState = currentState;
    let repCompleted = false;

    // 1. Posición BAJA (Down)
    if (angle < minAngle && currentState === 'up') {
        newState = 'down';
    } 
    
    // 2. Posición ALTA (Up) -> ¡Suma la repetición!
    else if (angle > maxAngle && currentState === 'down') {
        newState = 'up';
        repCompleted = true;
    }

    return { newState, repCompleted };
}


// --- LÓGICA DE EJERCICIOS EXISTENTES ---

export function checkSquatRep(angles, currentState) {
    if (!angles.leftKnee || !angles.rightKnee) return { newState: currentState, repCompleted: false };
    const avgKneeAngle = (angles.leftKnee + angles.rightKnee) / 2;
    return checkRep(avgKneeAngle, currentState, MIN_SQUAT_ANGLE, MAX_SQUAT_ANGLE);
}

export function checkPushupRep(angles, currentState) {
    if (!angles.leftElbow || !angles.rightElbow) return { newState: currentState, repCompleted: false };
    const avgElbowAngle = (angles.leftElbow + angles.rightElbow) / 2;
    return checkRep(avgElbowAngle, currentState, MIN_PUSHUP_ANGLE, MAX_PUSHUP_ANGLE);
}

// --- LÓGICA DE NUEVOS EJERCICIOS ---

/**
 * Abdominales (Sit-ups): Basado en la flexión del torso (ángulo de la cadera).
 * Nota: Asume que el usuario está en el suelo (o una esterilla).
 */
export function checkSitupRep(angles, currentState) {
    // Usamos el ángulo de la cadera (hip) para medir la flexión del torso.
    if (!angles.leftHip || !angles.rightHip) return { newState: currentState, repCompleted: false };
    
    // Un sit-up implica que el torso se flexiona hacia las piernas.
    // Cuanto más pequeño sea el ángulo de la cadera, más arriba está el torso.
    const avgHipAngle = (angles.leftHip + angles.rightHip) / 2;
    
    // Invertimos la lógica del UP/DOWN en checkRep si el ángulo ALTO (extendido) es el valor mayor
    // Aquí: minAngle (90) es "UP" (contraído), maxAngle (165) es "DOWN" (extendido).
    return checkRep(avgHipAngle, currentState, MIN_SITUP_HIP_ANGLE, MAX_SITUP_HIP_ANGLE);
}


/**
 * Zancadas (Lunges): Basado en la flexión de la rodilla trasera.
 * Nota: Es complejo saber qué rodilla es la "delantera" y "trasera" automáticamente. 
 * Asumiremos que ambas rodillas deben extenderse/flexionarse secuencialmente para una repetición.
 * Para simplificar, contaremos la repetición cuando **ambas** rodillas hayan vuelto a la posición alta.
 */
export function checkLungeRep(angles, currentState) {
    if (!angles.leftKnee || !angles.rightKnee) return { newState: currentState, repCompleted: false };

    let newState = currentState;
    let repCompleted = false;
    
    // 1. Detectar si alguna rodilla está en la posición baja (DOWN)
    const leftDown = angles.leftKnee < MIN_LUNGE_KNEE_ANGLE;
    const rightDown = angles.rightKnee < MIN_LUNGE_KNEE_ANGLE;

    if (leftDown || rightDown) {
        if (currentState === 'up') {
            newState = 'down';
        }
    } 
    
    // 2. Detectar si ambas rodillas están en la posición alta (UP)
    const leftUp = angles.leftKnee > MAX_LUNGE_KNEE_ANGLE;
    const rightUp = angles.rightKnee > MAX_LUNGE_KNEE_ANGLE;

    if (leftUp && rightUp) {
        if (currentState === 'down') {
            newState = 'up';
            repCompleted = true; // Se cuenta la repetición al volver a la posición inicial (ambas piernas rectas)
        }
    }

    return { newState, repCompleted };
}