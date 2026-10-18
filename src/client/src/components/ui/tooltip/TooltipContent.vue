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
    // 18px puts the tooltip's inner edge flush against the sidebar rail.
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
        'silo-tooltip bg-surface/85 text-ink backdrop-blur-xl border border-line z-50 w-fit select-none',
        // Tab welded to the rail: flat inner edge, rounded outer tip, a touch bigger.
        'rounded-l-none rounded-r-2xl border-l-0 px-4 py-2.5 text-sm font-semibold tracking-tight whitespace-nowrap',
        'shadow-[0_12px_44px_-12px_rgb(0_0_0/0.45)]',
        'origin-(--reka-tooltip-content-transform-origin)',
        // Grows out of the rail with a springy overshoot.
        'data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-75 data-[state=delayed-open]:slide-in-from-left-4',
        'data-[state=instant-open]:animate-in data-[state=instant-open]:fade-in-0 data-[state=instant-open]:zoom-in-75 data-[state=instant-open]:slide-in-from-left-4',
        'data-[state=delayed-open]:duration-350 data-[state=instant-open]:duration-350',
        'data-[state=delayed-open]:ease-[cubic-bezier(0.34,1.56,0.64,1)] data-[state=instant-open]:ease-[cubic-bezier(0.34,1.56,0.64,1)]',
        // Retracts back into the rail.
        'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-90 data-[state=closed]:slide-out-to-left-2',
        'data-[state=closed]:duration-150 data-[state=closed]:ease-in',
        props.class,
      )"
    >
      <slot />
    </TooltipContent>
  </TooltipPortal>
</template>
