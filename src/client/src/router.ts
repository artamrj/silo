import { createRouter, createWebHistory } from "vue-router";

// Only the shell is loaded eagerly; every page is code-split.
import Layout from "./layouts/Layout.vue";

const Dashboard = () => import("./pages/Dashboard.vue");
const DashboardHome = () => import("./pages/DashboardHome.vue");
const Setup = () => import("./pages/Setup.vue");
const Console = () => import("./pages/Console.vue");
const Stacks = () => import("./pages/Stacks.vue");
const Compose = () => import("./pages/Compose.vue");
const ContainerTerminal = () => import("./pages/ContainerTerminal.vue");
const Settings = () => import("./pages/Settings.vue");

// Settings - Sub Pages
const Appearance = () => import("./components/settings/Appearance.vue");
const General = () => import("./components/settings/General.vue");
const Security = () => import("./components/settings/Security.vue");
const GlobalEnv = () => import("./components/settings/GlobalEnv.vue");
const About = () => import("./components/settings/About.vue");

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
                        children: [
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
                        ]
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
                        path: "/settings",
                        component: Settings,
                        children: [
                            {
                                path: "general",
                                component: General,
                            },
                            {
                                path: "appearance",
                                component: Appearance,
                            },
                            {
                                path: "security",
                                component: Security,
                            },
                            {
                                path: "globalEnv",
                                component: GlobalEnv,
                            },
                            {
                                path: "about",
                                component: About,
                            },
                        ]
                    },
                ]
            },
        ]
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
