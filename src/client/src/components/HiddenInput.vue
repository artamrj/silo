<template>
    <div class="mb-3 flex items-stretch gap-2">
        <input
            v-model="model"
            :type="visibility"
            class="field"
            :placeholder="placeholder"
            :maxlength="maxlength"
            :autocomplete="autocomplete"
            :required="required"
            :readonly="readonly"
        >

        <button type="button" class="button button-normal" :aria-label="visibility === 'password' ? $t('Show') : $t('Hide')" @click="toggleVisibility">
            <app-icon :icon="visibility === 'password' ? 'eye' : 'eye-slash'" />
        </button>
    </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { AppIcon } from "../icon";

const props = withDefaults(defineProps<{
    /** The value of the input */
    modelValue?: string;
    /** A placeholder to use */
    placeholder?: string;
    /** Maximum length of the input */
    maxlength?: number;
    /** Should the field auto complete */
    autocomplete?: string;
    /** Is the input required? */
    required?: boolean;
    /** Should the input be read only? */
    readonly?: boolean;
}>(), {
    modelValue: "",
    placeholder: "",
    maxlength: 255,
    autocomplete: "new-password",
    required: false,
    readonly: false,
});

const emit = defineEmits<{ "update:modelValue": [ value : string ] }>();

const visibility = ref("password");

const model = computed({
    get() : string {
        return props.modelValue;
    },
    set(value : string) : void {
        emit("update:modelValue", value);
    },
});

/** Toggle between plain text and censored input */
function toggleVisibility() : void {
    visibility.value = visibility.value === "password" ? "text" : "password";
}
</script>
