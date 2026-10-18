<template>
    <div>
        <h5>{{ $t("Internal Networks") }}</h5>
        <ul class="flex list-none flex-col gap-2 p-0">
            <li v-for="(networkRow, index) in networkList" :key="index" class="flex items-center gap-2">
                <input v-model="networkRow.key" type="text" class="field" :placeholder="$t(`Network name...`)" :aria-label="$t(`Network name...`)" />
                <button type="button" class="button button-sm button-danger" :aria-label="$t('delete')" @click="remove(index)">
                    <app-icon icon="times" />
                </button>
            </li>
        </ul>

        <button class="button button-normal button-sm mt-3" @click="addField">{{ $t("addInternalNetwork") }}</button>

        <h5 class="mt-4">{{ $t("External Networks") }}</h5>

        <div v-if="externalNetworkList.length === 0" class="text-sm text-ink-muted">
            {{ $t("No External Networks") }}
        </div>

        <div v-for="(networkName, index) in externalNetworkList" :key="networkName" class="mt-3 flex items-center gap-2">
            <input
                :id=" 'external-network' + index"
                v-model="selectedExternalList[networkName]"
                class="size-4 accent-primary"
                type="checkbox"
            >

            <label class="text-sm" :for=" 'external-network' + index">
                {{ networkName }}
            </label>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, inject, onMounted, ref, watch } from "vue";
import { AppIcon } from "../icon";
import { composeContextKey, type ComposeContext } from "../context";
import { useSocket } from "../composables/useSocket";
import { useToast } from "../composables/useToast";
import type { SocketResult } from "../../../shared/socket-events";

interface NetworkRow {
    key : string;
    value : Record<string, unknown>;
}

const composeContext = inject<ComposeContext | null>(composeContextKey, null);
const { emitServer } = useSocket();
const { toastRes } = useToast();

const networkList = ref<NetworkRow[]>([]);
const externalList = ref<Record<string, Record<string, unknown>>>({});
const selectedExternalList = ref<Record<string, boolean>>({});
const externalNetworkList = ref<string[]>([]);

const jsonConfig = computed(() => composeContext?.getJsonConfig() ?? {});

const stack = computed(() => composeContext?.getStack() ?? {});

const editorFocus = computed(() => composeContext?.isEditorFocused() ?? false);

watch(() => jsonConfig.value.networks, () => {
    if (editorFocus.value) {
        console.debug("jsonConfig.networks changed");
        loadNetworkList();
    }
}, { deep: true });

watch(selectedExternalList, () => {
    for (const networkName in selectedExternalList.value) {
        const enable = selectedExternalList.value[networkName];

        if (enable) {
            if (!externalList.value[networkName]) {
                externalList.value[networkName] = {};
            }
            externalList.value[networkName].external = true;
        } else {
            delete externalList.value[networkName];
        }
    }
    applyToYAML();
}, { deep: true });

watch(networkList, () => {
    applyToYAML();
}, { deep: true });

onMounted(() => {
    loadNetworkList();
    loadExternalNetworkList();
});

function loadNetworkList() : void {
    networkList.value = [];
    externalList.value = {};

    for (const key in jsonConfig.value.networks) {
        const obj = {
            key: key,
            value: jsonConfig.value.networks[key] as Record<string, unknown>,
        };

        if (obj.value && obj.value.external) {
            externalList.value[key] = Object.assign({}, obj.value);
        } else {
            networkList.value.push(obj);
        }
    }

    // Restore selectedExternalList
    selectedExternalList.value = {};
    for (const networkName in externalList.value) {
        selectedExternalList.value[networkName] = true;
    }
}

function loadExternalNetworkList() : void {
    emitServer("getDockerNetworkList", (res : SocketResult & { dockerNetworkList?: string[] }) => {
        if (res.ok) {
            externalNetworkList.value = (res.dockerNetworkList ?? []).filter((n) => {
                // Filter out this stack networks
                if (n.startsWith(stack.value.name + "_")) {
                    return false;
                }
                // They should be not supported.
                // https://docs.docker.com/compose/compose-file/06-networks/#host-or-none
                if (n === "none" || n === "host" || n === "bridge") {
                    return false;
                }
                return true;
            });
        } else {
            toastRes(res);
        }
    });
}

function addField() : void {
    networkList.value.push({
        key: "",
        value: {},
    });
}

function remove(index : number) : void {
    networkList.value.splice(index, 1);
    applyToYAML();
}

function applyToYAML() : void {
    if (editorFocus.value) {
        return;
    }

    jsonConfig.value.networks = {};

    // Internal networks
    for (const networkRow of networkList.value) {
        jsonConfig.value.networks[networkRow.key] = networkRow.value;
    }

    // External networks
    for (const networkName in externalList.value) {
        jsonConfig.value.networks[networkName] = externalList.value[networkName];
    }

    console.debug("applyToYAML", jsonConfig.value.networks);
}
</script>
