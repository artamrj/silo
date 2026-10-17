<template>
    <div class="maintenance-settings">
        <h2>Automation & Maintenance</h2>
        <label class="form-label">Update schedule (cron)</label>
        <input v-model="settings.updateSchedule" class="form-control mb-3" placeholder="0 3 * * *" />

        <div class="form-check mb-2">
            <input id="maintenanceWindow" v-model="settings.maintenanceWindow.enabled" class="form-check-input" type="checkbox" />
            <label class="form-check-label" for="maintenanceWindow">Limit scheduled checks to a maintenance window</label>
        </div>
        <div class="row mb-3">
            <div class="col">
                <label class="form-label">Start</label>
                <input v-model="settings.maintenanceWindow.start" class="form-control" type="time" />
            </div>
            <div class="col">
                <label class="form-label">End</label>
                <input v-model="settings.maintenanceWindow.end" class="form-control" type="time" />
            </div>
        </div>

        <h3>Backup hooks</h3>
        <input v-model="settings.backup.beforeUpdate" class="form-control mb-2" placeholder="Before update command" />
        <input v-model="settings.backup.afterUpdate" class="form-control mb-3" placeholder="After update command" />

        <h3>Notifications</h3>
        <div v-for="(target, index) in settings.notifications" :key="index" class="notification-row">
            <select v-model="target.provider" class="form-control">
                <option value="ntfy">ntfy</option>
                <option value="gotify">Gotify</option>
                <option value="telegram">Telegram</option>
                <option value="discord">Discord</option>
                <option value="webhook">Webhook</option>
            </select>
            <input v-model="target.url" class="form-control" placeholder="URL/topic/webhook" />
            <input v-model="target.token" class="form-control" placeholder="Token" />
            <button class="btn btn-outline-danger" @click="settings.notifications.splice(index, 1)">Remove</button>
        </div>
        <button class="btn btn-outline-normal mb-3" @click="addNotification">Add notification target</button>

        <div>
            <button class="btn btn-normal" @click="save">Save maintenance settings</button>
        </div>
    </div>
</template>

<script>
export default {
    data() {
        return {
            settings: {
                updateSchedule: "",
                maintenanceWindow: { enabled: false,
                    start: "02:00",
                    end: "04:00" },
                notifications: [],
                backup: {},
            },
        };
    },
    mounted() {
        this.$root.getSocket().emit("getMaintenanceSettings", (res) => {
            if (res.ok) {
                this.settings = {
                    ...this.settings,
                    ...res.settings,
                    maintenanceWindow: { ...this.settings.maintenanceWindow,
                        ...res.settings.maintenanceWindow },
                    backup: { ...this.settings.backup,
                        ...res.settings.backup },
                };
            }
        });
    },
    methods: {
        addNotification() {
            this.settings.notifications.push({ provider: "ntfy",
                url: "",
                enabled: true });
        },
        save() {
            const payload = JSON.parse(JSON.stringify(this.settings));
            if (!payload.updateSchedule) {
                delete payload.updateSchedule;
            }
            this.$root.getSocket().emit("saveMaintenanceSettings", payload, (res) => this.$root.toastRes(res));
        },
    },
};
</script>

<style scoped>
.notification-row {
    display: grid;
    grid-template-columns: 140px 1fr 1fr auto;
    gap: 8px;
    margin-bottom: 8px;
}
</style>
