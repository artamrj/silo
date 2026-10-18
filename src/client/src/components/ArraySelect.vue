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

<script>
import { AppIcon } from "../icon";
import { serviceContextKey } from "../context";

export default {
    components: {
        AppIcon,
    },
    inject: {
        serviceContext: {
            from: serviceContextKey,
            default: null,
        },
    },
    props: {
        name: {
            type: String,
            required: true,
        },
        placeholder: {
            type: String,
            default: "",
        },
        displayName: {
            type: String,
            required: true,
        },
        options: {
            type: Array,
            required: true,
        },
    },
    computed: {
        array() {
            // Create the array if not exists, it should be safe.
            if (!this.service[this.name]) {
                return [];
            }
            return this.service[this.name];
        },

        /**
         * Check if the array is inited before called v-for.
         * Prevent empty arrays inserted to the YAML file.
         * @return {boolean}
         */
        isArrayInited() {
            return this.service[this.name] !== undefined;
        },

        service() {
            return this.serviceContext?.getService() ?? {};
        },

        valid() {
            // Check if the array is actually an array
            if (!Array.isArray(this.array)) {
                return false;
            }

            // Check if the array contains non-object only.
            for (let item of this.array) {
                if (typeof item === "object") {
                    return false;
                }
            }
            return true;
        }

    },
    methods: {
        addField() {
            // Create the array if not exists.
            if (!this.service[this.name]) {
                this.service[this.name] = [];
            }
            this.array.push("");
        },
        remove(index) {
            this.array.splice(index, 1);
        },
    }
};
</script>
