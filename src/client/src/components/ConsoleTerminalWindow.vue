<template>
    <section ref="windowElement" class="console-window" :class="{ 'is-fullscreen': isFullscreen, 'is-light': theme === 'light' }" :aria-label="t('consoleWindowTitle')">
        <div class="console-window-bar">
            <div class="console-window-lights" aria-hidden="true">
                <span class="console-window-light is-close"></span>
                <span class="console-window-light is-minimize"></span>
                <span class="console-window-light is-maximize"></span>
            </div>

            <div class="console-window-title" translate="no">{{ t("consoleWindowTitle") }}</div>

            <div class="console-window-actions">
                <div class="console-connection" role="status">
                    <span class="console-connection-dot" :class="{ 'is-connected': connected }" aria-hidden="true"></span>
                    <span class="sr-only">{{ connectionLabel }}</span>
                </div>
                <button
                    type="button"
                    class="console-fullscreen-button"
                    :aria-label="fullscreenLabel"
                    :title="fullscreenLabel"
                    @click="toggleFullscreen"
                >
                    <Minimize2 v-if="isFullscreen" :size="15" aria-hidden="true" />
                    <Maximize2 v-else :size="15" aria-hidden="true" />
                </button>
            </div>
        </div>

        <Terminal class="min-h-0 flex-1" name="console" mode="mainTerminal" appearance="mac" :color-scheme="theme" surface="bare" />
    </section>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, shallowRef, useTemplateRef } from "vue";
import { useI18n } from "vue-i18n";
import { Maximize2, Minimize2 } from "@lucide/vue";
import Terminal from "./Terminal.vue";
import { useTheme } from "../composables/useTheme";

const { connected } = defineProps<{
    connected : boolean;
}>();

const { t } = useI18n();
const { theme } = useTheme();
const windowElement = useTemplateRef<HTMLElement>("windowElement");
const isFullscreen = shallowRef(false);
const connectionLabel = computed(() => connected ? t("consoleConnected") : t("consoleReconnecting"));
const fullscreenLabel = computed(() => isFullscreen.value ? t("exitFullscreen") : t("enterFullscreen"));

function syncFullscreenState() : void {
    isFullscreen.value = document.fullscreenElement === windowElement.value;
}

async function toggleFullscreen() : Promise<void> {
    if (isFullscreen.value) {
        await document.exitFullscreen();
        return;
    }

    await windowElement.value?.requestFullscreen();
}

onMounted(() => {
    document.addEventListener("fullscreenchange", syncFullscreenState);
    syncFullscreenState();
});

onUnmounted(() => {
    document.removeEventListener("fullscreenchange", syncFullscreenState);
});
</script>

<style scoped>
.console-window {
    display: flex;
    min-height: 0;
    flex: 1;
    flex-direction: column;
    overflow: hidden;
    border: 1px solid var(--terminal-chrome-highlight);
    border-radius: 1rem;
    background: var(--terminal-window);
    box-shadow: 0 1.5rem 4.5rem var(--terminal-shadow), inset 0 1px var(--terminal-highlight);
    opacity: 0;
    transform: translateY(.5rem) scale(.995);
    animation: console-window-open .18s ease-out forwards;
}

.console-window:fullscreen,
.console-window.is-fullscreen {
    border: 0;
    border-radius: 0;
}

.console-window.is-light {
    --terminal-window: var(--terminal-window-light);
    --terminal-chrome: var(--terminal-chrome-light);
    --terminal-chrome-highlight: var(--terminal-chrome-highlight-light);
    --terminal-ink: var(--terminal-ink-light);
    --terminal-ink-muted: var(--terminal-ink-muted-light);
    --terminal-connected: var(--terminal-connected-light);
    --terminal-highlight: var(--terminal-highlight-light);
    --terminal-shadow: var(--terminal-shadow-light);
}

.console-window-bar {
    display: grid;
    min-height: 2.5rem;
    flex: none;
    grid-template-columns: 1fr minmax(0, 12rem) 1fr;
    align-items: center;
    border-bottom: 1px solid var(--terminal-chrome-highlight);
    background: var(--terminal-chrome);
    padding: 0 .75rem;
}

.console-window-lights,
.console-window-actions {
    display: flex;
    min-width: 0;
    align-items: center;
    gap: .45rem;
}

.console-window-actions {
    justify-content: flex-end;
}

.console-window-light {
    width: .7rem;
    height: .7rem;
    border-radius: 9999px;
    box-shadow: inset 0 1px color-mix(in srgb, var(--terminal-highlight) 22%, white), 0 0 0 1px var(--terminal-shadow);
}

.is-close { background: var(--terminal-close); }
.is-minimize { background: var(--terminal-minimize); }
.is-maximize { background: var(--terminal-maximize); }

.console-window-title {
    min-width: 0;
    overflow: hidden;
    color: var(--terminal-ink);
    font-size: .75rem;
    font-weight: 600;
    letter-spacing: .01em;
    text-align: center;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.console-connection-dot {
    display: block;
    width: .42rem;
    height: .42rem;
    border-radius: 9999px;
    background: var(--terminal-ink-muted);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--terminal-ink-muted) 10%, transparent);
}

.console-connection-dot.is-connected {
    background: var(--terminal-connected);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--terminal-connected) 10%, transparent);
}

.console-fullscreen-button {
    display: inline-flex;
    width: 1.75rem;
    height: 1.75rem;
    align-items: center;
    justify-content: center;
    border: 0;
    border-radius: .375rem;
    background: transparent;
    color: var(--terminal-ink-muted);
    transition: background-color .15s ease, color .15s ease;
}

.console-fullscreen-button:hover {
    background: var(--terminal-chrome-highlight);
    color: var(--terminal-ink);
}

.console-fullscreen-button:focus-visible {
    outline: 2px solid var(--terminal-focus);
    outline-offset: 2px;
}

@keyframes console-window-open {
    to {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
}

@media (max-width: 639px) {
    .console-window {
        border-radius: .75rem;
    }

    .console-window-bar {
        grid-template-columns: 1fr auto 1fr;
    }
}

@media (prefers-reduced-motion: reduce) {
    .console-window {
        animation: none;
        opacity: 1;
        transform: none;
    }

    .console-fullscreen-button {
        transition: none;
    }
}
</style>
