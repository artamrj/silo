import { log } from "./log";
import { LooseObject } from "../shared/utils";
import { Database } from "./database";
import {
    findSetting,
    getSettingsByType,
    setSetting,
    setSettingsByType,
} from "./db/repositories/settings";

/**
 * Known settings and their runtime types. Used to give `Settings.get` a typed
 * return value instead of `unknown`, so callers cannot accidentally treat a
 * setting as the wrong type.
 */
export interface SettingsKeyMap {
    disableAuth: boolean;
    trustProxy: boolean;
    keepDataPeriodDays: number;
    primaryHostname: string;
}

export type SettingsKey = keyof SettingsKeyMap;

/** How long a cached value stays valid before the cleaner drops it. */
const CACHE_TTL_MS = 60 * 1000;

/**
 * Typed, cached access to the `setting` table.
 *
 * Values are stored JSON-encoded in SQLite. This facade owns the parse and
 * stringify so repositories can stay dumb, and keeps a short-lived cache so the
 * settings UI does not hit the database on every render.
 */
export class Settings {

    /**
     *  Example:
     *      {
     *         key1: {
     *             value: "value2",
     *             timestamp: 12345678
     *         },
     *         key2: {
     *             value: 2,
     *             timestamp: 12345678
     *         },
     *     }
     */
    static cacheList : LooseObject = {

    };

    static cacheCleaner? : NodeJS.Timeout;

    /**
     * Retrieve value of setting based on key
     * @param key Key of setting to retrieve
     * @returns Value
     */
    static async get<K extends SettingsKey>(key : K) : Promise<SettingsKeyMap[K] | undefined>;
    static async get(key : string) : Promise<unknown>;
    static async get(key : string) : Promise<unknown> {

        // Start cache clear if not started yet
        if (!Settings.cacheCleaner) {
            Settings.cacheCleaner = setInterval(() => {
                for (const cachedKey in Settings.cacheList) {
                    if (Date.now() - Settings.cacheList[cachedKey].timestamp > CACHE_TTL_MS) {
                        delete Settings.cacheList[cachedKey];
                    }
                }

            }, CACHE_TTL_MS);
        }

        // Query from cache
        if (key in Settings.cacheList) {
            const v = Settings.cacheList[key].value;
            log.debug("settings", `Get Setting (cache): ${key}: ${v}`);
            return v;
        }

        const raw = findSetting(Database.getDb(), key);
        if (raw === undefined) {
            return undefined;
        }

        let value : unknown;
        try {
            value = JSON.parse(raw.value ?? "null");
        } catch {
            value = raw.value;
        }

        log.debug("settings", `Get Setting: ${key}: ${value}`);

        Settings.cacheList[key] = {
            value,
            timestamp: Date.now()
        };

        return value;
    }

    /**
     * Sets the specified setting to specified value
     * @param key Key of setting to set
     * @param value Value to set to
     * @param {?string} type Type of setting
     * @returns {Promise<void>}
     */
    static async set(key : string, value : object | string | number | boolean, type : string | null = null) {
        setSetting(Database.getDb(), key, JSON.stringify(value), type);
        Settings.deleteCache([ key ]);
    }

    /**
     * Get settings based on type
     * @param type The type of setting
     * @returns Settings
     */
    static async getSettings(type : string) {
        const list = getSettingsByType(Database.getDb(), type);

        const result : LooseObject = {};

        for (const row of list) {
            try {
                result[row.key] = JSON.parse(row.value ?? "null");
            } catch {
                result[row.key] = row.value;
            }
        }

        return result;
    }

    /**
     * Set settings based on type
     *
     * Only keys that are new or already belong to `type` are written, so a
     * settings form scoped to `general` cannot clobber untagged rows such as the
     * JWT secret.
     * @param type Type of settings to set
     * @param data Values of settings
     * @returns {Promise<void>}
     */
    static async setSettings(type : string, data : LooseObject) {
        const db = Database.getDb();
        const entries : { key : string, value : string }[] = [];

        for (const key of Object.keys(data)) {
            const existing = findSetting(db, key);

            if (existing && existing.type !== type) {
                continue;
            }

            entries.push({
                key,
                value: JSON.stringify(data[key]),
            });
        }

        if (entries.length > 0) {
            setSettingsByType(db, type, entries);
        }

        Settings.deleteCache(Object.keys(data));
    }

    /**
     * Delete selected keys from settings cache
     * @param {string[]} keyList Keys to remove
     * @returns {void}
     */
    static deleteCache(keyList : string[]) {
        for (const key of keyList) {
            delete Settings.cacheList[key];
        }
    }

    /**
     * Stop the cache cleaner if running
     * @returns {void}
     */
    static stopCacheCleaner() {
        if (Settings.cacheCleaner) {
            clearInterval(Settings.cacheCleaner);
            Settings.cacheCleaner = undefined;
        }
    }
}
