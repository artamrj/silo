<template>
    <div class="@container">
        <div class="text-sm font-semibold text-ink">
            {{ stat.Name }}
        </div>
        <div class="mt-1 flex justify-between gap-2 text-xs text-ink-muted @max-[420px]:flex-col">
            <div class="flex flex-col gap-1 @max-[420px]:flex-row">
                <div class="font-semibold">
                    {{ $t('CPU') }}
                </div>
                <div>
                    {{ stat.CPUPerc }}
                </div>
            </div>
            <div class="flex flex-col gap-1 @max-[420px]:flex-row">
                <div class="font-semibold">
                    {{ $t('memory') }}
                </div>
                <div>
                    {{ stat.MemUsage }} ({{ stat.MemPerc }})
                </div>
            </div>
            <div class="flex flex-col gap-1 @max-[420px]:flex-row">
                <div class="font-semibold">
                    {{ $t('networkIO') }}
                </div>
                <div>
                    {{ stat.NetIO }}
                </div>
            </div>
            <div class="flex flex-col gap-1 @max-[420px]:flex-row">
                <div class="font-semibold">
                    {{ $t('blockIO') }}
                </div>
                <div>
                    {{ stat.BlockIO }}
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { DockerStatEntry } from "../composables/types";

defineProps<{
    stat : DockerStatEntry;
}>();
</script>
