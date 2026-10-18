<template>
    <div>
        <div v-if="valid">
            <ul v-if="isArrayInited" class="flex list-none flex-col gap-2 p-0">
                <li v-for="(value, index) in array" :key="index" class="flex items-center gap-2">
                    <input v-model="array[index]" type="text" class="field" :placeholder="placeholder" />
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
import { composeContextKey, serviceContextKey, type ComposeContext, type ServiceContext } from "../context";

/** Untyped YAML object as exposed by the compose context. */
type ComposeObject = ReturnType<ComposeContext["getJsonConfig"]>;

const props = withDefaults(defineProps<{
    name : string;
    placeholder?: string;
    displayName : string;
    objectType?: string;
}>(), {
    placeholder: "",
    objectType: "service",
});

const composeContext = inject<ComposeContext | null>(composeContextKey, null);
const serviceContext = inject<ServiceContext | null>(serviceContextKey, null);

/**
 * Not a good name, but it is used to get the object.
 */
const service = computed<ComposeObject>(() => {
    if (props.objectType === "x-silo") {
        // Used in Compose.vue
        const config = composeContext?.getJsonConfig() ?? {};

        if (!config["x-silo"]) {
            return {};
        }

        return config["x-silo"];
    }

    // Used in Container.vue
    return serviceContext?.getService() ?? {};
});

const array = computed<unknown[]>(() => {
    // Create the array if not exists, it should be safe.
    if (!service.value[props.name]) {
        return [];
    }
    return service.value[props.name];
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
    // Create the object if not exists.
    if (props.objectType === "x-silo") {
        const config = composeContext?.getJsonConfig();

        if (config && !config["x-silo"]) {
            config["x-silo"] = {};
        }
    }

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
