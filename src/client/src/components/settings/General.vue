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

<script>
import { settingsContextKey } from "../../context";

export default {
    inject: {
        settingsContext: {
            from: settingsContextKey,
            default: null,
        },
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
        /** Get the base URL of the application */
        autoGetPrimaryHostname() {
            this.settings.primaryHostname = location.hostname;
        },
    },
};
</script>
