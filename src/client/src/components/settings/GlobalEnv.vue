<template>
    <div>
        <div v-if="settingsLoaded">
            <form autocomplete="off" @submit.prevent="saveGeneral">
                <div class="editor mb-3">
                    <code-mirror
                        ref="editor"
                        v-model="settings.globalENV"
                        :extensions="extensionsEnv"
                        minimal
                        wrap
                        dark
                        tab
                        :has-focus="editorFocus"
                        @change="onChange"
                    />
                </div>

                <div class="mt-4">
                    <!-- Save Button -->
                    <div>
                        <button class="button button-primary" type="submit">
                            {{ $t("Save") }}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, inject, ref } from "vue";
import CodeMirror from "vue-codemirror6";
import { python } from "@codemirror/lang-python"; // good enough for .env key=value highlighting
import { lineNumbers, EditorView } from "@codemirror/view";
import { settingsContextKey, type SettingsContext } from "../../context";

const settingsContext = inject<SettingsContext | null>(settingsContextKey, null);

const editorFocus = ref(false);

const focusEffectHandler = (_state : unknown, focusing : boolean) => {
    editorFocus.value = focusing;
    return null;
};

const extensionsEnv = [
    python(),
    lineNumbers(),
    EditorView.focusChangeEffect.of(focusEffectHandler),
];

const settings = computed(() => settingsContext?.getSettings() ?? {});
const settingsLoaded = computed(() => settingsContext?.isSettingsLoaded() ?? false);

/** Save the settings */
function saveGeneral() : void {
    settingsContext?.saveSettings();
}

function onChange() : void {
    // hook for future live validation if desired
}
</script>
