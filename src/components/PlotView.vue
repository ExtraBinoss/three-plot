  <template>
  <div ref="container" class="plot-container"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { PlotContainer, type PlotContainerOptions } from '../plot/PlotContainer';

const container = ref<HTMLElement | null>(null);
let plotContainer: PlotContainer | null = null;

const props = defineProps<{
  options?: PlotContainerOptions;
}>();

const emit = defineEmits<{
  (e: 'ready', plot: PlotContainer): void;
}>();

onMounted(() => {
  if (container.value) {
    plotContainer = new PlotContainer(container.value, props.options);
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
