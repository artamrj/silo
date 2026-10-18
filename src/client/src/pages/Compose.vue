<template>
    <PageContainer wide fill>
        <PageHeader v-if="isAdd" :title="$t('compose')" :description="$t('composeDescription')" />
        <PageHeader v-else :title="stack.name">
            <template #before-title>
                <Uptime :stack="globalStack" />
            </template>
        </PageHeader>

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
                        :name="String(name)"
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
                        v-model="stack.composeYAML"
                        :extensions="extensions"
                        minimal
                        :wrap="true"
                        :dark="true"
                        :tab="true"
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
                            v-model="stack.composeENV"
                            :extensions="extensionsEnv"
                            minimal
                            :wrap="true"
                            :dark="true"
                            :tab="true"
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
    </PageContainer>
</template>

<script setup lang="ts">
import CodeMirror from "vue-codemirror6";
import { yaml } from "@codemirror/lang-yaml";
import { python } from "@codemirror/lang-python";
import { lineNumbers, EditorView } from "@codemirror/view";
import { parseDocument, Document } from "yaml";
import { computed, onMounted, onUnmounted, provide, ref, watch } from "vue";
import { onBeforeRouteLeave, onBeforeRouteUpdate, useRoute, useRouter } from "vue-router";
import type { NavigationGuardNext } from "vue-router";

import {
    COMBINED_TERMINAL_COLS,
    COMBINED_TERMINAL_ROWS,
    getCombinedTerminalName,
    getComposeTerminalName,
    PROGRESS_TERMINAL_ROWS,
    RUNNING,
} from "../../../shared/utils";
import { copyYAMLComments, envsubstYAML } from "../../../shared/yaml";
import type { SocketResult } from "../../../shared/socket-events";
import NetworkInput from "../components/NetworkInput.vue";
import ArrayInput from "../components/ArrayInput.vue";
import Container from "../components/Container.vue";
import Terminal from "../components/Terminal.vue";
import Uptime from "../components/Uptime.vue";
import PageContainer from "../components/PageContainer.vue";
import PageHeader from "../components/PageHeader.vue";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import dotenv from "dotenv";
import { useI18n } from "vue-i18n";
import { composeContextKey, type ComposeContext } from "../context";
import { useSocket } from "../composables/useSocket";
import { useToast } from "../composables/useToast";
import type { DockerStatEntry, ServiceStatus } from "../composables/types";

/** The stack being viewed or edited, as stored in local state. */
interface StackData {
    name : string;
    composeYAML : string;
    composeENV : string;
    isManagedBySilo : boolean;
    composeFileName? : string;
}

/** Parsed compose.yaml as exposed by the shared compose context. */
type ComposeObject = ReturnType<ComposeContext["getJsonConfig"]>;

const template = `
services:
  nginx:
    image: nginx:latest
    restart: unless-stopped
    ports:
      - "8080:80"
`;
const envDefault = "# VARIABLE=value #comment";

let yamlErrorTimeout : ReturnType<typeof setTimeout> | undefined;
let serviceStatusTimeout : ReturnType<typeof setTimeout> | undefined;
let dockerStatsTimeout : ReturnType<typeof setTimeout> | undefined;

const { emitServer, completeStackList, composeTemplate, envTemplate } = useSocket();
const { toastRes, toastError } = useToast();
const { t } = useI18n();
const route = useRoute();
const router = useRouter();

const jsonConfig = ref<ComposeObject>({});
const envsubstJSONConfig = ref<ComposeObject>({});
const yamlError = ref("");
const processing = ref(true);
const showProgressTerminal = ref(false);
const progressTerminalRows = ref(PROGRESS_TERMINAL_ROWS);
const combinedTerminalRows = ref(COMBINED_TERMINAL_ROWS);
const combinedTerminalCols = ref(COMBINED_TERMINAL_COLS);
const stack = ref<StackData>({ name: "",
    composeYAML: "",
    composeENV: "",
    isManagedBySilo: false });
const serviceStatusList = ref<Record<string, ServiceStatus[]>>({});
const dockerStats = ref<Record<string, DockerStatEntry>>({});
const isEditMode = ref(false);
const submitted = ref(false);
const stackLoaded = ref(false);
const showDeleteDialog = ref(false);
const deleteConfirmation = ref("");
const newContainerName = ref("");
const stopServiceStatusTimeout = ref(false);
const stopDockerStatsTimeout = ref(false);

const editorFocus = ref(false);

// Keeps the YAML comments across re-serialisation; non-reactive on purpose.
let yamlDoc : Document | null = null;

const containerList = ref<HTMLElement | null>(null);
const progressTerminal = ref<InstanceType<typeof Terminal> | null>(null);

const focusEffectHandler = (_state : unknown, focusing : boolean) => {
    editorFocus.value = focusing;
    return null;
};

const extensions = [
    yaml(),
    lineNumbers(),
    EditorView.focusChangeEffect.of(focusEffectHandler),
];

const extensionsEnv = [
    python(),
    lineNumbers(),
    EditorView.focusChangeEffect.of(focusEffectHandler),
];

const urls = computed<{ display : string; url : string }[]>(() => {
    const xSilo = envsubstJSONConfig.value["x-silo"];
    if (!xSilo || !xSilo.urls || !Array.isArray(xSilo.urls)) {
        return [];
    }

    const result : { display : string; url : string }[] = [];
    for (const url of xSilo.urls) {
        let display;
        try {
            const obj = new URL(url);
            let pathname = obj.pathname;
            if (pathname === "/") {
                pathname = "";
            }
            display = obj.host + pathname + obj.search;
        } catch {
            display = url;
        }

        result.push({
            display,
            url,
        });
    }
    return result;
});

const isAdd = computed(() => route.path === "/compose" && !submitted.value);

/** True while an existing stack is still being fetched. */
const loadingStack = computed(() => !isAdd.value && !stackLoaded.value);

/**
 * Get the stack from the global stack list, because it may contain more real-time data like status
 */
const globalStack = computed(() => completeStackList.value[stack.value.name]);

const status = computed(() => globalStack.value?.status);

const active = computed(() => status.value === RUNNING);

const terminalName = computed(() => {
    if (!stack.value.name) {
        return "";
    }
    return getComposeTerminalName(stack.value.name);
});

const combinedTerminalName = computed(() => {
    if (!stack.value.name) {
        return "";
    }
    return getCombinedTerminalName(stack.value.name);
});

const url = computed(() => `/compose/${stack.value.name}`);

const deleteConfirmationText = computed(() => `DELETE ${stack.value.name}`);

// Expose the live compose state to every nested container/network editor.
provide<ComposeContext>(composeContextKey, {
    getStack: () => stack.value,
    getJsonConfig: () => jsonConfig.value,
    getEnvsubstJSONConfig: () => envsubstJSONConfig.value,
    isEditorFocused: () => editorFocus.value,
});

watch(() => stack.value.composeYAML, () => {
    if (editorFocus.value) {
        console.debug("yaml code changed");
        yamlCodeChange();
    }
}, { deep: true });

watch(() => stack.value.composeENV, () => {
    if (editorFocus.value) {
        console.debug("env code changed");
        yamlCodeChange();
    }
}, { deep: true });

watch(jsonConfig, () => {
    if (!editorFocus.value) {
        console.debug("jsonConfig changed");

        const doc = new Document(jsonConfig.value);

        // Stick back the yaml comments
        if (yamlDoc) {
            copyYAMLComments(doc, yamlDoc);
        }

        stack.value.composeYAML = doc.toString();
        yamlDoc = doc;
    }
}, { deep: true });

watch(showDeleteDialog, (value) => {
    if (!value) {
        deleteConfirmation.value = "";
    }
});

onBeforeRouteUpdate((_to, _from, next : NavigationGuardNext) => {
    exitConfirm(next);
});

onBeforeRouteLeave((_to, _from, next : NavigationGuardNext) => {
    exitConfirm(next);
});

onMounted(() => {
    if (isAdd.value) {
        processing.value = false;
        isEditMode.value = true;

        let composeYAML;
        let composeENV;

        if (composeTemplate.value) {
            composeYAML = composeTemplate.value;
            composeTemplate.value = "";
        } else {
            composeYAML = template;
        }
        if (envTemplate.value) {
            composeENV = envTemplate.value;
            envTemplate.value = "";
        } else {
            composeENV = envDefault;
        }

        // Default Values
        stack.value = {
            name: "",
            composeYAML,
            composeENV,
            isManagedBySilo: true,
        };
        stackLoaded.value = true;

        yamlCodeChange();
    } else {
        stack.value.name = String(route.params.stackName ?? "");
        loadStack();
    }

    requestServiceStatus();
    requestDockerStats();
});

onUnmounted(() => {
    clearTimeout(serviceStatusTimeout);
    clearTimeout(dockerStatsTimeout);
});

function startServiceStatusTimeout() : void {
    clearTimeout(serviceStatusTimeout);
    serviceStatusTimeout = setTimeout(() => {
        requestServiceStatus();
    }, 5000);
}

function startDockerStatsTimeout() : void {
    clearTimeout(dockerStatsTimeout);
    dockerStatsTimeout = setTimeout(() => {
        requestDockerStats();
    }, 5000);
}

function requestServiceStatus() : void {
    // Do not request if it is add mode
    if (isAdd.value) {
        return;
    }

    emitServer("serviceStatusList", stack.value.name, (res : SocketResult & { serviceStatusList? : Record<string, ServiceStatus[]> }) => {
        if (res.ok && res.serviceStatusList) {
            serviceStatusList.value = res.serviceStatusList;
        }
        if (!stopServiceStatusTimeout.value) {
            startServiceStatusTimeout();
        }
    });
}

function requestDockerStats() : void {
    emitServer("dockerStats", (res : SocketResult & { dockerStats? : Record<string, DockerStatEntry> }) => {
        if (res.ok && res.dockerStats) {
            dockerStats.value = res.dockerStats;
        }
        if (!stopDockerStatsTimeout.value) {
            startDockerStatsTimeout();
        }
    });
}

function exitConfirm(next : NavigationGuardNext) : void {
    if (isEditMode.value) {
        if (confirm(t("confirmLeaveStack"))) {
            exitAction();
            next();
        } else {
            next(false);
        }
    } else {
        exitAction();
        next();
    }
}

function exitAction() : void {
    console.log("exitAction");
    stopServiceStatusTimeout.value = true;
    stopDockerStatsTimeout.value = true;
    clearTimeout(serviceStatusTimeout);
    clearTimeout(dockerStatsTimeout);

    // Leave Combined Terminal
    console.debug("leaveCombinedTerminal", stack.value.name);
    emitServer("leaveCombinedTerminal", stack.value.name, () => {});
}

function bindTerminal() : void {
    progressTerminal.value?.bind?.(terminalName.value);
}

function loadStack() : void {
    processing.value = true;
    emitServer("getStack", stack.value.name, (res : SocketResult & { stack? : StackData }) => {
        if (res.ok && res.stack) {
            stack.value = res.stack;
            yamlCodeChange();
            processing.value = false;
            stackLoaded.value = true;
            bindTerminal();
        } else {
            toastRes(res);
        }
    });
}

function deployStack() : void {
    processing.value = true;

    if (!jsonConfig.value.services) {
        toastError("No services found in compose.yaml");
        processing.value = false;
        return;
    }

    // Check if services is object
    if (typeof jsonConfig.value.services !== "object") {
        toastError("Services must be an object");
        processing.value = false;
        return;
    }

    const serviceNameList = Object.keys(jsonConfig.value.services);

    // Set the stack name if empty, use the first container name
    if (!stack.value.name && serviceNameList.length > 0) {
        const serviceName = serviceNameList[0];
        const service = jsonConfig.value.services[serviceName];

        if (service && service.container_name) {
            stack.value.name = service.container_name;
        } else {
            stack.value.name = serviceName;
        }
    }

    bindTerminal();

    emitServer("deployStack", stack.value.name, stack.value.composeYAML, stack.value.composeENV, isAdd.value, (res : SocketResult) => {
        processing.value = false;
        toastRes(res);

        if (res.ok) {
            isEditMode.value = false;
            router.push(url.value);
        }
    });
}

function saveStack() : void {
    processing.value = true;

    emitServer("saveStack", stack.value.name, stack.value.composeYAML, stack.value.composeENV, isAdd.value, (res : SocketResult) => {
        processing.value = false;
        toastRes(res);

        if (res.ok) {
            isEditMode.value = false;
            router.push(url.value);
        }
    });
}

function startStack() : void {
    processing.value = true;

    emitServer("startStack", stack.value.name, (res : SocketResult) => {
        processing.value = false;
        toastRes(res);
    });
}

function stopStack() : void {
    processing.value = true;

    emitServer("stopStack", stack.value.name, (res : SocketResult) => {
        processing.value = false;
        toastRes(res);
    });
}

function downStack() : void {
    processing.value = true;

    emitServer("downStack", stack.value.name, (res : SocketResult) => {
        processing.value = false;
        toastRes(res);
    });
}

function restartStack() : void {
    processing.value = true;

    emitServer("restartStack", stack.value.name, (res : SocketResult) => {
        processing.value = false;
        toastRes(res);
    });
}

function updateStack() : void {
    processing.value = true;

    emitServer("updateStack", stack.value.name, (res : SocketResult) => {
        processing.value = false;
        toastRes(res);
    });
}

function openDeleteDialog() : void {
    deleteConfirmation.value = "";
    showDeleteDialog.value = true;
}

/**
 * Delete the stack after confirming the typed stack name.
 * @returns {void}
 */
function deleteDialog() : void {
    processing.value = true;
    emitServer("deleteStack", stack.value.name, {
        deleteData: true,
        confirmation: deleteConfirmation.value,
    }, (res : SocketResult) => {
        processing.value = false;
        toastRes(res);
        if (res.ok) {
            showDeleteDialog.value = false;
            router.push("/");
        }
    });
}

function discardStack() : void {
    stackLoaded.value = false;
    loadStack();
    isEditMode.value = false;
}

function yamlToJSON(yamlContent : string) : { config : ComposeObject; doc : Document } {
    const doc = parseDocument(yamlContent);
    if (doc.errors.length > 0) {
        throw doc.errors[0];
    }

    const config = (doc.toJS() ?? {}) as ComposeObject;

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
}

function yamlCodeChange() : void {
    try {
        const { config, doc } = yamlToJSON(stack.value.composeYAML);

        yamlDoc = doc;
        jsonConfig.value = config;

        const env = dotenv.parse(stack.value.composeENV);
        const envYAML = envsubstYAML(stack.value.composeYAML, env);
        envsubstJSONConfig.value = yamlToJSON(envYAML).config;

        clearTimeout(yamlErrorTimeout);
        yamlError.value = "";
    } catch (e) {
        clearTimeout(yamlErrorTimeout);
        const message = e instanceof Error ? e.message : String(e);

        if (yamlError.value) {
            yamlError.value = message;
        } else {
            yamlErrorTimeout = setTimeout(() => {
                yamlError.value = message;
            }, 3000);
        }
    }
}

function enableEditMode() : void {
    isEditMode.value = true;
}

function addContainer() : void {
    if (!jsonConfig.value.services) {
        jsonConfig.value.services = {};
    }

    if (jsonConfig.value.services[newContainerName.value]) {
        toastError("Container name already exists");
        return;
    }

    if (!newContainerName.value) {
        toastError("Container name cannot be empty");
        return;
    }

    jsonConfig.value.services[newContainerName.value] = {
        restart: "unless-stopped",
    };
    newContainerName.value = "";
    const element = containerList.value?.lastElementChild;
    element?.scrollIntoView({
        block: "start",
        behavior: "smooth",
    });
}

function stackNameToLowercase() : void {
    stack.value.name = (stack.value.name ?? "").toLowerCase();
}

function startService(serviceName : string) : void {
    processing.value = true;

    emitServer("startService", stack.value.name, serviceName, (res : SocketResult) => {
        processing.value = false;
        toastRes(res);

        if (res.ok) {
            requestServiceStatus(); // Refresh service status
        }
    });
}

function stopService(serviceName : string) : void {
    processing.value = true;

    emitServer("stopService", stack.value.name, serviceName, (res : SocketResult) => {
        processing.value = false;
        toastRes(res);

        if (res.ok) {
            requestServiceStatus(); // Refresh service status
        }
    });
}

function restartService(serviceName : string) : void {
    processing.value = true;

    emitServer("restartService", stack.value.name, serviceName, (res : SocketResult) => {
        processing.value = false;
        toastRes(res);

        if (res.ok) {
            requestServiceStatus(); // Refresh service status
        }
    });
}
</script>
