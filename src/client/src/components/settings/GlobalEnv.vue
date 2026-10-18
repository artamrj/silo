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
                        wrap="true"
                        dark="true"
                        tab="true"
                        :hasFocus="editorFocus"
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

<script>
import CodeMirror from "vue-codemirror6";
import { python } from "@codemirror/lang-python"; // good enough for .env key=value highlighting
import { lineNumbers, EditorView } from "@codemirror/view";
import { ref } from "vue";
import { settingsContextKey } from "../../context";

export default {
    name: "GlobalEnv",
    components: {
        CodeMirror,
    },

    inject: {
        settingsContext: {
            from: settingsContextKey,
            default: null,
        },
    },

    setup() {
        const editorFocus = ref(false);

        const focusEffectHandler = (state, focusing) => {
            editorFocus.value = focusing;
            return null;
        };

        const extensionsEnv = [
            python(),
            lineNumbers(),
            EditorView.focusChangeEffect.of(focusEffectHandler),
        ];

        return { editorFocus,
            extensionsEnv };
    },

    computed: {
        settings() {
            return this.settingsContext?.getSettings() ?? {};
        },
        settingsLoaded() {
            return this.settingsContext?.isSettingsLoaded() ?? false;
        },
    },

    methods: {
        /** Save the settings */
        saveGeneral() {
            this.settingsContext?.saveSettings();
        },

        onChange() {
            // hook for future live validation if desired
        },
    },
};
</script>
