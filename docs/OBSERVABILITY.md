# Observability

Metrics, distributed tracing and alerting for the Kids Card platform.

## What's wired

```
[8 Spring Boot services]
  │  /actuator/prometheus  (metrics)        │  OTLP  (traces)
  ▼                                          ▼
[Prometheus] ── scrape every 15s         [Tempo] ── stores traces
  │  alert rules                              ▲
  ▼                                           │
[Grafana] ──────────── dashboards ───────────┘
   http://localhost:3001  (anonymous viewer enabled)
```

- **Metrics** — every service exposes Micrometer metrics at `/actuator/prometheus`.
  Prometheus scrapes all 8 and evaluates alert rules.
- **Tracing** — Micrometer Tracing + OTLP exporter send spans to Tempo. Trace
  context (`traceparent`) propagates across the synchronous inter-service
  `RestTemplate` calls and across Kafka (producer/consumer observation enabled),
  so a single request is stitched into one end-to-end trace.
- **Dashboards** — `Kids Card · Обзор системы` (throughput, p95 latency, 5xx
  rate, JVM heap, circuit breakers, ledger reconciliation), auto-provisioned.
- **Alerts** — service down, high 5xx rate, p95 > 300 ms, circuit breaker open,
  and ledger-reconciliation discrepancy.

## Run it

```bash
docker compose -f docker-compose.local.yml up --build
```

Then open:
- **Grafana**   → http://localhost:3001  (dashboard auto-loaded)
- **Prometheus** → http://localhost:9090  (targets, alerts, ad-hoc queries)

## Key metrics

| Metric | What it tells you |
|--------|-------------------|
| `http_server_requests_seconds_*` | request rate, latency (p50/p95/p99), 5xx ratio per service |
| `resilience4j_circuitbreaker_state` | breaker open/closed per downstream (`payment` / `family` / `auth`) |
| `resilience4j_retry_calls_total` | retried vs failed-after-retry inter-service calls |
| `payment_reconciliation_unbalanced_transactions` | ledger postings that don't net to zero (should be 0) |
| `payment_reconciliation_negative_accounts` | user accounts with a negative balance (should be 0) |
| `payment_reconciliation_systemwide_net` | net of the whole ledger (should be 0) |
| `jvm_memory_used_bytes`, `jvm_gc_*` | JVM health per service |

## Configuration

Tracing export and sampling are driven by environment variables (set in
`docker-compose.local.yml` via the shared `x-service-env` anchor):

| Env var | Default | Purpose |
|---------|---------|---------|
| `MANAGEMENT_OTLP_TRACING_ENDPOINT` | — | where to ship spans (Tempo OTLP/HTTP) |
| `MANAGEMENT_TRACING_SAMPLING_PROBABILITY` | `1.0` | fraction of requests traced (lower in prod) |
| `SPRING_KAFKA_TEMPLATE_OBSERVATION_ENABLED` | `true` | trace Kafka producers |
| `SPRING_KAFKA_LISTENER_OBSERVATION_ENABLED` | `true` | trace Kafka consumers |

Without an OTLP endpoint set (e.g. running a single service from the IDE),
tracing simply no-ops — metrics still work.

## Production note

For prod, mirror the three services (`prometheus`, `grafana`, `tempo`) and the
four env vars into `docker-compose.prod.yml`, lower the sampling probability
(e.g. `0.1`), and front Grafana with auth. Not deployed yet — ships on the next
`деплой`.
