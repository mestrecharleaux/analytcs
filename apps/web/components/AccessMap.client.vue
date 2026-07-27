<script setup lang="ts">
import L from "leaflet";

const props = defineProps<{
  locations: Array<{ city?: string; region?: string; country?: string; latitude?: number; longitude?: number; count: number }>;
}>();
const mapNode = ref<HTMLElement>();
let map: L.Map | undefined;

onMounted(() => {
  if (!mapNode.value) return;
  map = L.map(mapNode.value, { scrollWheelZoom: false, attributionControl: true }).setView([-14.2, -51.9], 4);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: "© OpenStreetMap"
  }).addTo(map);

  const points: L.LatLngExpression[] = [];
  for (const location of props.locations) {
    if (location.latitude == null || location.longitude == null) continue;
    const point: L.LatLngExpression = [location.latitude, location.longitude];
    points.push(point);
    L.circleMarker(point, {
      radius: Math.min(22, 6 + Math.sqrt(location.count)),
      color: "#2e6f78",
      fillColor: "#c4944f",
      fillOpacity: 0.5,
      weight: 2
    })
      .bindPopup(`<strong>${location.city || "Local desconhecido"}</strong><br>${formatNumber(location.count)} acessos`)
      .addTo(map);
  }
  if (points.length) map.fitBounds(L.latLngBounds(points), { padding: [30, 30], maxZoom: 9 });
});

onBeforeUnmount(() => map?.remove());
</script>

<template>
  <div ref="mapNode" class="access-map" aria-label="Mapa das regiões de acesso" />
</template>
