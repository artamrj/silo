import { createRouter, createWebHistory } from "vue-router";

// Only the shell is loaded eagerly; every page is code-split.
import Layout from "./layouts/Layout.vue";

const Dashboard = () => import("./pages/Dashboard.vue");
const DashboardHome = () => import("./pages/DashboardHome.vue");
const Setup = () => import("./pages/Setup.vue");
const Console = () => import("./pages/Console.vue");
const Stacks = () => import("./pages/Stacks.vue");
const Images = () => import("./pages/Images.vue");
const Compose = () => import("./pages/Compose.vue");
const ContainerTerminal = () => import("./pages/ContainerTerminal.vue");
const ControlPanel = () => import("./pages/ControlPanel.vue");

// Control Panel - tabs
const AccountTab = () => import("./components/settings/Account.vue");
const General = () => import("./components/settings/General.vue");
const Security = () => import("./components/settings/Security.vue");
const Environment = () => import("./components/settings/Environment.vue");

const routes = [
    {
        path: "/empty",
        component: Layout,
        children: [
            {
                path: "",
                component: Dashboard,
                children: [
                    {
                        name: "DashboardHome",
                        path: "/",
                        component: DashboardHome,
                    },
                    {
                        path: "/compose",
                        component: Compose,
                    },
                    {
                        path: "/compose/:stackName",
                        component: Compose,
                    },
                    {
                        path: "/terminal/:stackName/:serviceName/:type",
                        component: ContainerTerminal,
                        name: "containerTerminal",
                    },
                    {
                        path: "/console",
                        component: Console,
                    },
                    {
                        path: "/stacks",
                        component: Stacks,
                    },
                    {
                        path: "/images",
                        component: Images,
                    },
                    {
                        path: "/control-panel",
                        component: ControlPanel,
                        children: [
                            {
                                path: "",
                                redirect: "/control-panel/account",
                            },
                            {
                                path: "account",
                                component: AccountTab,
                            },
                            {
                                path: "general",
                                component: General,
                            },
                            {
                                path: "security",
                                component: Security,
                            },
                            {
                                path: "environment",
                                component: Environment,
                            },
                        ]
                    },
                ]
            },
        ]
    },
    // Legacy links: the Settings page was renamed to the Control Panel.
    {
        path: "/settings",
        redirect: "/control-panel/account",
    },
    {
        path: "/settings/globalEnv",
        redirect: "/control-panel/environment",
    },
    {
        path: "/settings/:pathMatch(.*)*",
        redirect: "/control-panel/account",
    },
    {
        path: "/setup",
        component: Setup,
    },
];

export const router = createRouter({
    linkActiveClass: "active",
    history: createWebHistory(),
    routes,
});
