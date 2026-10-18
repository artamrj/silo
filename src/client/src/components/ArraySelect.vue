<template>
    <div>
        <div v-if="valid">
            <ul v-if="isArrayInited" class="flex list-none flex-col gap-2 p-0">
                <li v-for="(value, index) in array" :key="index" class="flex items-center gap-2">
                    <select v-model="array[index]" class="field">
                        <option value="">{{ $t(`Select a network...`) }}</option>
                        <option v-for="option in options" :key="option" :value="option">{{ option }}</option>
                    </select>

                    <button type="button" class="button button-sm button-danger" :aria-label="$t('delete')" @click="remove(index)">
                        <app-icon icon="times" />
                    </button>
                </li>
            </ul>

            <button class="button button-normal button-sm mt-3" @click="addField">{{ $t("addListItem", [ displayName ]) }}</button>
        </div>
        <div v-else class="text-ink-muted">
            {{ $t("LongSyntaxNotSupported") }}
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, inject } from "vue";
import { AppIcon } from "../icon";
import { serviceContextKey, type ServiceContext } from "../context";

const props = withDefaults(defineProps<{
    name : string;
    placeholder?: string;
    displayName : string;
    options : string[];
}>(), {
    placeholder: "",
});

const serviceContext = inject<ServiceContext | null>(serviceContextKey, null);

const service = computed<Record<string, unknown>>(() => serviceContext?.getService() ?? {});

const array = computed<unknown[]>(() => {
    // Create the array if not exists, it should be safe.
    if (!service.value[props.name]) {
        return [];
    }
    return service.value[props.name] as unknown[];
});

/**
 * Check if the array is inited before called v-for.
 * Prevent empty arrays inserted to the YAML file.
 * @returns whether the property exists on the service yet
 */
const isArrayInited = computed(() => service.value[props.name] !== undefined);

const valid = computed(() => {
    // Check if the array is actually an array
    if (!Array.isArray(array.value)) {
        return false;
    }

    // Check if the array contains non-object only.
    for (const item of array.value) {
        if (typeof item === "object") {
            return false;
        }
    }
    return true;
});

function addField() : void {
    // Create the array if not exists.
    if (!service.value[props.name]) {
        service.value[props.name] = [];
    }
    array.value.push("");
}

function remove(index : number) : void {
    array.value.splice(index, 1);
}
</script>
