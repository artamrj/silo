<template>
    <transition name="slide-fade" appear>
        <div>
            <h1 v-if="isAdd" class="mb-3">{{ $t("compose") }}</h1>
            <h1 v-else class="mb-3 flex items-center gap-2">
                <Uptime :stack="globalStack" /> {{ stack.name }}
            </h1>

            <div v-if="stack.isManagedBySilo" class="stack-toolbar mb-3">
                <div class="flex flex-wrap items-center gap-2">
                    <button v-if="isEditMode" class="button button-primary" :disabled="processing" @click="deployStack">
                        <app-icon icon="rocket" />
                        {{ $t("deployStack") }}
                    </button>

                    <button v-if="isEditMode" class="button button-normal" :disabled="processing" @click="saveStack">
                        <app-icon icon="save" />
                        {{ $t("saveStackDraft") }}
                    </button>

                    <button v-if="!isEditMode" class="button button-secondary" :disabled="processing" @click="enableEditMode">
                        <app-icon icon="pen" />
                        {{ $t("editStack") }}
                    </button>

                    <button v-if="!isEditMode && !active" class="button button-primary" :disabled="processing" @click="startStack">
                        <app-icon icon="play" />
                        {{ $t("startStack") }}
                    </button>

                    <button v-if="!isEditMode && active" class="button button-normal" :disabled="processing" @click="restartStack">
                        <app-icon icon="rotate" />
                        {{ $t("restartStack") }}
                    </button>

                    <button v-if="!isEditMode" class="button button-normal" :disabled="processing" @click="updateStack">
                        <app-icon icon="cloud-arrow-down" />
                        {{ $t("updateStack") }}
                    </button>

                    <button v-if="!isEditMode && active" class="button button-normal" :disabled="processing" @click="stopStack">
                        <app-icon icon="stop" />
                        {{ $t("stopStack") }}
                    </button>

                    <details class="relative">
                        <summary class="button button-normal list-none [&::-webkit-details-marker]:hidden" :aria-label="$t('More stack actions')">•••</summary>
                        <div class="menu absolute top-[calc(100%+8px)] right-0 z-20">
                            <button class="menu-item" type="button" @click="downStack">
                                <app-icon icon="stop" />
                                {{ $t("downStack") }}
                            </button>
                        </div>
                    </details>

                    <button v-if="isEditMode && !isAdd" class="button button-normal" :disabled="processing" @click="discardStack">{{ $t("discardStack") }}</button>
                    <button v-if="!isEditMode" class="button button-danger" :disabled="processing" @click="openDeleteDialog">
                        <app-icon icon="trash" />
                        {{ $t("deleteStack") }}
                    </button>
                </div>
            </div>

            <!-- URLs -->
            <div v-if="urls.length > 0" class="mb-3 flex flex-wrap gap-2">
                <a v-for="(urlItem, index) in urls" :key="index" target="_blank" :href="urlItem.url" class="no-underline">
                    <span class="pill bg-slate-500 text-white">{{ urlItem.display }}</span>
                </a>
            </div>

            <!-- Progress Terminal -->
            <transition name="slide-fade" appear>
                <Terminal
                    v-show="showProgressTerminal"
                    ref="progressTerminal"
                    class="mb-3 h-[200px]"
                    :name="terminalName"
                    :rows="progressTerminalRows"
                    @has-data="showProgressTerminal = true; submitted = true;"
                ></Terminal>
            </transition>

            <div v-if="loadingStack" class="grid grid-cols-1 items-start gap-6 lg:grid-cols-2" aria-busy="true">
                <div class="min-w-0">
                    <div class="skeleton mb-3 h-6 w-40" />
                    <div v-for="n in 3" :key="n" class="skeleton mb-3 h-24 w-full" />
                </div>
                <div class="min-w-0">
                    <div class="skeleton mb-3 h-6 w-40" />
                    <div class="skeleton h-[315px] w-full" />
                </div>
            </div>

            <div v-else-if="stack.isManagedBySilo" class="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
                <div class="min-w-0">
                    <!-- General -->
                    <div v-if="isAdd">
                        <h4 class="mb-3">{{ $t("general") }}</h4>
                        <div class="card mb-3">
                            <!-- Stack Name -->
                            <div>
                                <label for="name" class="field-label">{{ $t("stackName") }}</label>
                                <input id="name" v-model="stack.name" type="text" class="field" required @blur="stackNameToLowercase">
                                <div class="field-hint">{{ $t("Lowercase only") }}</div>
                            </div>
                        </div>
                    </div>

                    <!-- Containers -->
                    <h4 class="mb-3">{{ $t("container", 2) }}</h4>

                    <div v-if="isEditMode" class="mb-3 flex items-stretch gap-2">
                        <input
                            v-model="newContainerName"
                            :placeholder="$t(`New Container Name...`)"
                            class="field"
                            @keyup.enter="addContainer"
                        />
                        <button class="button button-primary" @click="addContainer">
                            {{ $t("addContainer") }}
                        </button>
                    </div>

                    <div ref="containerList" class="flex flex-col gap-3">
                        <Container
                            v-for="(service, name) in jsonConfig.services"
                            :key="name"
                            :name="name"
                            :is-edit-mode="isEditMode"
                            :first="name === Object.keys(jsonConfig.services)[0]"
                            :serviceStatus="serviceStatusList[name]"
                            :dockerStats="dockerStats"
                            @start-service="startService"
                            @stop-service="stopService"
                            @restart-service="restartService"
                        />
                    </div>

                    <!-- General -->
                    <div v-if="isEditMode">
                        <h4 class="mt-4 mb-3">{{ $t("extra") }}</h4>
                        <div class="card mb-3">
                            <!-- URLs -->
                            <div>
                                <label class="field-label">
                                    {{ $t("url", 2) }}
                                </label>
                                <ArrayInput name="urls" :display-name="$t('url')" placeholder="https://" object-type="x-silo" />
                            </div>
                        </div>
                    </div>

                    <!-- Combined Terminal Output -->
                    <div v-show="!isEditMode">
                        <h4 class="mb-3">{{ $t("terminal") }}</h4>
                        <Terminal
                            ref="combinedTerminal"
                            class="mb-3 h-[315px]"
                            :name="combinedTerminalName"
                            :rows="combinedTerminalRows"
                            :cols="combinedTerminalCols"
                        ></Terminal>
                    </div>
                </div>

                <div class="min-w-0">
                    <h4 class="mb-3">{{ stack.composeFileName }}</h4>

                    <!-- YAML editor -->
                    <div class="editor mb-3">
                        <code-mirror
                            ref="editor"
                            v-model="stack.composeYAML"
                            :extensions="extensions"
                            minimal
                            wrap="true"
                            dark="true"
                            tab="true"
                            :disabled="!isEditMode"
                            :hasFocus="editorFocus"
                            @change="yamlCodeChange"
                        />
                    </div>
                    <div v-if="isEditMode" class="mb-3 text-sm text-danger">
                        {{ yamlError }}
                    </div>

                    <!-- ENV editor -->
                    <div v-if="isEditMode">
                        <h4 class="mb-3">.env</h4>
                        <div class="editor mb-3">
                            <code-mirror
                                ref="envEditor"
                                v-model="stack.composeENV"
                                :extensions="extensionsEnv"
                                minimal
                                wrap="true"
                                dark="true"
                                tab="true"
                                :disabled="!isEditMode"
                                :hasFocus="editorFocus"
                                @change="yamlCodeChange"
                            />
                        </div>
                    </div>

                    <div v-if="isEditMode">
                        <!-- Networks -->
                        <h4 class="mb-3">{{ $t("network", 2) }}</h4>
                        <div class="card mb-3">
                            <NetworkInput />
                        </div>
                    </div>
                </div>
            </div>

            <div v-if="!stack.isManagedBySilo && !processing" class="text-sm text-ink-muted">
                {{ $t("stackNotManagedBySiloMsg") }}
            </div>

            <!-- Delete Dialog -->
            <Dialog v-model:open="showDeleteDialog">
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{{ $t("deleteStack") }}</DialogTitle>
                    </DialogHeader>

                    <div class="space-y-4 text-sm">
                        <DialogDescription as="p" class="text-foreground">
                            {{ $t("deleteStackMsg") }}
                        </DialogDescription>
                        <div class="space-y-2">
                            <Label for="delete-confirmation" class="text-sm font-medium">
                                {{ $t("deleteStackConfirmation", { confirmation: deleteConfirmationText }) }}
                            </Label>
                            <Input
                                id="delete-confirmation"
                                v-model="deleteConfirmation"
                                :placeholder="deleteConfirmationText"
                                autocomplete="off"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" @click="showDeleteDialog = false">{{ $t("cancel") }}</Button>
                        <Button
                            variant="destructive"
                            :disabled="deleteConfirmation !== deleteConfirmationText || processing"
                            @click="deleteDialog"
                        >
                            {{ $t("deleteStack") }}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    </transition>
</template>

<script>
import CodeMirror from "vue-codemirror6";
import { yaml } from "@codemirror/lang-yaml";
import { python } from "@codemirror/lang-python";
import { lineNumbers, EditorView } from "@codemirror/view";
import { parseDocument, Document } from "yaml";

import { AppIcon } from "../icon";
import {
    COMBINED_TERMINAL_COLS,
    COMBINED_TERMINAL_ROWS,
    getCombinedTerminalName,
    getComposeTerminalName,
    PROGRESS_TERMINAL_ROWS,
    RUNNING
} from "../../../shared/utils";
import { copyYAMLComments, envsubstYAML } from "../../../shared/yaml";
import NetworkInput from "../components/NetworkInput.vue";
import ArrayInput from "../components/ArrayInput.vue";
import Container from "../components/Container.vue";
import Terminal from "../components/Terminal.vue";
import Uptime from "../components/Uptime.vue";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import dotenv from "dotenv";
import { ref } from "vue";
import { composeContextKey } from "../context";

const template = `
services:
  nginx:
    image: nginx:latest
    restart: unless-stopped
    ports:
      - "8080:80"
`;
const envDefault = "# VARIABLE=value #comment";

let yamlErrorTimeout = null;

let serviceStatusTimeout = null;
let dockerStatsTimeout = null;

export default {
    components: {
        ArrayInput,
        Container,
        NetworkInput,
        AppIcon,
        Button,
        CodeMirror,
        Dialog,
        DialogContent,
        DialogDescription,
        DialogFooter,
        DialogHeader,
        DialogTitle,
        Input,
        Label,
        Terminal,
        Uptime,
    },
    provide() {
        return {
            [composeContextKey]: {
                getStack: () => this.stack,
                getJsonConfig: () => this.jsonConfig,
                getEnvsubstJSONConfig: () => this.envsubstJSONConfig,
                isEditorFocused: () => this.editorFocus,
            },
        };
    },
    beforeRouteUpdate(to, from, next) {
        this.exitConfirm(next);
    },
    beforeRouteLeave(to, from, next) {
        this.exitConfirm(next);
    },
    setup() {
        const editorFocus = ref(false);

        const focusEffectHandler = (state, focusing) => {
            editorFocus.value = focusing;
            return null;
        };

        const extensions = [
            yaml(),
            lineNumbers(),
            EditorView.focusChangeEffect.of(focusEffectHandler)
        ];

        const extensionsEnv = [
            python(),
            lineNumbers(),
            EditorView.focusChangeEffect.of(focusEffectHandler)
        ];

        return { extensions,
            extensionsEnv,
            editorFocus };
    },
    yamlDoc: null,  // For keeping the yaml comments
    data() {
        return {
            jsonConfig: {},
            envsubstJSONConfig: {},
            yamlError: "",
            processing: true,
            showProgressTerminal: false,
            progressTerminalRows: PROGRESS_TERMINAL_ROWS,
            combinedTerminalRows: COMBINED_TERMINAL_ROWS,
            combinedTerminalCols: COMBINED_TERMINAL_COLS,
            stack: {

            },
            serviceStatusList: {},
            dockerStats: {},
            isEditMode: false,
            submitted: false,
            stackLoaded: false,
            showDeleteDialog: false,
            deleteConfirmation: "",
            newContainerName: "",
            stopServiceStatusTimeout: false,
            stopDockerStatsTimeout: false,
        };
    },
    computed: {

        urls() {
            if (!this.envsubstJSONConfig["x-silo"] || !this.envsubstJSONConfig["x-silo"].urls || !Array.isArray(this.envsubstJSONConfig["x-silo"].urls)) {
                return [];
            }

            let urls = [];
            for (const url of this.envsubstJSONConfig["x-silo"].urls) {
                let display;
                try {
                    let obj = new URL(url);
                    let pathname = obj.pathname;
                    if (pathname === "/") {
                        pathname = "";
                    }
                    display = obj.host + pathname + obj.search;
                } catch (e) {
                    display = url;
                }

                urls.push({
                    display,
                    url,
                });
            }
            return urls;
        },

        isAdd() {
            return this.$route.path === "/compose" && !this.submitted;
        },

        /** True while an existing stack is still being fetched. */
        loadingStack() {
            return !this.isAdd && !this.stackLoaded;
        },

        /**
         * Get the stack from the global stack list, because it may contain more real-time data like status
         * @return {*}
         */
        globalStack() {
            return this.$root.completeStackList[this.stack.name];
        },

        status() {
            return this.globalStack?.status;
        },

        active() {
            return this.status === RUNNING;
        },

        terminalName() {
            if (!this.stack.name) {
                return "";
            }
            return getComposeTerminalName(this.stack.name);
        },

        combinedTerminalName() {
            if (!this.stack.name) {
                return "";
            }
            return getCombinedTerminalName(this.stack.name);
        },

        networks() {
            return this.jsonConfig.networks;
        },

        url() {
            return `/compose/${this.stack.name}`;
        },

        deleteConfirmationText() {
            return `DELETE ${this.stack.name}`;
        },
    },
    watch: {
        "stack.composeYAML": {
            handler() {
                if (this.editorFocus) {
                    console.debug("yaml code changed");
                    this.yamlCodeChange();
                }
            },
            deep: true,
        },

        "stack.composeENV": {
            handler() {
                if (this.editorFocus) {
                    console.debug("env code changed");
                    this.yamlCodeChange();
                }
            },
            deep: true,
        },

        jsonConfig: {
            handler() {
                if (!this.editorFocus) {
                    console.debug("jsonConfig changed");

                    let doc = new Document(this.jsonConfig);

                    // Stick back the yaml comments
                    if (this.yamlDoc) {
                        copyYAMLComments(doc, this.yamlDoc);
                    }

                    this.stack.composeYAML = doc.toString();
                    this.yamlDoc = doc;
                }
            },
            deep: true,
        },

        showDeleteDialog(value) {
            if (!value) {
                this.deleteConfirmation = "";
            }
        },
    },
    mounted() {
        if (this.isAdd) {
            this.processing = false;
            this.isEditMode = true;

            let composeYAML;
            let composeENV;

            if (this.$root.composeTemplate) {
                composeYAML = this.$root.composeTemplate;
                this.$root.composeTemplate = "";
            } else {
                composeYAML = template;
            }
            if (this.$root.envTemplate) {
                composeENV = this.$root.envTemplate;
                this.$root.envTemplate = "";
            } else {
                composeENV = envDefault;
            }

            // Default Values
            this.stack = {
                name: "",
                composeYAML,
                composeENV,
                isManagedBySilo: true,
            };
            this.stackLoaded = true;

            this.yamlCodeChange();

        } else {
            this.stack.name = this.$route.params.stackName;
            this.loadStack();
        }

        this.requestServiceStatus();
        this.requestDockerStats();
    },
    unmounted() {
        clearTimeout(serviceStatusTimeout);
        clearTimeout(dockerStatsTimeout);
    },
    methods: {
        startServiceStatusTimeout() {
            clearTimeout(serviceStatusTimeout);
            serviceStatusTimeout = setTimeout(async () => {
                this.requestServiceStatus();
            }, 5000);
        },

        startDockerStatsTimeout() {
            clearTimeout(dockerStatsTimeout);
            dockerStatsTimeout = setTimeout(async () => {
                this.requestDockerStats();
            }, 5000);
        },

        requestServiceStatus() {
            // Do not request if it is add mode
            if (this.isAdd) {
                return;
            }

            this.$root.emitServer("serviceStatusList", this.stack.name, (res) => {
                if (res.ok) {
                    this.serviceStatusList = res.serviceStatusList;
                }
                if (!this.stopServiceStatusTimeout) {
                    this.startServiceStatusTimeout();
                }
            });
        },

        requestDockerStats() {
            this.$root.emitServer("dockerStats", (res) => {
                if (res.ok) {
                    this.dockerStats = res.dockerStats;
                }
                if (!this.stopDockerStatsTimeout) {
                    this.startDockerStatsTimeout();
                }
            });
        },

        exitConfirm(next) {
            if (this.isEditMode) {
                if (confirm(this.$t("confirmLeaveStack"))) {
                    this.exitAction();
                    next();
                } else {
                    next(false);
                }
            } else {
                this.exitAction();
                next();
            }
        },

        exitAction() {
            console.log("exitAction");
            this.stopServiceStatusTimeout = true;
            this.stopDockerStatsTimeout = true;
            clearTimeout(serviceStatusTimeout);
            clearTimeout(dockerStatsTimeout);

            // Leave Combined Terminal
            console.debug("leaveCombinedTerminal", this.stack.name);
            this.$root.emitServer("leaveCombinedTerminal", this.stack.name, () => {});
        },

        bindTerminal() {
            this.$refs.progressTerminal?.bind?.(this.terminalName);
        },

        loadStack() {
            this.processing = true;
            this.$root.emitServer("getStack", this.stack.name, (res) => {
                if (res.ok) {
                    this.stack = res.stack;
                    this.yamlCodeChange();
                    this.processing = false;
                    this.stackLoaded = true;
                    this.bindTerminal();
                } else {
                    this.$root.toastRes(res);
                }
            });
        },

        deployStack() {
            this.processing = true;

            if (!this.jsonConfig.services) {
                this.$root.toastError("No services found in compose.yaml");
                this.processing = false;
                return;
            }

            // Check if services is object
            if (typeof this.jsonConfig.services !== "object") {
                this.$root.toastError("Services must be an object");
                this.processing = false;
                return;
            }

            let serviceNameList = Object.keys(this.jsonConfig.services);

            // Set the stack name if empty, use the first container name
            if (!this.stack.name && serviceNameList.length > 0) {
                let serviceName = serviceNameList[0];
                let service = this.jsonConfig.services[serviceName];

                if (service && service.container_name) {
                    this.stack.name = service.container_name;
                } else {
                    this.stack.name = serviceName;
                }
            }

            this.bindTerminal();

            this.$root.emitServer("deployStack", this.stack.name, this.stack.composeYAML, this.stack.composeENV, this.isAdd, (res) => {
                this.processing = false;
                this.$root.toastRes(res);

                if (res.ok) {
                    this.isEditMode = false;
                    this.$router.push(this.url);
                }
            });
        },

        saveStack() {
            this.processing = true;

            this.$root.emitServer("saveStack", this.stack.name, this.stack.composeYAML, this.stack.composeENV, this.isAdd, (res) => {
                this.processing = false;
                this.$root.toastRes(res);

                if (res.ok) {
                    this.isEditMode = false;
                    this.$router.push(this.url);
                }
            });
        },

        startStack() {
            this.processing = true;

            this.$root.emitServer("startStack", this.stack.name, (res) => {
                this.processing = false;
                this.$root.toastRes(res);
            });
        },

        stopStack() {
            this.processing = true;

            this.$root.emitServer("stopStack", this.stack.name, (res) => {
                this.processing = false;
                this.$root.toastRes(res);
            });
        },

        downStack() {
            this.processing = true;

            this.$root.emitServer("downStack", this.stack.name, (res) => {
                this.processing = false;
                this.$root.toastRes(res);
            });
        },

        restartStack() {
            this.processing = true;

            this.$root.emitServer("restartStack", this.stack.name, (res) => {
                this.processing = false;
                this.$root.toastRes(res);
            });
        },

        updateStack() {
            this.processing = true;

            this.$root.emitServer("updateStack", this.stack.name, (res) => {
                this.processing = false;
                this.$root.toastRes(res);
            });
        },

        openDeleteDialog() {
            this.deleteConfirmation = "";
            this.showDeleteDialog = true;
        },

        /**
         * Delete the stack after confirming the typed stack name.
         * @returns {void}
         */
        deleteDialog() {
            this.processing = true;
            this.$root.emitServer("deleteStack", this.stack.name, {
                deleteData: true,
                confirmation: this.deleteConfirmation,
            }, (res) => {
                this.processing = false;
                this.$root.toastRes(res);
                if (res.ok) {
                    this.showDeleteDialog = false;
                    this.$router.push("/");
                }
            });
        },

        discardStack() {
            this.stackLoaded = false;
            this.loadStack();
            this.isEditMode = false;
        },

        yamlToJSON(yaml) {
            let doc = parseDocument(yaml);
            if (doc.errors.length > 0) {
                throw doc.errors[0];
            }

            const config = doc.toJS() ?? {};

            // Check data types
            // "services" must be an object
            if (!config.services) {
                config.services = {};
            }

            if (Array.isArray(config.services) || typeof config.services !== "object") {
                throw new Error("Services must be an object");
            }

            return {
                config,
                doc,
            };
        },

        yamlCodeChange() {
            try {
                let { config, doc } = this.yamlToJSON(this.stack.composeYAML);

                this.yamlDoc = doc;
                this.jsonConfig = config;

                let env = dotenv.parse(this.stack.composeENV);
                let envYAML = envsubstYAML(this.stack.composeYAML, env);
                this.envsubstJSONConfig = this.yamlToJSON(envYAML).config;

                clearTimeout(yamlErrorTimeout);
                this.yamlError = "";
            } catch (e) {
                clearTimeout(yamlErrorTimeout);

                if (this.yamlError) {
                    this.yamlError = e.message;

                } else {
                    yamlErrorTimeout = setTimeout(() => {
                        this.yamlError = e.message;
                    }, 3000);
                }
            }
        },

        enableEditMode() {
            this.isEditMode = true;
        },

        addContainer() {
            if (this.jsonConfig.services[this.newContainerName]) {
                this.$root.toastError("Container name already exists");
                return;
            }

            if (!this.newContainerName) {
                this.$root.toastError("Container name cannot be empty");
                return;
            }

            this.jsonConfig.services[this.newContainerName] = {
                restart: "unless-stopped",
            };
            this.newContainerName = "";
            let element = this.$refs.containerList.lastElementChild;
            element.scrollIntoView({
                block: "start",
                behavior: "smooth"
            });
        },

        stackNameToLowercase() {
            this.stack.name = this.stack?.name?.toLowerCase();
        },

        startService(serviceName) {
            this.processing = true;

            this.$root.emitServer("startService", this.stack.name, serviceName, (res) => {
                this.processing = false;
                this.$root.toastRes(res);

                if (res.ok) {
                    this.requestServiceStatus(); // Refresh service status
                }
            });
        },

        stopService(serviceName) {
            this.processing = true;

            this.$root.emitServer("stopService", this.stack.name, serviceName, (res) => {
                this.processing = false;
                this.$root.toastRes(res);

                if (res.ok) {
                    this.requestServiceStatus(); // Refresh service status
                }
            });
        },

        restartService(serviceName) {
            this.processing = true;

            this.$root.emitServer("restartService", this.stack.name, serviceName, (res) => {
                this.processing = false;
                this.$root.toastRes(res);

                if (res.ok) {
                    this.requestServiceStatus(); // Refresh service status
                }
            });
        },
    }
};
</script>
