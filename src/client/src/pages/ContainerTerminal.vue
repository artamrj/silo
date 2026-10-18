<template>
    <transition name="slide-fade" appear>
        <div>
            <h1 class="mb-3">{{ $t("terminal") }} - {{ serviceName }} ({{ stackName }})</h1>

            <div class="mb-3">
                <router-link :to="sh" class="button button-normal">{{ $t("Switch to sh") }}</router-link>
            </div>

            <Terminal :key="terminalName" class="h-[410px]" :rows="20" mode="interactive" :name="terminalName" :stack-name="stackName" :service-name="serviceName" :shell="shell"></Terminal>
        </div>
    </transition>
</template>

<script>
import { getContainerExecTerminalName } from "../../../shared/utils";
import Terminal from "../components/Terminal.vue";

export default {
    components: {
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
