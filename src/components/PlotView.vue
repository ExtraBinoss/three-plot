<template>
  <div ref="container" class="plot-container"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { PlotContainer } from '../plot/PlotContainer';

const container = ref<HTMLElement | null>(null);
let plotContainer: PlotContainer | null = null;

const props = defineProps<{
  // Add props if needed for initial config
}>();

const emit = defineEmits<{
  (e: 'ready', plot: PlotContainer): void;
}>();

onMounted(() => {
  if (container.value) {
    plotContainer = new PlotContainer(container.value);
    emit('ready', plotContainer);
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
}
</style>
