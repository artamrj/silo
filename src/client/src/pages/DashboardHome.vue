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

<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { statusNameShort } from "../../../shared/utils";
import PageContainer from "../components/PageContainer.vue";
import PageHeader from "../components/PageHeader.vue";
import { useSocket } from "../composables/useSocket";
import { useToast } from "../composables/useToast";
import type { SocketResult } from "../../../shared/socket-events";

const { completeStackList, getSocket, composeTemplate } = useSocket();
const { toastError } = useToast();
const router = useRouter();

const dockerRunCommand = ref("");

/** Count stacks whose short status matches `statusName`. */
function getStatusNum(statusName : string) : number {
    let num = 0;

    for (const stackName in completeStackList.value) {
        const stack = completeStackList.value[stackName];
        if (statusNameShort(stack.status) === statusName) {
            num += 1;
        }
    }
    return num;
}

const activeNum = computed(() => getStatusNum("active"));
const inactiveNum = computed(() => getStatusNum("inactive"));
const exitedNum = computed(() => getStatusNum("exited"));

async function convertDockerRun() : Promise<void> {
    if (dockerRunCommand.value.trim() === "docker run") {
        throw new Error("Please enter a docker run command");
    }

    getSocket().emit("composerize", dockerRunCommand.value, (res : SocketResult & { composeTemplate?: string }) => {
        if (res.ok) {
            composeTemplate.value = res.composeTemplate ?? "";
            router.push("/compose");
        } else {
            toastError(res.msg ?? "Conversion failed");
        }
    });
}
</script>
