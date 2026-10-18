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

<script>
import { AppIcon } from "../icon";
import { composeContextKey } from "../context";

export default {
    components: {
        AppIcon,
    },
    inject: {
        composeContext: {
            from: composeContextKey,
            default: null,
        },
    },
    data() {
        return {
            networkList: [],
            externalList: {},
            selectedExternalList: {},
            externalNetworkList: [],
        };
    },
    computed: {
        jsonConfig() {
            return this.composeContext?.getJsonConfig() ?? {};
        },

        stack() {
            return this.composeContext?.getStack() ?? {};
        },

        editorFocus() {
            return this.composeContext?.isEditorFocused() ?? false;
        },
    },
    watch: {
        "jsonConfig.networks": {
            handler() {
                if (this.editorFocus) {
                    console.debug("jsonConfig.networks changed");
                    this.loadNetworkList();
                }
            },
            deep: true,
        },

        "selectedExternalList": {
            handler() {
                for (const networkName in this.selectedExternalList) {
                    const enable = this.selectedExternalList[networkName];

                    if (enable) {
                        if (!this.externalList[networkName]) {
                            this.externalList[networkName] = {};
                        }
                        this.externalList[networkName].external = true;
                    } else {
                        delete this.externalList[networkName];
                    }
                }
                this.applyToYAML();
            },
            deep: true,
        },

        "networkList": {
            handler() {
                this.applyToYAML();
            },
            deep: true,
        }

    },
    mounted() {
        this.loadNetworkList();
        this.loadExternalNetworkList();
    },
    methods: {
        loadNetworkList() {
            this.networkList = [];
            this.externalList = {};

            for (const key in this.jsonConfig.networks) {
                let obj = {
                    key: key,
                    value: this.jsonConfig.networks[key],
                };

                if (obj.value && obj.value.external) {
                    this.externalList[key] = Object.assign({}, obj.value);
                } else {
                    this.networkList.push(obj);
                }
            }

            // Restore selectedExternalList
            this.selectedExternalList = {};
            for (const networkName in this.externalList) {
                this.selectedExternalList[networkName] = true;
            }
        },

        loadExternalNetworkList() {
            this.$root.emitServer("getDockerNetworkList", (res) => {
                if (res.ok) {
                    this.externalNetworkList = res.dockerNetworkList.filter((n) => {
                        // Filter out this stack networks
                        if (n.startsWith(this.stack.name + "_")) {
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
                    this.$root.toastRes(res);
                }
            });
        },

        addField() {
            this.networkList.push({
                key: "",
                value: {},
            });
        },

        remove(index) {
            this.networkList.splice(index, 1);
            this.applyToYAML();
        },

        applyToYAML() {
            if (this.editorFocus) {
                return;
            }

            this.jsonConfig.networks = {};

            // Internal networks
            for (const networkRow of this.networkList) {
                this.jsonConfig.networks[networkRow.key] = networkRow.value;
            }

            // External networks
            for (const networkName in this.externalList) {
                this.jsonConfig.networks[networkName] = this.externalList[networkName];
            }

            console.debug("applyToYAML", this.jsonConfig.networks);
        }

    },
};
</script>
