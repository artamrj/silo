<template>
    <PageContainer wide fill>
        <PageHeader :title="$t('console')" :description="$t('consoleDescription')" />

        <Terminal v-if="enableConsole" class="h-[410px] flex-1" :rows="20" mode="mainTerminal" name="console"></Terminal>

        <div v-else-if="!processing" class="card bg-warning/10" role="alert">
            <h4 class="mb-2 text-warning">{{ $t("Console is not enabled") }}</h4>
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
    </PageContainer>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import Terminal from "../components/Terminal.vue";
import PageContainer from "../components/PageContainer.vue";
import PageHeader from "../components/PageHeader.vue";
import { useSocket } from "../composables/useSocket";
import type { SocketResult } from "../../../shared/socket-events";

const { emitServer } = useSocket();

const processing = ref(true);
const enableConsole = ref(false);

onMounted(() => {
    emitServer("checkMainTerminal", (res : SocketResult) => {
        enableConsole.value = res.ok === true;
        processing.value = false;
    });
});
</script>
