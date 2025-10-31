<script setup>
import { reactive, watch } from 'vue'

const props = defineProps({
  features: { type: Object, default: null }
})

/* Schema persistent dels camps vists. 
   - No s’esborra mai; si una feature no arriba en un frame, al panell es mostra “—”. */
const seen = reactive({
  top: new Set(),         
  angles: new Set(),
  inclinations: new Set(),
  velocities: new Set(),
  normalized: new Set(),
  keypointNames: new Set()
})

// Quan arriben features noves, actualitzem el “schema” (sense eliminar res)
watch(() => props.features, (f) => {
  if (!f) return

  // Top-level (excloent sub-objects especials)
  Object.keys(f).forEach(k => {
    if (!['angles','inclinations','velocities','normalized','keypoints'].includes(k)) {
      seen.top.add(k)
    }
  })

  // Subgrups
  if (f.angles && typeof f.angles === 'object') {
    Object.keys(f.angles).forEach(k => seen.angles.add(k))
  }
  if (f.inclinations && typeof f.inclinations === 'object') {
    Object.keys(f.inclinations).forEach(k => seen.inclinations.add(k))
  }
  if (f.velocities && typeof f.velocities === 'object') {
    Object.keys(f.velocities).forEach(k => seen.velocities.add(k))
  }
  if (f.normalized && typeof f.normalized === 'object') {
    Object.keys(f.normalized).forEach(k => seen.normalized.add(k))
  }

  // Keypoints: persistim els noms (o índex si no hi ha name)
  if (Array.isArray(f.keypoints)) {
    f.keypoints.forEach((kp, idx) => {
      seen.keypointNames.add(kp?.name ?? String(idx))
    })
  }
}, { immediate: true })

// helper per formatar números bonics
function fmt(val, digits = 2) {
  if (val == null || Number.isNaN(val)) return '—'
  if (typeof val === 'number' && Number.isFinite(val)) return val.toFixed(digits)
  return String(val)
}
</script>

<template>
  <!-- NOTE: Se ha aplicado un estilo oscuro en la tarjeta de PoseFeatures en Individual.vue. 
       Aquí ajustamos los colores para que se vea legible dentro de ese contenedor. -->
  <aside class="panel">
    <h3>Datos del Sensor</h3>
    <ul>
      <!-- TOP-LEVEL (fps, score, qualsevol altre camp que arribi) -->
      <li v-for="k in Array.from(seen.top).sort()" :key="'top-' + k">
        <strong class="label">{{ k }}:</strong>
        <span class="value">
          {{ typeof features?.[k] === 'number'
              ? fmt(features?.[k], k === 'fps' || k === 'fpsSmooth' ? 1 : 3)
              : (features?.[k] ?? '—') }}
        </span>
      </li>

      <!-- ANGLES (°) -->
      <li v-if="seen.angles.size" class="group-title"><strong>Ángulos (º)</strong></li>
      <li v-for="name in Array.from(seen.angles).sort()" :key="'ang-' + name" class="sub-item">
        <span class="label">{{ name }}:</span> <span class="value">{{ fmt(features?.angles?.[name], 1) }}</span>
      </li>

      <!-- INCLINACIONS (°) -->
      <li v-if="seen.inclinations.size" class="group-title"><strong>Inclinaciones (º)</strong></li>
      <li v-for="name in Array.from(seen.inclinations).sort()" :key="'inc-' + name" class="sub-item">
        <span class="label">{{ name }}:</span> <span class="value">{{ fmt(features?.inclinations?.[name], 1) }}</span>
      </li>

      <!-- VELOCITATS (unitats normalitzades/s) -->
      <li v-if="seen.velocities.size" class="group-title"><strong>Velocidades (u/s)</strong></li>
      <li v-for="name in Array.from(seen.velocities).sort()" :key="'vel-' + name" class="sub-item">
        <span class="label">{{ name }}: v=</span><span class="value">{{ fmt(features?.velocities?.[name]?.v, 3) }}</span>
      </li>

      <!-- NORMALITZADES (valors normalitzats o objectes {x,y} etc.) -->
      <li v-if="seen.normalized.size" class="group-title"><strong>Normalizadas</strong></li>
      <li v-for="name in Array.from(seen.normalized).sort()" :key="'norm-' + name" class="sub-item">
        <template v-if="typeof features?.normalized?.[name] === 'object'">
          <span class="label">{{ name }}:</span>
          <span v-for="(v, k2) in features?.normalized?.[name]" :key="name + '-' + k2">
            {{ k2 }}=<span class="value">{{ fmt(v, 3) }}</span><span v-if="k2 !== Object.keys(features?.normalized?.[name]).slice(-1)[0]">, </span>
          </span>
        </template>
        <template v-else>
          <span class="label">{{ name }}:</span> <span class="value">{{ fmt(features?.normalized?.[name], 3) }}</span>
        </template>
      </li>

      <!-- Resum de keypoints (mateixa idea que ja tenies) -->
      <li v-if="Array.from(seen.keypointNames).length" class="group-title">
        <strong class="label">Puntos Clave:</strong>
        <span>n=<span class="value">{{ features?.keypoints?.length ?? 0 }}</span></span>
      </li>
    </ul>
  </aside>
</template>

<style scoped>
/* Estilos ajustados para el tema oscuro del contenedor padre (features-card en Individual.vue) */
.panel {
  /* No necesita fondo ni borde, ya está en una v-card oscura */
  padding: 0;
  margin: 0;
  color: #E0E0E0; /* Texto claro para el fondo oscuro */
  font-family: 'Inter', sans-serif; 
  font-size: 0.8rem;
}
.panel h3 { 
  display: none; /* El título ya lo pone el componente padre (Individual.vue) */
}
ul { 
  margin: 0; 
  padding-left: 0; 
  list-style: none;
}
li {
    margin-bottom: 4px;
    padding-left: 0;
    line-height: 1.2;
}
.group-title {
    margin-top: 8px;
    border-bottom: 1px dashed #555;
    padding-bottom: 2px;
    color: #4CAF50; /* Color primario para títulos de grupo */
    font-size: 0.85rem;
    font-weight: 600;
}
.sub-item {
    margin-left: 10px;
    color: #bdbdbd; /* Color gris claro para las etiquetas */
}
.label {
    font-weight: 400;
}
.value {
    font-weight: 700;
    color: #F5F5F5; /* Color blanco brillante para los valores numéricos */
}
</style>
