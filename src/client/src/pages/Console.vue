<template>
    <PageContainer wide fill>
        <PageHeader :title="$t('console')" :description="$t('consoleDescription')" />

        <Terminal v-if="enableConsole" class="h-[410px] flex-1" :rows="20" mode="mainTerminal" name="console"></Terminal>

        <div v-else-if="!processing" class="card border-warning bg-warning/10" role="alert">
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

<script>
import Terminal from "../components/Terminal.vue";
import PageContainer from "../components/PageContainer.vue";
import PageHeader from "../components/PageHeader.vue";

export default {
    components: {
        PageContainer,
        PageHeader,
        Terminal,
    },
    data() {
        return {
            processing: true,
            enableConsole: false,
        };
    },
    mounted() {
        this.$root.emitServer("checkMainTerminal", (res) => {
            this.enableConsole = res.ok;
            this.processing = false;
        });
    },
};
</script>
