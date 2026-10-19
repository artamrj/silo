<template>
    <div v-if="settingsLoaded" class="flex flex-col gap-6">
        <Card>
            <CardHeader>
                <CardTitle>{{ $t("primaryHostname") }}</CardTitle>
                <CardDescription>{{ $t("primaryHostnameDescription") }}</CardDescription>
            </CardHeader>
            <CardContent>
                <form autocomplete="off" @submit.prevent="saveGeneral">
                    <div class="flex items-stretch gap-2">
                        <Input
                            v-model="settings.primaryHostname"
                            :placeholder="$t('CurrentHostname')"
                        />
                        <Button type="button" variant="outline" class="shrink-0" @click="autoGetPrimaryHostname">
                            {{ $t("autoGet") }}
                        </Button>
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
import { computed, inject } from "vue";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { settingsContextKey, type SettingsContext } from "../../context";

const settingsContext = inject<SettingsContext | null>(settingsContextKey, null);

const settings = computed(() => settingsContext?.getSettings() ?? {});
const settingsLoaded = computed(() => settingsContext?.isSettingsLoaded() ?? false);

/** Persist the general settings. */
function saveGeneral() : void {
    settingsContext?.saveSettings();
}

/** Fill the hostname field with the browser's current hostname. */
function autoGetPrimaryHostname() : void {
    settings.value.primaryHostname = location.hostname;
}
</script>
