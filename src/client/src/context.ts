/* eslint-disable @typescript-eslint/no-explicit-any -- compose YAML is untyped JSON */
import type { InjectionKey } from "vue";

/**
 * Context shared by Compose.vue with every container/network editor nested
 * beneath it. Values are exposed through getters so consumers always read the
 * current object instead of a stale snapshot.
 */
export interface ComposeContext {
    /** The stack currently being viewed or edited. */
    getStack: () => Record<string, any>;
    /** Parsed compose.yaml as a mutable object. */
    getJsonConfig: () => Record<string, any>;
    /** Parsed compose.yaml after .env substitution, read-only for display. */
    getEnvsubstJSONConfig: () => Record<string, any>;
    /** Whether the YAML editor currently owns focus. */
    isEditorFocused: () => boolean;
}

export const composeContextKey : InjectionKey<ComposeContext> = Symbol("composeContext");

/**
 * Context shared by Container.vue with the array editors inside a single
 * service. Returns the live service object so edits land in compose.yaml.
 */
export interface ServiceContext {
    /** The service object of the owning Container.vue. */
    getService: () => Record<string, any>;
}

export const serviceContextKey : InjectionKey<ServiceContext> = Symbol("serviceContext");

/**
 * Context shared by Settings.vue with the settings sub-pages.
 */
export interface SettingsContext {
    /** The mutable settings object loaded from the server. */
    getSettings: () => Record<string, any>;
    /** Persist the settings, optionally with the current password and a callback. */
    saveSettings: (callback? : () => void, currentPassword? : string) => void;
    /** Whether the settings have finished loading. */
    isSettingsLoaded: () => boolean;
}

export const settingsContextKey : InjectionKey<SettingsContext> = Symbol("settingsContext");
