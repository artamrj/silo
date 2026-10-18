<template>
    <div>
        <form autocomplete="off" @submit.prevent="saveGeneral">
            <!-- Primary Hostname -->
            <div class="mb-4">
                <label class="field-label" for="primaryBaseURL">
                    {{ $t("primaryHostname") }}
                </label>

                <div class="flex items-stretch gap-2">
                    <input
                        v-model="settings.primaryHostname"
                        class="field"
                        :placeholder="$t(`CurrentHostname`)"
                    />
                    <button class="button button-normal shrink-0" type="button" @click="autoGetPrimaryHostname">
                        {{ $t("autoGet") }}
                    </button>
                </div>
            </div>

            <!-- Save Button -->
            <div>
                <button class="button button-primary" type="submit">
                    {{ $t("Save") }}
                </button>
            </div>
        </form>
    </div>
</template>

<script setup lang="ts">
import { computed, inject } from "vue";
import { settingsContextKey, type SettingsContext } from "../../context";

const settingsContext = inject<SettingsContext | null>(settingsContextKey, null);

const settings = computed(() => settingsContext?.getSettings() ?? {});

/** Save the settings */
function saveGeneral() : void {
    settingsContext?.saveSettings();
}

/** Get the base URL of the application */
function autoGetPrimaryHostname() : void {
    settings.value.primaryHostname = location.hostname;
}
</script>
