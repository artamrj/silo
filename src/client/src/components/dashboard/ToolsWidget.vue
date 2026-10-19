<template>
    <div class="flex h-full min-h-0 flex-col gap-2">
        <textarea
            v-model="dockerRunCommand"
            class="field min-h-0 flex-1 resize-none font-mono text-xs"
            required
            :aria-label="$t('Docker Run')"
            placeholder="docker run ..."
        ></textarea>

        <button class="button button-primary button-sm self-start" @click="convertDockerRun">
            {{ $t("Convert to Compose") }}
        </button>
    </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useSocket } from "../../composables/useSocket";
import { useToast } from "../../composables/useToast";
import type { SocketResult } from "../../../../shared/socket-events";

const { getSocket, composeTemplate } = useSocket();
const { toastError } = useToast();
const router = useRouter();

const dockerRunCommand = ref("");

/** Convert the pasted `docker run` command and jump to the Compose editor. */
function convertDockerRun() : void {
    if (dockerRunCommand.value.trim() === "" || dockerRunCommand.value.trim() === "docker run") {
        toastError("Please enter a docker run command");
        return;
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
