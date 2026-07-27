<script setup lang="ts">
import { Replayer } from "@rrweb/replay";

const props = defineProps<{ events: Array<Record<string, any>>; live?: boolean }>();
const root = ref<HTMLElement>();
const playing = ref(true);
const speed = ref(1);
const currentTime = ref(0);
const duration = ref(0);
let replayer: Replayer | undefined;
let timer: ReturnType<typeof setInterval> | undefined;
let resizeObserver: ResizeObserver | undefined;
let recordedWidth = 0;
let recordedHeight = 0;

function formatTime(value: number) {
  const seconds = Math.max(0, Math.floor(value / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function fitReplay() {
  if (!root.value || !recordedWidth || !recordedHeight) return;
  const wrapper = root.value.querySelector<HTMLElement>(".replayer-wrapper");
  if (!wrapper) return;

  const availableWidth = root.value.clientWidth;
  const availableHeight = root.value.clientHeight;
  const scale = Math.min(availableWidth / recordedWidth, availableHeight / recordedHeight);

  wrapper.style.width = `${recordedWidth}px`;
  wrapper.style.height = `${recordedHeight}px`;
  wrapper.style.position = "absolute";
  wrapper.style.left = "50%";
  wrapper.style.top = "50%";
  wrapper.style.transformOrigin = "center center";
  wrapper.style.transform = `translate(-50%, -50%) scale(${scale})`;
}

function init() {
  if (!root.value || props.events.length < 2) return;
  const meta = props.events.find(
    (event) => typeof event.data?.width === "number" && typeof event.data?.height === "number"
  );
  recordedWidth = meta?.data.width || 0;
  recordedHeight = meta?.data.height || 0;

  replayer = new Replayer(props.events as any, {
    root: root.value,
    liveMode: Boolean(props.live),
    skipInactive: true,
    showWarning: false,
    UNSAFE_replayCanvas: false
  } as any);
  const api = replayer as any;
  api.on?.("resize", ({ width, height }: { width: number; height: number }) => {
    recordedWidth = width;
    recordedHeight = height;
    requestAnimationFrame(fitReplay);
  });
  resizeObserver = new ResizeObserver(fitReplay);
  resizeObserver.observe(root.value);
  requestAnimationFrame(fitReplay);
  duration.value = api.getMetaData?.().totalTime || 0;
  if (props.live) api.startLive?.(Date.now());
  else api.play?.();
  timer = setInterval(() => {
    currentTime.value = api.getCurrentTime?.() || 0;
    duration.value = api.getMetaData?.().totalTime || duration.value;
  }, 250);
}

function toggle() {
  if (!replayer) return;
  const api = replayer as any;
  if (playing.value) api.pause?.();
  else if (props.live) api.startLive?.(Date.now());
  else api.play?.(currentTime.value);
  playing.value = !playing.value;
}

function changeSpeed() {
  (replayer as any)?.setConfig?.({ speed: speed.value });
}

function seek(event: Event) {
  const target = event.target as HTMLInputElement;
  currentTime.value = Number(target.value);
  (replayer as any)?.play?.(currentTime.value);
  playing.value = true;
}

function addEvents(events: Array<Record<string, any>>) {
  for (const event of events) (replayer as any)?.addEvent?.(event);
  if (props.live) {
    (replayer as any)?.startLive?.(Date.now());
    playing.value = true;
  }
}

function goLive() {
  (replayer as any)?.startLive?.(Date.now());
  playing.value = true;
}

defineExpose({ addEvents, goLive });
onMounted(init);
onBeforeUnmount(() => {
  if (timer) clearInterval(timer);
  resizeObserver?.disconnect();
  (replayer as any)?.pause?.();
});
</script>

<template>
  <div class="session-replay">
    <div ref="root" class="session-replay-stage">
      <div v-if="events.length < 2" class="empty-state">Aguardando eventos suficientes para iniciar a reconstrução…</div>
    </div>
    <div class="session-replay-controls">
      <button class="replay-control-button" :aria-label="playing ? 'Pausar' : 'Reproduzir'" @click="toggle">
        {{ playing ? "Ⅱ" : "▶" }}
      </button>
      <span>{{ formatTime(currentTime) }}</span>
      <input :value="currentTime" type="range" min="0" :max="duration || 1" step="100" aria-label="Posição da reprodução" @input="seek" />
      <span>{{ formatTime(duration) }}</span>
      <select v-model="speed" aria-label="Velocidade da reprodução" @change="changeSpeed">
        <option :value=".5">0,5x</option><option :value="1">1x</option><option :value="1.5">1,5x</option><option :value="2">2x</option>
      </select>
    </div>
    <div v-if="live" class="session-live-strip"><span><i /> Recebendo novos eventos</span><button @click="goLive">Ir para o ao vivo</button></div>
  </div>
</template>
