<script setup lang="ts">
const props = defineProps<{ points: Array<{ date: string; count: number }> }>();
const width = 760;
const height = 210;
const coords = computed(() => {
  const max = Math.max(1, ...props.points.map((point) => point.count));
  return props.points.map((point, index) => ({
    ...point,
    x: props.points.length === 1 ? width / 2 : (index / (props.points.length - 1)) * width,
    y: height - (point.count / max) * (height - 28) - 10
  }));
});
const line = computed(() => coords.value.map((point) => `${point.x},${point.y}`).join(" "));
</script>

<template>
  <div class="trend-chart">
    <svg :viewBox="`0 0 ${width} ${height}`" role="img" aria-label="Tendência de acessos reais">
      <defs>
        <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#2e6f78" stop-opacity=".28" />
          <stop offset="1" stop-color="#2e6f78" stop-opacity="0" />
        </linearGradient>
      </defs>
      <path v-for="y in [50,100,150,200]" :key="y" :d="`M0 ${y} H${width}`" class="chart-grid" />
      <polygon v-if="coords.length" :points="`0,${height} ${line} ${width},${height}`" fill="url(#area)" />
      <polyline :points="line" fill="none" stroke="#2e6f78" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
      <circle v-for="point in coords" :key="point.date" :cx="point.x" :cy="point.y" r="4" fill="#fff" stroke="#2e6f78" stroke-width="3">
        <title>{{ point.date }}: {{ point.count }}</title>
      </circle>
    </svg>
    <div class="chart-labels">
      <span v-for="point in coords.filter((_, i) => i % Math.max(1, Math.ceil(coords.length / 6)) === 0)" :key="point.date">
        {{ new Date(`${point.date}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }) }}
      </span>
    </div>
  </div>
</template>
