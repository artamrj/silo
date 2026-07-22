import { Counter, Gauge, Histogram, Registry, collectDefaultMetrics } from "prom-client";

export const metricsRegistry = new Registry();
collectDefaultMetrics({ register: metricsRegistry,
    prefix: "silo_" });

export const httpRequestDuration = new Histogram({
    name: "silo_http_request_duration_seconds",
    help: "HTTP request duration in seconds",
    labelNames: [ "method", "route", "status_code" ] as const,
    buckets: [ 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5 ],
    registers: [ metricsRegistry ],
});

export const socketConnections = new Gauge({
    name: "silo_socket_connections",
    help: "Current Socket.IO connections",
    registers: [ metricsRegistry ],
});

export const socketConnectionErrors = new Counter({
    name: "silo_socket_connection_errors_total",
    help: "Rejected Socket.IO connection attempts",
    registers: [ metricsRegistry ],
});
