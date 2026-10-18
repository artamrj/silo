<script setup lang="ts">
import type { TooltipContentEmits, TooltipContentProps } from "reka-ui"
import type { HTMLAttributes } from "vue"
import { reactiveOmit } from "@vueuse/core"
import { cn } from "@/lib/utils"
import { TooltipContent, TooltipPortal, useForwardPropsEmits } from "reka-ui"

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<TooltipContentProps & { class?: HTMLAttributes["class"] }>(),
  {
    // Flush with the rail's outer edge (rail 16→96px, trigger right edge 78px).
    // The rail's right border is suppressed while a tooltip is open, so the two
    // surfaces meet with no hairline between them.
    sideOffset: 18,
  },
)
const emits = defineEmits<TooltipContentEmits>()

const delegatedProps = reactiveOmit(props, "class")

const forwarded = useForwardPropsEmits(delegatedProps, emits)
</script>

<template>
  <TooltipPortal>
    <TooltipContent
      data-slot="tooltip-content"
      v-bind="{ ...$attrs, ...forwarded }"
      :class="cn(
        // Flush against the rail's outer edge. z-40 keeps it below the z-50 rail,
        // and the rail hides its right border while a tooltip is open, so the two
        // surfaces meet with no outline between them.
        'silo-tooltip bg-surface/80 text-ink backdrop-blur z-40 w-fit select-none',
        // Flat inner edge (butts the rail), rounded outer tip.
        'rounded-l-none rounded-r-xl px-3 py-1.5 text-[13px] font-semibold tracking-tight whitespace-nowrap',
        // Outer shadow only: no left shadow to draw a seam on the rail.
        'shadow-[10px_14px_44px_-14px_rgb(0_0_0/0.5)]',
        'origin-(--reka-tooltip-content-transform-origin) will-change-transform',
        // Slides out from inside the rail with a springy overshoot.
        'data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-80 data-[state=delayed-open]:slide-in-from-left-8',
        'data-[state=instant-open]:animate-in data-[state=instant-open]:fade-in-0 data-[state=instant-open]:zoom-in-80 data-[state=instant-open]:slide-in-from-left-8',
        'data-[state=delayed-open]:duration-400 data-[state=instant-open]:duration-400',
        'data-[state=delayed-open]:ease-[cubic-bezier(0.34,1.56,0.64,1)] data-[state=instant-open]:ease-[cubic-bezier(0.34,1.56,0.64,1)]',
        // Retracts back into the rail.
        'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-90 data-[state=closed]:slide-out-to-left-2',
        'data-[state=closed]:duration-200 data-[state=closed]:ease-in',
        props.class,
      )"
    >
      <slot />
    </TooltipContent>
  </TooltipPortal>
</template>
