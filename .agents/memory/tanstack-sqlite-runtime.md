---
name: TanStack SQLite runtime
description: Runtime constraint for local SQLite in this TanStack Start project.
---

TanStack Start server-route handlers in Vite development run through a Node worker even when the outer workflow command is launched with Bun. Do not use `bun:sqlite` in route-handler dependencies.

**Why:** `bun:sqlite` built successfully but failed at runtime with Node's unsupported `bun:` URL scheme when an API route loaded.

**How to apply:** Use a Node-compatible SQLite driver and a Node server production preset for features that persist data locally.