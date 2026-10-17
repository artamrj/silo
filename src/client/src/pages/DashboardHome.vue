<template>
    <transition name="slide-fade" appear>
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
                        </div>
                    </div>

                    <!-- Docker Run -->
                    <h2 class="mb-3">{{ $t("Docker Run") }}</h2>
                    <div class="mb-3">
                        <textarea id="name" v-model="dockerRunCommand" type="text" class="form-control docker-run shadow-box" required placeholder="docker run ..."></textarea>
                    </div>

                    <button class="btn-normal btn mb-4" @click="convertDockerRun">{{ $t("Convert to Compose") }}</button>
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
            dockerRunCommand: "",
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
    }
};
</script>

<style scoped>

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
