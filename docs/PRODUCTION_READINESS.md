# Production-readiness handoff

## Target profile

LocalChat 2.0 is designed as a production-oriented, single-user local desktop web application. It is safe by default for loopback use and is structured for maintainable development. It is not positioned as a public multi-user SaaS service.

## Completed controls

| Area | Implemented control |
| --- | --- |
| Configuration | Environment-based settings; no developer-specific paths |
| Startup | App remains usable when no model is installed or loaded |
| Model safety | GGUF-only discovery and traversal-safe path resolution |
| Inference | llama.cpp chat templates, multi-turn context, SSE streaming, cancellation, and a generation lock |
| API | Versioned routes, strict schemas, bounded message inputs, safe errors, and generated OpenAPI docs |
| Network | Loopback binding by default and explicit development CORS origins |
| Browser security | No remote analytics/fonts, safe Markdown defaults, security headers, and local browser storage |
| UX | Guided setup, status visibility, responsive layout, history, Copy, Stop, Regenerate, and starter prompts |
| Delivery | One-server production build, Windows/macOS/Linux launchers, Docker support, and CI workflow |
| Quality | Backend API/service tests, frontend component tests, strict TypeScript, ESLint, Ruff, and dependency audit |

## Verified in this release

- 11 backend tests pass.
- 2 frontend component tests pass.
- The TypeScript/Vite production build passes.
- ESLint and Ruff checks pass.
- The production JavaScript dependency audit reports zero known vulnerabilities.
- A live local integration check verifies the app shell, health response, empty model list, safe 409 chat response, request ID, and `nosniff` header.

## Validation still required with a real model

A GGUF model was not present in the original archive and is intentionally not bundled in this release. Before declaring a particular hardware/model combination production-ready, record:

1. Model name, quantization, source, checksum, and license.
2. Cold-load time, first-token latency, tokens per second, memory peak, and a 30-minute soak test.
3. Context-limit behavior and representative English/Chinese answer-quality checks.
4. CPU/GPU layer settings for each supported hardware profile.
5. Cancellation behavior during long outputs and recovery after a failed model load.

## Before exposing beyond one computer

Add authentication, TLS, per-user authorization, rate limits, server-side conversation storage, audit logging, and a reverse proxy. Review model licenses and create signed installers if distributing to non-technical users. Do not change `LOCALCHAT_HOST` from `127.0.0.1` on an untrusted network without those controls.
