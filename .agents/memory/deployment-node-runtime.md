---
name: Self-contained Node deployment runtime
description: Why this project pins a Node executable dependency for Autoscale startup.
---

Use the Node executable installed as a project dependency for the production server, while continuing to install dependencies and build with Bun.

**Why:** Replit Autoscale deployment hooks did not expose global `node` or `npm` even when a Node module was declared. Running the generated TanStack SSR bundle directly with Bun also failed because Bun rejected valid labeled control-flow syntax in the generated React server code.

**How to apply:** Keep the production build on Bun and invoke the project-local Node binary for the generated Nitro server. If changing runtime or dependency installation, verify the exact production command locally and confirm `/` returns HTTP 200 before publishing.