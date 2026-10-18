<template>
    <div class="card mb-3">
        <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="min-w-0">
                <h4 class="mb-1">{{ name }}</h4>
                <div class="mb-2 text-xs text-ink-muted">
                    <span class="mr-1">{{ imageName }}:</span><span class="text-ink">{{ imageTag }}</span>
                </div>
                <div v-if="!isEditMode" class="flex flex-wrap items-center gap-1">
                    <span class="pill" :class="bgStyle" :aria-busy="pending">{{ status }}</span>

                    <a
                        v-for="port in envsubstService.ports"
                        :key="port"
                        :href="parsePort(port).url"
                        target="_blank"
                        class="no-underline"
                    >
                        <span class="pill bg-slate-500 text-white">{{ parsePort(port).display }}</span>
                    </a>
                </div>
            </div>
            <div v-if="!isEditMode" class="flex flex-wrap items-center justify-end gap-2">
                <router-link
                    v-if="isActive"
                    class="button button-normal"
                    :to="terminalRouteLink"
                >
                    <app-icon icon="terminal" />
                    Bash
                </router-link>
                <button
                    v-if="serviceCount > 1 && !isActive && !pending"
                    class="button button-primary"
                    :disabled="pending"
                    @click="startService"
                >
                    <app-icon icon="play" />
                    {{ $t("startStack") }}
                </button>
                <button
                    v-if="serviceCount > 1 && (isActive || status === 'unhealthy')"
                    class="button button-normal"
                    :disabled="pending"
                    @click="restartService"
                >
                    <app-icon icon="rotate" />
                    {{ $t("restartStack") }}
                </button>
                <button
                    v-if="serviceCount > 1 && (isActive || status === 'unhealthy')"
                    class="button button-normal"
                    :disabled="pending"
                    @click="stopService"
                >
                    <app-icon icon="stop" />
                    {{ $t("stopStack") }}
                </button>
            </div>
        </div>

        <div v-if="isEditMode" class="mt-3 flex flex-wrap gap-2">
            <button class="button button-normal" @click="showConfig = !showConfig">
                <app-icon icon="edit" />
                {{ $t("Edit") }}
            </button>
            <button class="button button-danger" @click="remove">
                <app-icon icon="trash" />
                {{ $t("deleteContainer") }}
            </button>
        </div>
        <div v-else-if="statsInstances.length > 0" class="mt-3">
            <div class="flex items-center gap-3">
                <template v-if="!expandedStats">
                    <div class="text-xs text-ink-muted">
                        {{ $t('CPU') }}: {{ statsInstances[0].CPUPerc }}
                    </div>
                    <div class="text-xs text-ink-muted">
                        {{ $t('memoryAbbreviated') }}: {{ statsInstances[0].MemUsage }}
                    </div>
                </template>
                <div class="flex grow justify-end">
                    <button class="button button-sm button-normal" :aria-expanded="expandedStats" @click="expandedStats = !expandedStats">
                        <app-icon :icon="expandedStats ? 'chevron-up' : 'chevron-down'" />
                    </button>
                </div>
            </div>
            <transition name="slide-fade" appear>
                <div v-if="expandedStats" class="mt-2 flex flex-col gap-3">
                    <DockerStat
                        v-for="stat in statsInstances"
                        :key="stat.Name"
                        :stat="stat"
                    />
                </div>
            </transition>
        </div>

        <transition name="slide-fade" appear>
            <div v-if="isEditMode && showConfig" class="mt-4 flex flex-col gap-4">
                <!-- Image -->
                <div>
                    <label class="field-label">
                        {{ $t("dockerImage") }}
                    </label>
                    <input v-model="service.image" class="field" />
                </div>

                <!-- Ports -->
                <div>
                    <label class="field-label">
                        {{ $t("port", 2) }}
                    </label>
                    <ArrayInput name="ports" :display-name="$t('port')" placeholder="HOST:CONTAINER" />
                </div>

                <!-- Volumes -->
                <div>
                    <label class="field-label">
                        {{ $t("volume", 2) }}
                    </label>
                    <ArrayInput name="volumes" :display-name="$t('volume')" placeholder="HOST:CONTAINER" />
                </div>

                <!-- Restart Policy -->
                <div>
                    <label class="field-label">
                        {{ $t("restartPolicy") }}
                    </label>
                    <select v-model="service.restart" class="field">
                        <option value="always">{{ $t("restartPolicyAlways") }}</option>
                        <option value="unless-stopped">{{ $t("restartPolicyUnlessStopped") }}</option>
                        <option value="on-failure">{{ $t("restartPolicyOnFailure") }}</option>
                        <option value="no">{{ $t("restartPolicyNo") }}</option>
                    </select>
                </div>

                <!-- Environment Variables -->
                <div>
                    <label class="field-label">
                        {{ $t("environmentVariable", 2) }}
                    </label>
                    <ArrayInput name="environment" :display-name="$t('environmentVariable')" placeholder="KEY=VALUE" />
                </div>

                <!-- Network -->
                <div>
                    <label class="field-label">
                        {{ $t("network", 2) }}
                    </label>

                    <div v-if="networkList.length === 0 && service.networks && service.networks.length > 0" class="mb-3 text-sm text-warning">
                        {{ $t("NoNetworksAvailable") }}
                    </div>

                    <ArraySelect name="networks" :display-name="$t('network')" placeholder="Network Name" :options="networkList" />
                </div>

                <!-- Depends on -->
                <div>
                    <label class="field-label">
                        {{ $t("dependsOn") }}
                    </label>
                    <ArrayInput name="depends_on" :display-name="$t('dependsOn')" :placeholder="$t(`containerName`)" />
                </div>
            </div>
        </transition>
    </div>
</template>

<script setup lang="ts">
import { computed, inject, onUnmounted, provide, ref, watch } from "vue";
import { AppIcon } from "../icon";
import { parseDockerPort } from "../../../shared/utils";
import DockerStat from "./DockerStat.vue";
import ArrayInput from "./ArrayInput.vue";
import ArraySelect from "./ArraySelect.vue";
import { composeContextKey, serviceContextKey, type ComposeContext } from "../context";
import { useSocket } from "../composables/useSocket";
import type { DockerStatEntry, ServiceStatus } from "../composables/types";

/** Untyped YAML object as exposed by the compose context. */
type ComposeObject = ReturnType<ComposeContext["getJsonConfig"]>;

const props = withDefaults(defineProps<{
    name : string;
    isEditMode?: boolean;
    first?: boolean;
    serviceStatus?: ServiceStatus[] | null;
    dockerStats?: Record<string, DockerStatEntry> | null;
}>(), {
    isEditMode: false,
    first: false,
    serviceStatus: null,
    dockerStats: null,
});

const emit = defineEmits<{
    (event : "start-service" | "stop-service" | "restart-service", name : string) : void;
}>();

const composeContext = inject<ComposeContext | null>(composeContextKey, null);
const { info } = useSocket();

const showConfig = ref(false);
const expandedStats = ref(false);
const pending = ref(false);
let pendingTimeout : ReturnType<typeof setTimeout> | null = null;

/** Does this service currently look active? */
const isActive = computed(() => status.value === "running" || status.value === "healthy");

const networkList = computed(() => {
    const list : string[] = [];
    for (const networkName in jsonObject.value.networks) {
        list.push(networkName);
    }
    return list;
});

const bgStyle = computed(() => {
    if (isActive.value) {
        return "bg-primary-fill text-primary-foreground";
    } else if (status.value === "unhealthy") {
        return "bg-danger-fill text-white";
    } else if (pending.value) {
        return "bg-slate-400 text-white";
    } else {
        return "bg-slate-500 text-white";
    }
});

const terminalRouteLink = computed(() => ({
    name: "containerTerminal",
    params: {
        stackName: stackName.value,
        serviceName: props.name,
        type: "bash",
    },
}));

const stack = computed(() => composeContext?.getStack() ?? {});

const stackName = computed(() => stack.value.name);

const service = computed<ComposeObject>(() => {
    if (!jsonObject.value.services[props.name]) {
        return {};
    }
    return jsonObject.value.services[props.name];
});

const serviceCount = computed(() => Object.keys(jsonObject.value.services).length);

const jsonObject = computed(() => composeContext?.getJsonConfig() ?? {});

const envsubstJSONConfig = computed(() => composeContext?.getEnvsubstJSONConfig() ?? {});

const envsubstService = computed<ComposeObject>(() => {
    if (!envsubstJSONConfig.value.services || !envsubstJSONConfig.value.services[props.name]) {
        return {};
    }
    return envsubstJSONConfig.value.services[props.name];
});

const imageName = computed(() => {
    if (envsubstService.value.image) {
        return (envsubstService.value.image as string).split(":")[0];
    } else {
        return "";
    }
});

const imageTag = computed(() => {
    if (envsubstService.value.image) {
        const tag = (envsubstService.value.image as string).split(":")[1];

        if (tag) {
            return tag;
        } else {
            return "latest";
        }
    } else {
        return "";
    }
});

const statsInstances = computed(() => {
    if (!props.serviceStatus) {
        return [];
    }

    return props.serviceStatus
        .map(s => props.dockerStats?.[s.name])
        .filter((s) : s is DockerStatEntry => !!s)
        .sort((a, b) => a.Name.localeCompare(b.Name));
});

const status = computed(() => {
    if (!props.serviceStatus) {
        return "N/A";
    }
    return props.serviceStatus[0].status;
});

// Expose the live service object so nested array editors edit compose.yaml.
provide(serviceContextKey, {
    getService: () => service.value,
});

// The parent pushes new status once the action finishes.
watch(status, () => {
    if (pendingTimeout) {
        clearTimeout(pendingTimeout);
    }
    pending.value = false;
});

onUnmounted(() => {
    if (pendingTimeout) {
        clearTimeout(pendingTimeout);
    }
});

function parsePort(port : string) {
    const hostname = info.value.primaryHostname || location.hostname;
    return parseDockerPort(port, hostname);
}

function remove() : void {
    delete jsonObject.value.services[props.name];
}

/**
 * Send a service action and optimistically mark the pill as busy until
 * the parent delivers a refreshed status.
 * @param event Event to emit
 * @returns {void}
 */
function runServiceAction(event : "start-service" | "stop-service" | "restart-service") : void {
    if (pending.value) {
        return;
    }
    pending.value = true;
    pendingTimeout = setTimeout(() => {
        pending.value = false;
    }, 15000);
    emit(event, props.name);
}

function startService() : void {
    runServiceAction("start-service");
}
function stopService() : void {
    runServiceAction("stop-service");
}
function restartService() : void {
    runServiceAction("restart-service");
}
</script>
