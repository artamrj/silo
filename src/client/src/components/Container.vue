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

<script>
import { defineComponent } from "vue";
import { AppIcon } from "../icon";
import { parseDockerPort } from "../../../shared/utils";
import DockerStat from "./DockerStat.vue";
import ArrayInput from "./ArrayInput.vue";
import ArraySelect from "./ArraySelect.vue";
import { composeContextKey, serviceContextKey } from "../context";

export default defineComponent({
    components: {
        AppIcon,
        DockerStat,
        ArrayInput,
        ArraySelect,
    },
    inject: {
        composeContext: {
            from: composeContextKey,
            default: null,
        },
    },
    provide() {
        return {
            [serviceContextKey]: {
                getService: () => this.service,
            },
        };
    },
    props: {
        name: {
            type: String,
            required: true,
        },
        isEditMode: {
            type: Boolean,
            default: false,
        },
        first: {
            type: Boolean,
            default: false,
        },
        serviceStatus: {
            type: Object,
            default: null,
        },
        dockerStats: {
            type: Object,
            default: null
        }
    },
    emits: [
        "start-service",
        "stop-service",
        "restart-service"
    ],
    data() {
        return {
            showConfig: false,
            expandedStats: false,
            pending: false,
            pendingTimeout: null,
        };
    },
    computed: {

        /** Does this service currently look active? */
        isActive() {
            return this.status === "running" || this.status === "healthy";
        },

        networkList() {
            let list = [];
            for (const networkName in this.jsonObject.networks) {
                list.push(networkName);
            }
            return list;
        },

        bgStyle() {
            if (this.isActive) {
                return "bg-primary-fill text-white";
            } else if (this.status === "unhealthy") {
                return "bg-danger-fill text-white";
            } else if (this.pending) {
                return "bg-slate-400 text-white";
            } else {
                return "bg-slate-500 text-white";
            }
        },

        terminalRouteLink() {
            return {
                name: "containerTerminal",
                params: {
                    stackName: this.stackName,
                    serviceName: this.name,
                    type: "bash",
                },
            };
        },

        stack() {
            return this.composeContext?.getStack() ?? {};
        },

        stackName() {
            return this.stack.name;
        },

        service() {
            if (!this.jsonObject.services[this.name]) {
                return {};
            }
            return this.jsonObject.services[this.name];
        },

        serviceCount() {
            return Object.keys(this.jsonObject.services).length;
        },

        jsonObject() {
            return this.composeContext?.getJsonConfig() ?? {};
        },

        envsubstJSONConfig() {
            return this.composeContext?.getEnvsubstJSONConfig() ?? {};
        },

        envsubstService() {
            if (!this.envsubstJSONConfig.services || !this.envsubstJSONConfig.services[this.name]) {
                return {};
            }
            return this.envsubstJSONConfig.services[this.name];
        },

        imageName() {
            if (this.envsubstService.image) {
                return this.envsubstService.image.split(":")[0];
            } else {
                return "";
            }
        },

        imageTag() {
            if (this.envsubstService.image) {
                let tag = this.envsubstService.image.split(":")[1];

                if (tag) {
                    return tag;
                } else {
                    return "latest";
                }
            } else {
                return "";
            }
        },
        statsInstances() {
            if (!this.serviceStatus) {
                return [];
            }

            return this.serviceStatus
                .map(s => this.dockerStats[s.name])
                .filter(s => !!s)
                .sort((a, b) => a.Name.localeCompare(b.Name));
        },
        status() {
            if (!this.serviceStatus) {
                return "N/A";
            }
            return this.serviceStatus[0].status;
        }
    },
    watch: {
        // The parent pushes new status once the action finishes.
        status() {
            clearTimeout(this.pendingTimeout);
            this.pending = false;
        },
    },
    unmounted() {
        clearTimeout(this.pendingTimeout);
    },
    methods: {
        parsePort(port) {
            let hostname = this.$root.info.primaryHostname || location.hostname;
            return parseDockerPort(port, hostname);
        },
        remove() {
            delete this.jsonObject.services[this.name];
        },

        /**
         * Send a service action and optimistically mark the pill as busy until
         * the parent delivers a refreshed status.
         * @param {string} event Event to emit
         * @returns {void}
         */
        runServiceAction(event) {
            if (this.pending) {
                return;
            }
            this.pending = true;
            this.pendingTimeout = setTimeout(() => {
                this.pending = false;
            }, 15000);
            this.$emit(event, this.name);
        },

        startService() {
            this.runServiceAction("start-service");
        },
        stopService() {
            this.runServiceAction("stop-service");
        },
        restartService() {
            this.runServiceAction("restart-service");
        }

    },
});
</script>
