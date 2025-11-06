// --- UMBRALES GENERALES ---
// Sentadillas (Squats)
export const MIN_SQUAT_ANGLE = 120 
export const MAX_SQUAT_ANGLE = 165 

// Flexiones (Push-ups)
export const MIN_PUSHUP_ANGLE = 80   // brazo flexionado (abajo)
export const MAX_PUSHUP_ANGLE = 160  // brazo extendido (arriba)

// --- NUEVOS UMBRALES ---
// Abdominales (Sit-ups)
export const MIN_SITUP_HIP_ANGLE = 90  
export const MAX_SITUP_HIP_ANGLE = 165 

// Zancadas (Lunges)
export const MIN_LUNGE_KNEE_ANGLE = 90  
export const MAX_LUNGE_KNEE_ANGLE = 160 

// Jumping Jacks
export const MIN_JUMPING_JACKS_ANKLE_DIST_RATIO = 1.5; // Distancia de tobillos vs. hombros
export const MAX_JUMPING_JACKS_ANKLE_DIST_RATIO = 0.8;
export const MIN_JUMPING_JACKS_WRIST_Y_RATIO = 0.8; // Posición Y de muñecas vs. hombros

// Mountain Climbers
export const MIN_MOUNTAIN_CLIMBERS_KNEE_ANGLE = 80;
export const MAX_MOUNTAIN_CLIMBERS_KNEE_ANGLE = 150;


/**
 * Máquina de estados genérica para contar repeticiones.
 * @param {number} angle - Ángulo clave (rodilla, codo, etc.).
 * @param {string} currentState - 'up' o 'down'.
 * @param {number} minAngle - Ángulo de posición baja.
 * @param {number} maxAngle - Ángulo de posición alta.
 * @returns {{newState: string, repCompleted: boolean}}
 */
function checkRep(angle, currentState, minAngle, maxAngle) {
  if (!Number.isFinite(angle)) return { newState: currentState, repCompleted: false };

  let newState = currentState;
  let repCompleted = false;

  // Posición baja
  if (angle < minAngle && currentState === 'up') {
    newState = 'down';
  } 
  // Posición alta → cuenta repetición
  else if (angle > maxAngle && currentState === 'down') {
    newState = 'up';
    repCompleted = true;
  }

  return { newState, repCompleted };
}

/**
 * Jumping Jacks: Comprueba la distancia entre tobillos y la altura de las muñecas.
 * @param {object} features - Objeto completo de features de PoseSkeleton.
 * @param {string} currentState - 'down' o 'up'.
 * @returns {{newState: string, repCompleted: boolean}}
 */
export function checkJumpingJacksRep(features, currentState) {
  const { keypoints, normalized } = features;
  if (!keypoints || keypoints.length < 24 || !normalized?.shoulderWidth_px) {
    return { newState: currentState, repCompleted: false };
  }

  const shoulderWidth = normalized.shoulderWidth_px;
  const leftAnkle = keypoints.find(kp => kp.name === 'left_ankle');
  const rightAnkle = keypoints.find(kp => kp.name === 'right_ankle');
  const leftWrist = keypoints.find(kp => kp.name === 'left_wrist');
  const leftShoulder = keypoints.find(kp => kp.name === 'left_shoulder');

  if (!leftAnkle || !rightAnkle || !leftWrist || !leftShoulder) {
    return { newState: currentState, repCompleted: false };
  }

  const ankleDist = Math.hypot(leftAnkle.x - rightAnkle.x, leftAnkle.y - rightAnkle.y);
  const ankleDistRatio = ankleDist / shoulderWidth;
  const wristYRatio = leftWrist.y / leftShoulder.y;

  let newState = currentState;
  let repCompleted = false;

  if (ankleDistRatio > MIN_JUMPING_JACKS_ANKLE_DIST_RATIO && wristYRatio < MIN_JUMPING_JACKS_WRIST_Y_RATIO) {
    if (currentState === 'down') newState = 'up';
  } else if (ankleDistRatio < MAX_JUMPING_JACKS_ANKLE_DIST_RATIO) {
    if (currentState === 'up') {
      newState = 'down';
      repCompleted = true;
    }
  }

  return { newState, repCompleted };
}

/**
 * Mountain Climbers: Comprueba si una de las rodillas se acerca al pecho.
 * @param {object} angles - Ángulos de la pose.
 * @param {string} currentState - 'center' o 'knee_forward'.
 * @returns {{newState: string, repCompleted: boolean}}
 */
export function checkMountainClimbersRep(angles, currentState) {
  const leftKneeBent = angles.leftKnee < MIN_MOUNTAIN_CLIMBERS_KNEE_ANGLE;
  const rightKneeBent = angles.rightKnee < MIN_MOUNTAIN_CLIMBERS_KNEE_ANGLE;

  return checkRep(leftKneeBent || rightKneeBent ? 70 : 160, currentState, MIN_MOUNTAIN_CLIMBERS_KNEE_ANGLE, MAX_MOUNTAIN_CLIMBERS_KNEE_ANGLE);
}

// --- EJERCICIOS EXISTENTES ---

export function checkSquatRep(angles, currentState) {
  if (!angles.leftKnee || !angles.rightKnee) 
    return { newState: currentState, repCompleted: false };

  const avgKneeAngle = (angles.leftKnee + angles.rightKnee) / 2;
  return checkRep(avgKneeAngle, currentState, MIN_SQUAT_ANGLE, MAX_SQUAT_ANGLE);
}

/**
 * Flexiones (Push-ups): mide el ángulo del codo
 */
export function checkPushupRep(angles, currentState) {
  if (!angles.leftElbow || !angles.rightElbow)
    return { newState: currentState, repCompleted: false };

  const avgElbowAngle = (angles.leftElbow + angles.rightElbow) / 2;

  // Aplicamos una zona muerta (histeresis) para evitar conteos dobles
  const result = checkRep(avgElbowAngle, currentState, MIN_PUSHUP_ANGLE, MAX_PUSHUP_ANGLE);
  return result;
}

// --- NUEVOS EJERCICIOS ---

export  function checkSitupRep(angles, currentState) {
  if (!angles.leftHip || !angles.rightHip)
    return { newState: currentState, repCompleted: false };

  const avgHipAngle = (angles.leftHip + angles.rightHip) / 2
  return checkRep(avgHipAngle, currentState, MIN_SITUP_HIP_ANGLE, MAX_SITUP_HIP_ANGLE);
}

export function checkLungeRep(angles, currentState) {
  if (!angles.leftKnee || !angles.rightKnee)
    return { newState: currentState, repCompleted: false };

  // Una zancada se considera 'abajo' si CUALQUIERA de las rodillas está flexionada por debajo del umbral.
  // Y se considera 'arriba' si AMBAS rodillas están extendidas por encima del umbral.
  const kneeAngle = Math.min(angles.leftKnee, angles.rightKnee);
  
  // Usamos la función genérica checkRep para la lógica.
  return checkRep(kneeAngle, currentState, MIN_LUNGE_KNEE_ANGLE, MAX_LUNGE_KNEE_ANGLE);
}
