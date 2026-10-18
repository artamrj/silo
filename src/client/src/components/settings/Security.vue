<template>
    <div>
        <div v-if="settingsLoaded">
            <!-- Change Password -->
            <template v-if="!settings.disableAuth">
                <p class="mb-3 flex flex-wrap items-center gap-3">
                    <span>{{ $t("Current User") }}: <strong>{{ username }}</strong></span>
                    <button v-if="! settings.disableAuth" id="logout-btn" class="button button-danger button-sm" @click="logout">{{ $t("Logout") }}</button>
                </p>

                <h5 class="mb-3">{{ $t("Change Password") }}</h5>
                <form class="mb-3" @submit.prevent="savePassword">
                    <div class="mb-3">
                        <label for="current-password" class="field-label">
                            {{ $t("Current Password") }}
                        </label>
                        <input
                            id="current-password"
                            v-model="password.currentPassword"
                            type="password"
                            class="field"
                            autocomplete="current-password"
                            required
                        />
                    </div>

                    <div class="mb-3">
                        <label for="new-password" class="field-label">
                            {{ $t("New Password") }}
                        </label>
                        <input
                            id="new-password"
                            v-model="password.newPassword"
                            type="password"
                            class="field"
                            autocomplete="new-password"
                            required
                        />
                    </div>

                    <div class="mb-3">
                        <label for="repeat-new-password" class="field-label">
                            {{ $t("Repeat New Password") }}
                        </label>
                        <input
                            id="repeat-new-password"
                            v-model="password.repeatNewPassword"
                            type="password"
                            class="field"
                            :class="{ 'bg-destructive/10': invalidPassword }"
                            :aria-invalid="invalidPassword"
                            aria-describedby="password-mismatch"
                            autocomplete="new-password"
                            required
                        />
                        <div v-if="invalidPassword" id="password-mismatch" class="field-hint text-danger">
                            {{ $t("passwordNotMatchMsg") }}
                        </div>
                    </div>

                    <div>
                        <button class="button button-primary" type="submit">
                            {{ $t("Update Password") }}
                        </button>
                    </div>
                </form>
            </template>

            <div class="mt-4">
                <!-- Advanced -->
                <h5 class="mb-3">{{ $t("Advanced") }}</h5>

                <div class="mb-4">
                    <button v-if="settings.disableAuth" id="enableAuth-btn" class="button button-outline" @click="enableAuth">{{ $t("Enable Auth") }}</button>
                    <button v-if="! settings.disableAuth" id="disableAuth-btn" class="button button-primary" @click="confirmDisableAuth">{{ $t("Disable Auth") }}</button>
                </div>
            </div>
        </div>

        <Confirm ref="confirmDisableAuthRef" btn-style="button-danger" :yes-text="$t('I understand, please disable')" :no-text="$t('Leave')" @yes="disableAuth">
            <i18n-t keypath="disableauth.message1" tag="p">
                <template #disableAuth>
                    <strong>{{ $t('disableAuth') }}</strong>
                </template>
            </i18n-t>

            <i18n-t keypath="disableauth.message2" tag="p">
                <template #scenarios>
                    <strong>{{ $t('scenarios') }}</strong>
                </template>
            </i18n-t>

            <p>{{ $t("Please use this option carefully!") }}</p>

            <div class="mb-3">
                <label for="current-password2" class="field-label">
                    {{ $t("Current Password") }}
                </label>
                <input
                    id="current-password2"
                    v-model="password.currentPassword"
                    type="password"
                    class="field"
                    required
                />
            </div>
        </Confirm>
    </div>
</template>

<script setup lang="ts">
import { computed, inject, reactive, ref, watch } from "vue";
import Confirm from "../../components/Confirm.vue";
import { settingsContextKey, type SettingsContext } from "../../context";
import { useSocket } from "../../composables/useSocket";
import { useToast } from "../../composables/useToast";
import type { SocketResult } from "../../../../shared/socket-events";

const settingsContext = inject<SettingsContext | null>(settingsContextKey, null);
const { username, socketIO, getSocket, logout, storage } = useSocket();
const { toastRes } = useToast();

const invalidPassword = ref(false);
const password = reactive({
    currentPassword: "",
    newPassword: "",
    repeatNewPassword: "",
});

const settings = computed(() => settingsContext?.getSettings() ?? {});
const settingsLoaded = computed(() => settingsContext?.isSettingsLoaded() ?? false);

watch(() => password.repeatNewPassword, () => {
    invalidPassword.value = false;
});

/** Check new passwords match before saving them */
function savePassword() : void {
    if (password.newPassword !== password.repeatNewPassword) {
        invalidPassword.value = true;
    } else {
        (getSocket().emit as (event : string, payload : unknown, cb : (res : SocketResult) => void) => void)("changePassword", password, (res) => {
            toastRes(res);
            if (res.ok) {
                password.currentPassword = "";
                password.newPassword = "";
                password.repeatNewPassword = "";
            }
        });
    }
}

/** Disable authentication for web app access */
function disableAuth() : void {
    settings.value.disableAuth = true;

    // Need current password to disable auth
    // Set it to empty if done
    settingsContext?.saveSettings(() => {
        password.currentPassword = "";
        username.value = null;
        socketIO.token = "autoLogin";
    }, password.currentPassword);
}

/** Enable authentication for web app access */
function enableAuth() : void {
    settings.value.disableAuth = false;
    settingsContext?.saveSettings();
    storage().removeItem("token");
    location.reload();
}

/** Show confirmation dialog for disable auth */
function confirmDisableAuth() : void {
    confirmDisableAuthRef.value?.show();
}

const confirmDisableAuthRef = ref<InstanceType<typeof Confirm> | null>(null);
</script>
