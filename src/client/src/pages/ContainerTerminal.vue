<template>
    <PageContainer wide fill>
        <PageHeader :title="`${$t('terminal')} - ${serviceName} (${stackName})`">
            <template #actions>
                <router-link :to="sh" class="button button-normal no-underline">{{ $t("Switch to sh") }}</router-link>
            </template>
        </PageHeader>

        <Terminal :key="terminalName" class="h-[410px] flex-1" :rows="20" mode="interactive" :name="terminalName" :stack-name="stackName" :service-name="serviceName" :shell="shell"></Terminal>
    </PageContainer>
</template>

<script>
import { getContainerExecTerminalName } from "../../../shared/utils";
import Terminal from "../components/Terminal.vue";
import PageContainer from "../components/PageContainer.vue";
import PageHeader from "../components/PageHeader.vue";

export default {
    components: {
        PageContainer,
        PageHeader,
        Terminal,
    },
    computed: {
        stackName() {
            return this.$route.params.stackName;
        },
        shell() {
            return this.$route.params.type;
        },
        serviceName() {
            return this.$route.params.serviceName;
        },
        terminalName() {
            return getContainerExecTerminalName(this.stackName, this.serviceName, 0, this.shell);
        },
        sh() {
            return {
                name: "containerTerminal",
                params: {
                    stackName: this.stackName,
                    serviceName: this.serviceName,
                    type: "sh",
                },
            };
        },
    },
};
</script>
