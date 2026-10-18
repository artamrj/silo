<script setup lang="ts">
import type { TooltipProviderProps } from "reka-ui"
import { TooltipProvider } from "reka-ui"

const props = withDefaults(defineProps<TooltipProviderProps>(), {
  delayDuration: 120,
  skipDelayDuration: 300,
  // Every tooltip in Silo is a non-interactive text label. Leaving hoverable
  // content on makes reka keep the tooltip mounted while the pointer rests on
  // the label itself, and a sidebar label sits flush against the rail, right in
  // the pointer's exit path — so the tooltip lingers after the icon is left.
  // Closing on trigger leave is the correct behaviour for plain labels.
  disableHoverableContent: true,
})
</script>

<template>
  <TooltipProvider
    data-slot="tooltip-provider"
    v-bind="props"
  >
    <slot />
  </TooltipProvider>
</template>
