<template>
    <div v-if="settingsLoaded" class="flex flex-col gap-6">
        <Card>
            <CardHeader>
                <CardTitle>{{ $t("Environment") }}</CardTitle>
                <CardDescription>{{ $t("globalEnvDescription") }}</CardDescription>
            </CardHeader>
            <CardContent>
                <form autocomplete="off" @submit.prevent="saveEnv">
                    <div class="editor">
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

                    <div class="mt-6">
                        <Button type="submit">{{ $t("Save") }}</Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    </div>
</template>

<script setup lang="ts">
import { computed, inject, ref } from "vue";
import CodeMirror from "vue-codemirror6";
import { python } from "@codemirror/lang-python"; // good enough for .env key=value highlighting
import { lineNumbers, EditorView } from "@codemirror/view";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

/** Persist the global .env contents. */
function saveEnv() : void {
    settingsContext?.saveSettings();
}

function onChange() : void {
    // hook for future live validation if desired
}
</script>
