<template>
    <PageContainer>
        <PageHeader :title="$t('Dashboard')" :description="$t('dashboardDescription')" />

        <!-- Stats -->
        <div class="card mb-4 p-2">
            <div class="grid grid-cols-1 gap-2 text-center sm:grid-cols-3">
                <div class="rounded-xl bg-muted px-3.5 py-3">
                    <h3 class="text-xs font-bold tracking-wider text-ink-muted uppercase">{{ $t("active") }}</h3>
                    <span class="block text-3xl font-bold text-primary">{{ activeNum }}</span>
                </div>
                <div class="rounded-xl bg-muted px-3.5 py-3">
                    <h3 class="text-xs font-bold tracking-wider text-ink-muted uppercase">{{ $t("exited") }}</h3>
                    <span class="block text-3xl font-bold text-danger">{{ exitedNum }}</span>
                </div>
                <div class="rounded-xl bg-muted px-3.5 py-3">
                    <h3 class="text-xs font-bold tracking-wider text-ink-muted uppercase">{{ $t("inactive") }}</h3>
                    <span class="block text-3xl font-bold text-ink-muted">{{ inactiveNum }}</span>
                </div>
            </div>
        </div>

        <!-- Docker Run -->
        <div class="card p-5">
            <h2 class="mb-3">{{ $t("Docker Run") }}</h2>
            <div class="mb-3">
                <textarea
                    id="name"
                    v-model="dockerRunCommand"
                    class="field min-h-[148px] resize-y font-mono"
                    required
                    :aria-label="$t('Docker Run')"
                    placeholder="docker run ..."
                ></textarea>
            </div>

            <button class="button button-primary" @click="convertDockerRun">{{ $t("Convert to Compose") }}</button>
        </div>
    </PageContainer>
</template>

<script>
import { statusNameShort } from "../../../shared/utils";
import PageContainer from "../components/PageContainer.vue";
import PageHeader from "../components/PageHeader.vue";

export default {
    components: {
        PageContainer,
        PageHeader,
    },

    data() {
        return {
            dockerRunCommand: "",
        };
    },

    computed: {
        activeNum() {
            return this.getStatusNum("active");
        },
        inactiveNum() {
            return this.getStatusNum("inactive");
        },
        exitedNum() {
            return this.getStatusNum("exited");
        },
    },

    methods: {

        getStatusNum(statusName) {
            let num = 0;

            for (let stackName in this.$root.completeStackList) {
                const stack = this.$root.completeStackList[stackName];
                if (statusNameShort(stack.status) === statusName) {
                    num += 1;
                }
            }
            return num;
        },

        async convertDockerRun() {
            if (this.dockerRunCommand.trim() === "docker run") {
                throw new Error("Please enter a docker run command");
            }

            this.$root.getSocket().emit("composerize", this.dockerRunCommand, (res) => {
                if (res.ok) {
                    this.$root.composeTemplate = res.composeTemplate;
                    this.$router.push("/compose");
                } else {
                    this.$root.toastError(res.msg ?? "Conversion failed");
                }
            });
        },
    }
};
</script>
