<template>
    <section class="console-page">
        <ConsoleTerminalWindow v-if="enableConsole" :connected="socketIO.connected" />

        <div v-else-if="processing" class="console-page-status" role="status">
            {{ $t("connecting...") }}
        </div>

        <div v-else class="console-page-disabled" role="alert">
            <h1 class="console-page-disabled-title">{{ $t("Console is not enabled") }}</h1>
            <i18n-t keypath="ConsoleNotEnabledMSG1" tag="p">
                <template #docker><code>{{ $t('dockerCode') }}</code></template>
                <template #rm><code>{{ $t('rmCode') }}</code></template>
            </i18n-t>

            <i18n-t keypath="ConsoleNotEnabledMSG2" tag="p">
                <template #rmRf>
                    <code>{{ $t('rmRfCode') }}</code>
                </template>
            </i18n-t>

            <i18n-t keypath="ConsoleNotEnabledMSG3" tag="p">
                <template #envVar>
                    <code>{{ $t('envVarCode') }}</code>
                </template>
            </i18n-t>
        </div>
    </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import ConsoleTerminalWindow from "../components/ConsoleTerminalWindow.vue";
import { useSocket } from "../composables/useSocket";
import type { SocketResult } from "../../../shared/socket-events";

const { emitServer, socketIO } = useSocket();

const processing = ref(true);
const enableConsole = ref(false);

onMounted(() => {
    emitServer("checkMainTerminal", (res : SocketResult) => {
        enableConsole.value = res.ok === true;
        processing.value = false;
    });
});
</script>

<style scoped>
.console-page {
    display: flex;
    min-height: 0;
    flex: 1;
    flex-direction: column;
    padding: .75rem;
}

.console-page-status {
    display: grid;
    min-height: 0;
    flex: 1;
    place-items: center;
    color: var(--color-ink-muted);
    font-size: .875rem;
}

.console-page-disabled {
    width: min(100%, 42rem);
    margin: auto;
    border-radius: 1rem;
    background: color-mix(in srgb, var(--color-warning) 10%, transparent);
    padding: 1.25rem;
    color: var(--color-ink);
}

.console-page-disabled-title {
    color: var(--color-warning);
}

.console-page-disabled :deep(p + p) {
    margin-top: 1rem;
}

@media (min-width: 768px) {
    .console-page {
        padding: 1rem;
    }
}
</style>
