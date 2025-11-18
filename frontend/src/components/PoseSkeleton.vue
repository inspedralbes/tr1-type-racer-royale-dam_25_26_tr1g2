<!-- src/components/PoseSkeleton.vue -->
<script setup>
/*
  PoseSkeleton (Composition API, <script setup>)
  ------------------------------------------------------
  Goals
  - Open the webcam and show the video.
  - List all available cameras (videoinput).
  - Let the user switch camera using a <select> under the video.
  - Load MoveNet (Lightning) and draw skeleton on a canvas overlay.

  Key browser APIs:
  - MediaDevices.getUserMedia()
  - MediaDevices.enumerateDevices()
  - devicechange event
  - MediaStreamTrack.stop()
  - HTMLMediaElement.play()

  Notes
  - Always stop the previous stream before starting a new one.
  - After permission is granted, device labels become readable.
*/

import { ref, onMounted, onBeforeUnmount, watch } from 'vue'

// TensorFlow.js + backend WebGL
import * as tf from '@tensorflow/tfjs'
import '@tensorflow/tfjs-backend-webgl' // Importa el backend de WebGL
import '@tensorflow/tfjs-backend-wasm'  // Importa el backend de WASM como fallback

// Pose detection (MoveNet)
import * as poseDetection from '@tensorflow-models/pose-detection'

/* -----------------------------
   STATE (abans data())
------------------------------*/
const devices = ref([])           // [{ deviceId, label }]
const selectedId = ref('')        // deviceId seleccionat
const currentStream = ref(null)   // MediaStream actiu
const onDeviceChange = ref(null)  // handler per poder-lo eliminar

const videoEl = ref(null)         // <video>
const canvasRef = ref(null)       // <canvas> overlay per dibuixar esquelet

let detector = null               // MoveNet detector
let rafId = 0                     // requestAnimationFrame id per al loop

// NEW: mode d'origen i URL de vídeo local
const sourceMode = ref('camera')   // 'camera' | 'file'

/* -----------------------------
   HELPERS (angles, distàncies, normalització, velocitats) - NEW
------------------------------*/

// NEW: EMA (Exponential Moving Average) senzill per suavitzar FPS
function ema(prev, x, alpha = 0.2) {
  if (!Number.isFinite(x)) return prev
  if (!Number.isFinite(prev) || prev === 0) return x
  return prev * (1 - alpha) + x * alpha
}

// NEW: estat per a l'EMA d’FPS
let _fpsEma = 0

// NEW: estat angles anteriors per calcular velocitat angular (°/s)
const _prevAngles = {
  leftElbow: null, rightElbow: null,
  leftKnee:  null, rightKnee:  null,
  leftHip:   null, rightHip:   null
}

// NEW: distància euclidiana
function dist(a, b) {
  if (!a || !b) return null
  const dx = a.x - b.x, dy = a.y - b.y
  return Math.hypot(dx, dy)
}

// NEW: angle (en graus) donats tres punts A-B-C (angle al punt B)
function angleABC(A, B, C) {
  if (!A || !B || !C) return null
  const v1x = A.x - B.x, v1y = A.y - B.y
  const v2x = C.x - B.x, v2y = C.y - B.y
  const dot = v1x * v2x + v1y * v2y
  const m1 = Math.hypot(v1x, v1y), m2 = Math.hypot(v2x, v2y)
  if (!m1 || !m2) return null
  const cos = Math.min(1, Math.max(-1, dot / (m1 * m2)))
  return Math.acos(cos) * 180 / Math.PI
}

// NEW: inclinació (graus) de la línia AB respecte l'horitzontal
function inclinationDeg(A, B) {
  if (!A || !B) return null
  const ang = Math.atan2(B.y - A.y, B.x - A.x) * 180 / Math.PI
  return ang // 0=horitzontal, 90=vertical cap avall
}

// NEW: normalitza coordenades a [0,1] amb mida de vídeo
function normalizeKP(kp, w, h) {
  if (!kp) return null
  return { ...kp, nx: kp.x / w, ny: kp.y / h }
}

// NEW: estat anterior per calcular fps i velocitats
let _prevTime = 0
let _prevNormByName = null  // { name: { nx, ny } }



/* -----------------------------
   EMISSIÓ DE FEATURES (nou)
------------------------------*/
// NEW: exposem un event "features" cap al pare (App.vue) perquè el panell pugui pintar
const emit = defineEmits(['features'])

// NEW: emissor amb throttle (10Hz) per no saturar la UI del panell
const emitFeaturesThrottled = (() => {
  let last = 0
  return (payload) => {
    const now = performance.now()
    if (now - last > 100) {
      emit('features', payload)
      last = now
    }
  }
})()

/* -----------------------------
   UTILITATS DE CÀMERA
------------------------------*/
async function listVideoInputs (initialLoad = false) {
  if (!navigator.mediaDevices?.enumerateDevices) return
  const all = await navigator.mediaDevices.enumerateDevices()
  const cams = all.filter(d => d.kind === 'videoinput')

  devices.value = cams.map((d, idx) => ({
    deviceId: d.deviceId,
    label: d.label || `Camera ${idx + 1}`
  }))

  if (initialLoad && !selectedId.value && devices.value.length) {
    selectedId.value = devices.value[0].deviceId
  }
}

async function startCamera (deviceId = '') {
  // Atura l’stream anterior si existeix
  if (currentStream.value) {
    currentStream.value.getTracks().forEach(t => t.stop())
    currentStream.value = null
  }

  // Construeix constraints
  const constraints = deviceId
    ? { video: { deviceId: { exact: deviceId } }, audio: false }
    : { video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false }

  // Demana permís i obté el MediaStream
  const stream = await navigator.mediaDevices.getUserMedia(constraints)
  currentStream.value = stream

  // Assigna al <video> i reprodueix
  const v = videoEl.value
  if (v) {
    v.srcObject = stream
    try { await v.play() } catch (e) { console.error('No s’ha pogut iniciar el vídeo:', e) }
  }

  // Un cop concedit el permís, els labels ja són llegibles
  await listVideoInputs(true) // Indicar que es la carga inicial
}

/* -----------------------------
   DRAW (esquelet sobre canvas)
------------------------------*/
function drawSkeleton(ctx, keypoints) {
  if (!ctx || !keypoints?.length) return

  // Reseteja canvas
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)

  // Línies entre punts adjacents
  const pairs = poseDetection.util.getAdjacentPairs(poseDetection.SupportedModels.MoveNet)
  ctx.lineWidth = 2
  ctx.strokeStyle = '#ffffff'
  for (const [i, j] of pairs) {
    const a = keypoints[i], b = keypoints[j]
    if (!a || !b) continue
    if ((a.score ?? 1) < 0.3 || (b.score ?? 1) < 0.3) continue
    ctx.beginPath()
    ctx.moveTo(a.x, a.y)
    ctx.lineTo(b.x, b.y)
    ctx.stroke()
  }

  // Punts
  ctx.fillStyle = '#ffffff'
  for (const kp of keypoints) {
    if ((kp.score ?? 1) < 0.3) continue
    ctx.beginPath()
    ctx.arc(kp.x, kp.y, 3.5, 0, Math.PI * 2)
    ctx.fill()
  }
}
/* -----------------------------
   BUCLE PRINCIPAL (estima + dibuixa)  // FIX: guards + try/catch + features completes
------------------------------*/
async function loop() {
  const video = videoEl.value
  const canvas = canvasRef.value
  if (!video || !canvas || !detector) {
    rafId = requestAnimationFrame(loop)
    return
  }

  // Espera dades vàlides: evita "texture 0x0"
  if (
    video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA ||
    !video.videoWidth || !video.videoHeight
  ) {
    rafId = requestAnimationFrame(loop)
    return
  }

  // Mida canvas = mida vídeo
  if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
  }

  const ctx = canvas.getContext('2d')

  // Temps (fps + ema)
  const tNow = performance.now()
  const dt = _prevTime ? (tNow - _prevTime) / 1000 : 0
  const fpsNow = dt > 0 ? 1 / dt : 0
  _prevTime = tNow
  const fpsSmooth = (_fpsEma = ema(_fpsEma, fpsNow, 0.2))

  // Inferència protegida
  let keypoints = []
  try {
    const poses = await detector.estimatePoses(video, {
      maxPoses: 1,
      flipHorizontal: true
    })
    keypoints = poses[0]?.keypoints ?? []
  } catch (err) {
    console.warn('estimatePoses error (saltant frame):', err)
  }

  // Dibuix (si hi ha kp vàlids)
  if (keypoints.length) {
    drawSkeleton(ctx, keypoints)
  } else {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  // Índex per nom + normalització
  const W = video.videoWidth || canvas.width
  const H = video.videoHeight || canvas.height
  const byName = {}
  const normByName = {}
  for (const kp of keypoints) {
    const name = kp?.name ?? ''
    byName[name] = kp
    normByName[name] = normalizeKP(kp, W, H)
  }
  const L = (name) => byName[name]

  // Velocitats lineals (normalitzades/s) per punts clau
  const trackNames = ['left_wrist','right_wrist','left_ankle','right_ankle','nose']
  const velocities = {}
  for (const n of trackNames) {
    const cur = normByName[n]
    const prev = _prevNormByName?.[n]
    if (cur && prev && dt > 0) {
      const vx = (cur.nx - prev.nx) / dt
      const vy = (cur.ny - prev.ny) / dt
      velocities[n] = { vx, vy, v: Math.hypot(vx, vy) }
    } else {
      velocities[n] = { vx: null, vy: null, v: null }
    }
  }
  _prevNormByName = normByName

  // Angles (graus)
  const angles = {
    leftElbow:  angleABC(L('left_shoulder'),  L('left_elbow'),  L('left_wrist')),
    rightElbow: angleABC(L('right_shoulder'), L('right_elbow'), L('right_wrist')),
    leftKnee:   angleABC(L('left_hip'),       L('left_knee'),   L('left_ankle')),
    rightKnee:  angleABC(L('right_hip'),      L('right_knee'),  L('right_ankle')),
    leftHip:    angleABC(L('left_shoulder'),  L('left_hip'),    L('left_knee')),
    rightHip:   angleABC(L('right_shoulder'), L('right_hip'),   L('right_knee'))
  }

  // Velocitat angular (°/s) — si tenim dt
  const angularVelocities = {}
  if (dt > 0) {
    for (const k of Object.keys(angles)) {
      const cur = angles[k]
      const prev = _prevAngles[k]
      angularVelocities[k] = (Number.isFinite(cur) && Number.isFinite(prev)) ? (cur - prev) / dt : null
      _prevAngles[k] = cur
    }
  } else {
    for (const k of Object.keys(angles)) angularVelocities[k] = null
  }

  // Inclinacions (graus)
  const inclinations = {
    shoulders: inclinationDeg(L('left_shoulder'), L('right_shoulder')),
    hips:      inclinationDeg(L('left_hip'),      L('right_hip')),
    torso:     (function() {
      const sL = L('left_shoulder'), sR = L('right_shoulder')
      const hL = L('left_hip'),      hR = L('right_hip')
      const sMid = (sL && sR) ? { x: (sL.x + sR.x)/2, y: (sL.y + sR.y)/2 } : null
      const hMid = (hL && hR) ? { x: (hL.x + hR.x)/2, y: (hL.y + hR.y)/2 } : null
      return inclinationDeg(hMid, sMid)
    })()
  }

  // Mètriques normalitzades
  const shoulderWidth = (L('left_shoulder') && L('right_shoulder')) ? dist(L('left_shoulder'), L('right_shoulder')) : null
  const hipWidth      = (L('left_hip')      && L('right_hip'))      ? dist(L('left_hip'),      L('right_hip'))      : null
  const diag = Math.hypot(W, H) || 1
  const normalized = {
    shoulderWidth_px: shoulderWidth,
    hipWidth_px: hipWidth,
    shoulderWidth_norm: shoulderWidth != null ? (shoulderWidth / diag) : null,
    hipWidth_norm: hipWidth != null ? (hipWidth / diag) : null,
    nose_norm: normByName['nose'] ? { x: normByName['nose'].nx, y: normByName['nose'].ny } : null
  }

  // Score mig (robust a 0 kp)
  const scores = keypoints.map(k => k?.score ?? 0).filter(Number.isFinite)
  const meanScore = scores.length ? (scores.reduce((a,b)=>a+b,0)/scores.length) : 0

  // EMET SEMPRE un objecte complet de features (mai “res”)
  const features = {
    fps: fpsNow,
    fpsSmooth,                 // NEW
    score: meanScore,
    keypoints: keypoints.map(k => ({ name: k?.name ?? null, x: k?.x ?? null, y: k?.y ?? null, score: k?.score ?? null })),
    angles,
    angularVelocities,         // NEW
    inclinations,
    velocities,
    normalized
  }
  emitFeaturesThrottled(features)

  rafId = requestAnimationFrame(loop)
}

// NEW: atura el flux actual (càmera) i neteja recursos
function stopCurrentSource() {
  // Atura la càmera si està en ús
  if (currentStream.value) {
    currentStream.value.getTracks().forEach(t => t.stop())
    currentStream.value = null
  }
  // Si hi havia un vídeo local en ús, treu-lo i allibera el blob URL
  const v = videoEl.value
  if (v) {
    v.pause()
    v.srcObject = null
    v.removeAttribute('src')
    v.load()
  }
  if (fileUrl.value) {
    URL.revokeObjectURL(fileUrl.value)
    fileUrl.value = null
  }
}

// NEW: arrenca reproducció des d'un fitxer de vídeo local
async function startFileVideo(file) {
  stopCurrentSource()                 // neteja qualsevol font anterior
  const url = URL.createObjectURL(file)
  fileUrl.value = url

  const v = videoEl.value
  if (!v) return

  v.srcObject = null
  v.src = url
  v.loop = true                       // bucle automàtic
  v.muted = true                      // ajuda amb autoplay policies
  v.playsInline = true

  try {
    await v.play()                    // reproducció (l’input d’arxiu ja és “gesture”)
  } catch (err) {
    console.error('No es pot reproduir el vídeo local:', err)
  }
}

/* -----------------------------
   CICLE DE VIDA
------------------------------*/
onMounted(async () => {
  try {
    // 1. Inicializa el backend de TF.js de forma robusta
    try {
      await tf.setBackend('webgl');
      console.log('Backend de TensorFlow.js inicializado con WebGL.');
    } catch (e) {
      console.warn('Fallo al inicializar WebGL, intentando con WASM...');
      await tf.setBackend('wasm');
      console.log('Backend de TensorFlow.js inicializado con WASM.');
    }
    await tf.ready();

    // 2. Inicia la cámara
    await startCamera()

    // 3. Crea el detector de pose MoveNet (Lightning)
    detector = await poseDetection.createDetector(
      poseDetection.SupportedModels.MoveNet,
      { modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING, enableSmoothing: true }
    )

    // 4. Inicia el bucle de renderizado
    rafId = requestAnimationFrame(loop)
  } catch (err) {
    console.error('Error inicialitzant càmera o detector:', err)
    alert('No se ha podido inicializar la cámara o el modelo de detección de pose. Asegúrate de dar permisos a la cámara.')
  } finally {
    if (navigator.mediaDevices?.addEventListener) {
      onDeviceChange.value = async () => { await listVideoInputs(false) } // No es carga inicial
      navigator.mediaDevices.addEventListener('devicechange', onDeviceChange.value)
    }
  }
})

onBeforeUnmount(() => {
  // Atura stream i listeners
  if (currentStream.value) {
    currentStream.value.getTracks().forEach(t => t.stop())
    currentStream.value = null
  }
  if (navigator.mediaDevices?.removeEventListener && onDeviceChange.value) {
    navigator.mediaDevices.removeEventListener('devicechange', onDeviceChange.value)
  }
  // Atura raf
  if (rafId) cancelAnimationFrame(rafId)
  // Allibera detector si ho permet
  try { detector?.dispose?.() } catch {}


   if (fileUrl.value) URL.revokeObjectURL(fileUrl.value)   // NEW: allibera blob
})

/* -----------------------------
   WATCHERS
------------------------------*/
watch(selectedId, (id) => {
  if (id) startCamera(id)
})



</script>

<template>
  <div class="skeleton-wrap">
    <!-- Àrea de vídeo + canvas overlay -->
    <div class="stage">
      <!-- playsinline evita auto-fullscreen a mòbil; muted+autoplay ajuda amb autoplay -->
      <video ref="videoEl" playsinline muted autoplay class="video"></video>
      <canvas ref="canvasRef" class="overlay"></canvas>
    </div>

    <!-- Selector de càmera sota el vídeo -->
    <div class="camera-select">
      <select v-model="selectedId" class="select">
        <option v-for="d in devices" :key="d.deviceId" :value="d.deviceId">
          {{ d.label }}
        </option>
      </select>
    </div>
 


  </div>
</template>

<style scoped>
/* Container: stack video and select vertically to save horizontal space */
/* PoseSkeleton.vue -> <style scoped> */

/* Video frame with fixed aspect ratio and rounded corners */
.stage {
  position: relative;
  width: 100%; /* Important: Ocupa el 100% de la columna que t'assigni Multijugador.vue */
  aspect-ratio: 4 / 3; /* Torna a afegir aspect-ratio per adaptar-se a l'amplada */
  min-height: auto; /* Permet que l'alçada es defineixi per l'aspect-ratio */
  /* ... altres propietats ... */
}

/* Assegura't que l'element que conté tot (`.skeleton-wrap`) també sigui flexible */
.skeleton-wrap {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: center;
  width: 100%; /* Ocupa tota l'amplada disponible */
}

/* Elimina o revisa aquestes línies si les tens, ja que limiten l'amplada: */
/* .stage { width: min(100%, 720px); ... } */ 
/* .skeleton-wrap { width: min(100%, 720px); ... } */ 
/* Substitueix-los per un simple `width: 100%;` */

/* The video element fills the frame */
.video {
  width: 100%;
  height: 100%;
  object-fit: contain; /* keep proportions without cropping */
  display: block;
}

/* Canvas overlay on top of video */
.overlay {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

/* Simple select below the video */
.camera-select {
  width: min(100%, 720px);
}

.camera-select .select {
  width: 100%;
  padding: 6px 8px;
}
</style>
