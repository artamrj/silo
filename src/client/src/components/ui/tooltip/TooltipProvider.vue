<script setup lang="ts">
import type { TooltipProviderProps } from "reka-ui"
import { onMounted, onUnmounted } from "vue"
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
  // Clicking a nav icon focuses its link, and reka opens the tooltip on focus.
  // Restoring the tab later re-fires that focus, resurrecting the tooltip on
  // whatever was last clicked. Only keyboard focus should open a tooltip.
  ignoreNonKeyboardFocus: true,
})

/**
 * Reka closes every tooltip on a `tooltip.open` document event (it is the same
 * signal used to dismiss competing tooltips). Switching browser tabs or windows
 * while a tooltip is open never fires `pointerleave`, so the tooltip would
 * otherwise still be showing when the tab comes back. Broadcast the close on
 * window blur and on tab hide.
 */
function closeOpenTooltips() {
  document.dispatchEvent(new CustomEvent("tooltip.open"))
}

function onVisibilityChange() {
  if (document.hidden) closeOpenTooltips()
}

onMounted(() => {
  window.addEventListener("blur", closeOpenTooltips)
  document.addEventListener("visibilitychange", onVisibilityChange)
})

onUnmounted(() => {
  window.removeEventListener("blur", closeOpenTooltips)
  document.removeEventListener("visibilitychange", onVisibilityChange)
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
