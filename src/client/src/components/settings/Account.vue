<template>
    <div v-if="settingsLoaded" class="flex flex-col gap-6">
        <!-- Identity -->
        <Card>
            <CardHeader>
                <CardTitle>{{ $t("Account") }}</CardTitle>
                <CardDescription>{{ $t("accountDescription") }}</CardDescription>
            </CardHeader>
            <CardContent class="flex flex-wrap items-center justify-between gap-3">
                <div class="flex items-center gap-2 text-sm">
                    <span class="text-ink-muted">{{ $t("Current User") }}:</span>
                    <strong class="text-ink">{{ authDisabled ? $t("signedInDispDisabled") : username }}</strong>
                </div>

                <Button variant="destructive" size="sm" @click="logout">
                    <app-icon icon="sign-out-alt" />
                    {{ $t("Logout") }}
                </Button>
            </CardContent>
        </Card>

        <!-- Change Password -->
        <Card v-if="!authDisabled">
            <CardHeader>
                <CardTitle>{{ $t("Change Password") }}</CardTitle>
                <CardDescription>{{ $t("changePasswordDescription") }}</CardDescription>
            </CardHeader>
            <CardContent>
                <form class="flex flex-col gap-4" autocomplete="off" @submit.prevent="savePassword">
                    <div class="flex flex-col gap-1.5">
                        <Label for="current-password">{{ $t("Current Password") }}</Label>
                        <Input
                            id="current-password"
                            v-model="password.currentPassword"
                            type="password"
                            autocomplete="current-password"
                            required
                        />
                    </div>

                    <div class="flex flex-col gap-1.5">
                        <Label for="new-password">{{ $t("New Password") }}</Label>
                        <Input
                            id="new-password"
                            v-model="password.newPassword"
                            type="password"
                            autocomplete="new-password"
                            required
                        />
                    </div>

                    <div class="flex flex-col gap-1.5">
                        <Label for="repeat-new-password">{{ $t("Repeat New Password") }}</Label>
                        <Input
                            id="repeat-new-password"
                            v-model="password.repeatNewPassword"
                            type="password"
                            :aria-invalid="invalidPassword"
                            aria-describedby="password-mismatch"
                            autocomplete="new-password"
                            required
                        />
                        <p v-if="invalidPassword" id="password-mismatch" class="text-xs text-destructive">
                            {{ $t("passwordNotMatchMsg") }}
                        </p>
                    </div>

                    <div>
                        <Button type="submit">{{ $t("Update Password") }}</Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    </div>
</template>

<script setup lang="ts">
import { computed, inject, reactive, ref, watch } from "vue";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { settingsContextKey, type SettingsContext } from "../../context";
import { useSocket } from "../../composables/useSocket";
import { useToast } from "../../composables/useToast";
import type { SocketResult } from "../../../../shared/socket-events";

const settingsContext = inject<SettingsContext | null>(settingsContextKey, null);
const { username, getSocket, logout } = useSocket();
const { toastRes } = useToast();

const invalidPassword = ref(false);
const password = reactive({
    currentPassword: "",
    newPassword: "",
    repeatNewPassword: "",
});

const settings = computed(() => settingsContext?.getSettings() ?? {});
const settingsLoaded = computed(() => settingsContext?.isSettingsLoaded() ?? false);
const authDisabled = computed(() => Boolean(settings.value.disableAuth));

watch(() => password.repeatNewPassword, () => {
    invalidPassword.value = false;
});

/** Change the admin password after confirming both new fields match. */
function savePassword() : void {
    if (password.newPassword !== password.repeatNewPassword) {
        invalidPassword.value = true;
        return;
    }

    (getSocket().emit as (event : string, payload : unknown, cb : (res : SocketResult) => void) => void)("changePassword", password, (res) => {
        toastRes(res);
        if (res.ok) {
            password.currentPassword = "";
            password.newPassword = "";
            password.repeatNewPassword = "";
        }
    });
}
</script>
