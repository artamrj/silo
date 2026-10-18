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

<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import { getContainerExecTerminalName } from "../../../shared/utils";
import Terminal from "../components/Terminal.vue";
import PageContainer from "../components/PageContainer.vue";
import PageHeader from "../components/PageHeader.vue";

const route = useRoute();

const stackName = computed(() => String(route.params.stackName ?? ""));
const shell = computed(() => String(route.params.type ?? ""));
const serviceName = computed(() => String(route.params.serviceName ?? ""));

const terminalName = computed(() => getContainerExecTerminalName(stackName.value, serviceName.value, 0, shell.value));

const sh = computed(() => ({
    name: "containerTerminal",
    params: {
        stackName: stackName.value,
        serviceName: serviceName.value,
        type: "sh",
    },
}));
</script>
