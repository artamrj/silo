<template>
    <div class="flex min-h-screen items-center py-10" data-cy="setup-form">
        <div class="m-auto w-full max-w-[440px] rounded-3xl bg-surface p-9 text-center shadow-lg">
            <form @submit.prevent="submit">
                <div>
                    <object width="64" height="64" data="/icon.svg" />
                    <div class="mt-1.5 text-2xl font-bold">
                        Silo
                    </div>
                </div>

                <p class="mt-3">
                    {{ $t("Create your admin account") }}
                </p>

                <div class="mt-3 text-left">
                    <label class="field-label" for="floatingInput">{{ $t("Username") }}</label>
                    <input id="floatingInput" v-model="username" type="text" class="field" :placeholder="$t('Username')" required data-cy="username-input">
                </div>

                <div class="mt-3 text-left">
                    <label class="field-label" for="floatingPassword">{{ $t("Password") }}</label>
                    <input id="floatingPassword" v-model="password" type="password" class="field" :placeholder="$t('Password')" required data-cy="password-input">
                </div>

                <div class="mt-3 text-left">
                    <label class="field-label" for="repeat">{{ $t("Repeat Password") }}</label>
                    <input id="repeat" v-model="repeatPassword" type="password" class="field" :placeholder="$t('Repeat Password')" required data-cy="password-repeat-input">
                </div>

                <button class="button button-primary mt-3 w-full" type="submit" :disabled="processing" data-cy="submit-setup-form">
                    {{ $t("Create") }}
                </button>
            </form>
        </div>
    </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useSocket } from "../composables/useSocket";
import { useToast } from "../composables/useToast";
import type { SocketResult } from "../../../shared/socket-events";

const { getSocket, login } = useSocket();
const { toastError, toastRes } = useToast();
const router = useRouter();

const processing = ref(false);
const username = ref("");
const password = ref("");
const repeatPassword = ref("");

onMounted(() => {
    // TODO: Check if it is a database setup

    (getSocket().emit as (event : string, cb : (needSetup : boolean) => void) => void)("needSetup", (needSetup : boolean) => {
        if (!needSetup) {
            router.push("/");
        }
    });
});

/**
 * Submit form data for processing
 * @returns {void}
 */
function submit() : void {
    processing.value = true;

    if (password.value !== repeatPassword.value) {
        toastError("PasswordsDoNotMatch");
        processing.value = false;
        return;
    }

    (getSocket().emit as (event : string, user : string, pass : string, cb : (res : SocketResult) => void) => void)("setup", username.value, password.value, (res : SocketResult) => {
        processing.value = false;
        toastRes(res);

        if (res.ok) {
            processing.value = true;

            login(username.value, password.value, "", () => {
                processing.value = false;
                router.push("/");
            });
        }
    });
}
</script>
