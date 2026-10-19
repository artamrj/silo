<template>
    <div v-if="settingsLoaded" class="flex flex-col gap-6">
        <!-- Trust proxy -->
        <Card>
            <CardHeader>
                <CardTitle>{{ $t("Trust proxy") }}</CardTitle>
                <CardDescription>{{ $t("trustProxyDescription") }}</CardDescription>
            </CardHeader>
            <CardContent>
                <Label class="items-start gap-3">
                    <Checkbox
                        :model-value="Boolean(settings.trustProxy)"
                        @update:model-value="(value) => setTrustProxy(Boolean(value))"
                    />
                    <span class="text-sm font-normal">{{ $t("trustProxyLabel") }}</span>
                </Label>
            </CardContent>
        </Card>

        <!-- Authentication -->
        <Card>
            <CardHeader>
                <CardTitle>{{ $t("Authentication") }}</CardTitle>
                <CardDescription>
                    {{ authDisabled ? $t("authDisabledDescription") : $t("authEnabledDescription") }}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div class="flex flex-wrap items-center gap-2">
                    <span
                        class="pill"
                        :class="authDisabled ? 'bg-destructive/15 text-destructive' : 'bg-primary-soft text-primary'"
                    >
                        {{ authDisabled ? $t("Disabled") : $t("Enabled") }}
                    </span>

                    <Button v-if="authDisabled" variant="outline" size="sm" @click="enableAuth">
                        {{ $t("Enable Auth") }}
                    </Button>
                    <Button v-else variant="destructive" size="sm" @click="confirmDisableAuth">
                        {{ $t("Disable Auth") }}
                    </Button>
                </div>
            </CardContent>
        </Card>

        <Confirm ref="confirmDisableAuthRef" btn-style="button-danger" :yes-text="$t('I understand, please disable')" :no-text="$t('Leave')" @yes="disableAuth">
            <i18n-t keypath="disableauth.message1" tag="p">
                <template #disableAuth>
                    <strong>{{ $t("disableAuth") }}</strong>
                </template>
            </i18n-t>

            <i18n-t keypath="disableauth.message2" tag="p">
                <template #scenarios>
                    <strong>{{ $t("scenarios") }}</strong>
                </template>
            </i18n-t>

            <p>{{ $t("Please use this option carefully!") }}</p>

            <div class="flex flex-col gap-1.5">
                <Label for="disable-auth-password">{{ $t("Current Password") }}</Label>
                <Input
                    id="disable-auth-password"
                    v-model="password.currentPassword"
                    type="password"
                    required
                />
            </div>
        </Confirm>
    </div>
</template>

<script setup lang="ts">
import { computed, inject, reactive, ref } from "vue";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Confirm from "../Confirm.vue";
import { settingsContextKey, type SettingsContext } from "../../context";
import { useSocket } from "../../composables/useSocket";

const settingsContext = inject<SettingsContext | null>(settingsContextKey, null);
const { username, socketIO, storage } = useSocket();

const password = reactive({ currentPassword: "" });

const settings = computed(() => settingsContext?.getSettings() ?? {});
const settingsLoaded = computed(() => settingsContext?.isSettingsLoaded() ?? false);
const authDisabled = computed(() => Boolean(settings.value.disableAuth));

const confirmDisableAuthRef = ref<InstanceType<typeof Confirm> | null>(null);

/** Persist the trust-proxy toggle. */
function setTrustProxy(value : boolean) : void {
    settings.value.trustProxy = value;
    settingsContext?.saveSettings();
}

/** Show the confirmation dialog before disabling auth. */
function confirmDisableAuth() : void {
    confirmDisableAuthRef.value?.show();
}

/** Disable authentication; requires the current password. */
function disableAuth() : void {
    settings.value.disableAuth = true;

    settingsContext?.saveSettings(() => {
        password.currentPassword = "";
        username.value = null;
        socketIO.token = "autoLogin";
    }, password.currentPassword);
}

/** Re-enable authentication and force a fresh login. */
function enableAuth() : void {
    settings.value.disableAuth = false;
    settingsContext?.saveSettings();
    storage().removeItem("token");
    location.reload();
}
</script>
