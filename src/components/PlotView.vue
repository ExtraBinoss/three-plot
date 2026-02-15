<template>
  <div ref="container" class="plot-container">
    <div v-if="error" class="webgl-error">
      <h3>WebGL Error</h3>
      <p>{{ error }}</p>
      <p>Please check if hardware acceleration is enabled in your browser.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { ThreePlot, type PlotContainer, type PlotContainerOptions } from '../plot';

const container = ref<HTMLElement | null>(null);
const error = ref<string | null>(null);
let plotContainer: PlotContainer | null = null;

const props = defineProps<{
  options?: PlotContainerOptions;
}>();

const emit = defineEmits<{
  (e: 'ready', plot: PlotContainer): void;
}>();

onMounted(() => {
  if (container.value) {
    try {
      plotContainer = ThreePlot.init(container.value, props.options);
      emit('ready', plotContainer);
    } catch (e: any) {
      error.value = e.message || "Failed to initialize WebGL";
    }
  }
});

onUnmounted(() => {
  if (plotContainer) {
    plotContainer.destroy();
  }
});
</script>

<style scoped>
.plot-container {
  width: 100%;
  height: 100%;
  overflow: hidden;
  position: relative;
}

.webgl-error {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  background: rgba(255, 0, 0, 0.1);
  padding: 2rem;
  border-radius: 8px;
  border: 1px solid rgba(255, 0, 0, 0.3);
  color: #ff6666;
}
</style>
