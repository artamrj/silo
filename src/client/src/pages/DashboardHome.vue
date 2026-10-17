<template>
    <transition ref="tableContainer" name="slide-fade" appear>
        <div v-if="$route.name === 'DashboardHome'" class="home-dashboard">
            <h1 class="mb-3">
                {{ $t("home") }}
            </h1>

            <div class="row first-row">
                <!-- Left -->
                <div class="col-12">
                    <!-- Stats -->
                    <div class="shadow-box big-padding text-center mb-4 stats-card">
                        <div class="row">
                            <div class="col">
                                <h3>{{ $t("active") }}</h3>
                                <span class="num active">{{ activeNum }}</span>
                            </div>
                            <div class="col">
                                <h3>{{ $t("exited") }}</h3>
                                <span class="num exited">{{ exitedNum }}</span>
                            </div>
                            <div class="col">
                                <h3>{{ $t("inactive") }}</h3>
                                <span class="num inactive">{{ inactiveNum }}</span>
                            </div>
                            <div class="col">
                                <h3>Updates</h3>
                                <span class="num updates">{{ updateNum }}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Docker Run -->
                    <h2 class="mb-3">{{ $t("Docker Run") }}</h2>
                    <div class="mb-3">
                        <textarea id="name" v-model="dockerRunCommand" type="text" class="form-control docker-run shadow-box" required placeholder="docker run ..."></textarea>
                    </div>

                    <button class="btn-normal btn mb-4" @click="convertDockerRun">{{ $t("Convert to Compose") }}</button>

                    <h2 class="mb-3">Maintenance</h2>
                    <div class="shadow-box mb-4 maintenance-card">
                        <div class="maintenance-actions">
                            <button class="btn-normal btn" :disabled="checkingUpdates" @click="checkAllUpdates">
                                {{ checkingUpdates ? "Checking..." : "Check image updates" }}
                            </button>
                            <router-link class="btn btn-outline-normal" to="/settings">Configure schedule & notifications</router-link>
                        </div>
                        <p class="mb-0 text-muted">Track image updates, use stack tags for filtering, and wire backup hooks plus ntfy, Gotify, Telegram, Discord, or generic webhooks from settings.</p>
                    </div>
                </div>
            </div>
        </div>
    </transition>
    <router-view ref="child" />
</template>

<script>
import { statusNameShort } from "../../../shared/utils";
import { trpc } from "../trpc";

export default {
    components: {

    },
    props: {
        calculatedHeight: {
            type: Number,
            default: 0
        }
    },
    data() {
        return {
            page: 1,
            perPage: 25,
            initialPerPage: 25,
            paginationConfig: {
                hideCount: true,
                chunksNavigation: "scroll",
            },
            importantHeartBeatListLength: 0,
            displayedRecords: [],
            dockerRunCommand: "",
            checkingUpdates: false,
        };
    },

    computed: {
        activeNum() {
            return this.getStatusNum("active");
        },
        inactiveNum() {
            return this.getStatusNum("inactive");
        },
        exitedNum() {
            return this.getStatusNum("exited");
        },
        updateNum() {
            return Object.values(this.$root.completeStackList).filter(stack => (stack.updatesAvailable?.length ?? 0) > 0).length;
        },
    },

    watch: {
        perPage() {
            this.$nextTick(() => {
                this.getImportantHeartbeatListPaged();
            });
        },

        page() {
            this.getImportantHeartbeatListPaged();
        },
    },

    mounted() {
        this.initialPerPage = this.perPage;

        window.addEventListener("resize", this.updatePerPage);
        this.updatePerPage();
    },

    beforeUnmount() {
        window.removeEventListener("resize", this.updatePerPage);
    },

    methods: {

        getStatusNum(statusName) {
            let num = 0;

            for (let stackName in this.$root.completeStackList) {
                const stack = this.$root.completeStackList[stackName];
                if (statusNameShort(stack.status) === statusName) {
                    num += 1;
                }
            }
            return num;
        },

        async checkAllUpdates() {
            this.checkingUpdates = true;
            try {
                const stacks = Object.values(this.$root.completeStackList).filter(stack => stack.isManagedBySilo);
                for (const stack of stacks) {
                    await new Promise((resolve) => {
                        this.$root.getSocket().emit("checkStackUpdates", stack.name, () => resolve());
                    });
                }
                this.$root.toastSuccess("Update check complete");
            } finally {
                this.checkingUpdates = false;
            }
        },

        async convertDockerRun() {
            if (this.dockerRunCommand.trim() === "docker run") {
                throw new Error("Please enter a docker run command");
            }

            try {
                const result = await trpc.compose.fromDockerRun.mutate({ command: this.dockerRunCommand });
                this.$root.composeTemplate = result.composeTemplate;
                this.$router.push("/compose");
            } catch (error) {
                this.$root.toastError(error instanceof Error ? error.message : "Conversion failed");
            }
        },

        /**
         * Updates the displayed records when a new important heartbeat arrives.
         * @param {object} heartbeat - The heartbeat object received.
         * @returns {void}
         */
        onNewImportantHeartbeat(heartbeat) {
            if (this.page === 1) {
                this.displayedRecords.unshift(heartbeat);
                if (this.displayedRecords.length > this.perPage) {
                    this.displayedRecords.pop();
                }
                this.importantHeartBeatListLength += 1;
            }
        },

        /**
         * Retrieves the length of the important heartbeat list for all monitors.
         * @returns {void}
         */
        getImportantHeartbeatListLength() {
            this.$root.getSocket().emit("monitorImportantHeartbeatListCount", null, (res) => {
                if (res.ok) {
                    this.importantHeartBeatListLength = res.count;
                    this.getImportantHeartbeatListPaged();
                }
            });
        },

        /**
         * Retrieves the important heartbeat list for the current page.
         * @returns {void}
         */
        getImportantHeartbeatListPaged() {
            const offset = (this.page - 1) * this.perPage;
            this.$root.getSocket().emit("monitorImportantHeartbeatListPaged", null, offset, this.perPage, (res) => {
                if (res.ok) {
                    this.displayedRecords = res.data;
                }
            });
        },

        /**
         * Updates the number of items shown per page based on the available height.
         * @returns {void}
         */
        updatePerPage() {
            const tableContainer = this.$refs.tableContainer;
            const tableContainerHeight = tableContainer.offsetHeight;
            const availableHeight = window.innerHeight - tableContainerHeight;
            const additionalPerPage = Math.floor(availableHeight / 58);

            if (additionalPerPage > 0) {
                this.perPage = Math.max(this.initialPerPage, this.perPage + additionalPerPage);
            } else {
                this.perPage = this.initialPerPage;
            }

        },
    }
};
</script>

<style scoped>

.maintenance-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-bottom: 12px;
}

.num {
    font-size: 30px;

    font-weight: bold;
    display: block;

    &.active {
        color: #74c2ff;
    }

    &.exited {
        color: #dc3545;
    }
    &.updates {
        color: #ffc107;
    }
}

.shadow-box {
    padding: 20px;
}

table {
    font-size: 14px;

    tr {
        transition: all ease-in-out 0.2ms;
    }

    @media (max-width: 550px) {
        table-layout: fixed;
        overflow-wrap: break-word;
    }
}

.docker-run {
    border: none;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 15px;
}

.first-row .shadow-box {

}

.home-dashboard > h1 {
    letter-spacing: -0.025em;
}

.stats-card .row {
    margin: 0;
}

.stats-card .col {
    position: relative;
    padding: 10px 14px;
}

.stats-card .col + .col::before {
    content: "";
    position: absolute;
    top: 15%;
    bottom: 15%;
    left: 0;
    width: 1px;
    background: var(--border);
}

.stats-card h3 {
    color: var(--text-muted);
    font-size: 12px;
    font-weight: 700;
    letter-spacing: .08em;
    text-transform: uppercase;
}

.docker-run {
    min-height: 148px;
    resize: vertical;
}

</style>
