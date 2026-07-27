<script setup lang="ts">
import { cn } from "@/lib/utils";
import { computed } from "vue";

interface BorderBeamProps {
  class?: string;
  size?: number;
  /** 光束「垂直於路徑方向」的厚度(px)。不填則沿用 size（正方形，原本行為）。
   * 想要拖尾變長又不want觸穿對邊時，把 size 加大、height 維持小於容器最短邊即可。 */
  height?: number;
  duration?: number;
  borderWidth?: number;
  anchor?: number;
  colorFrom?: string;
  colorTo?: string;
  delay?: number;
  /** 光束模糊半徑(px)，讓邊緣變柔和發光；0 或不填 = 原本銳利邊緣。 */
  glow?: number;
}

const props = withDefaults(defineProps<BorderBeamProps>(), {
  size: 200,
  height: undefined,
  duration: 15000,
  anchor: 90,
  borderWidth: 1.5,
  colorFrom: "#ffaa40",
  colorTo: "#9c40ff",
  delay: 0,
  glow: 0,
});

const durationInSeconds = computed(() => `${props.duration}s`);
const delayInSeconds = computed(() => `${props.delay}s`);
const beamHeight = computed(() => props.height ?? props.size);
const glowFilter = computed(() =>
  props.glow > 0 ? `blur(${props.glow}px)` : "none",
);
</script>

<template>
  <div
    :class="
      cn(
        `border-beam animate-border-beam pointer-events-none absolute inset-0 rounded-[inherit] mask-intersect! [mask-clip:padding-box,border-box]! [border:calc(var(--border-width)*1px)_solid_transparent] [mask:linear-gradient(transparent,transparent),linear-gradient(white,white)] after:absolute after:w-[calc(var(--size)*1px)] after:h-[calc(var(--beam-height)*1px)] after:[animation-delay:var(--delay)] after:[background:linear-gradient(to_left,var(--color-from),var(--color-to),transparent)] after:[offset-anchor:calc(var(--anchor)*1%)_50%] after:[offset-path:rect(0_auto_auto_0_round_calc(var(--beam-height)*1px))]`,
        props.class,
      )
    "
  />
</template>

<style scoped>
.border-beam {
  --size: v-bind(size);
  --beam-height: v-bind(beamHeight);
  --duration: v-bind(durationInSeconds);
  --anchor: v-bind(anchor);
  --border-width: v-bind(borderWidth);
  --color-from: v-bind(colorFrom);
  --color-to: v-bind(colorTo);
  --delay: v-bind(delayInSeconds);
  --glow-filter: v-bind(glowFilter);
}

.animate-border-beam::after {
  animation: border-beam-anim var(--duration) infinite linear;
  filter: var(--glow-filter);
}

@keyframes border-beam-anim {
  to {
    offset-distance: 100%;
  }
}
</style>
