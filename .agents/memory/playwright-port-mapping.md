---
name: Playwright temporary port mapping
description: Replit workflow configuration side effect caused by local Playwright web servers.
---

Playwright runs that start a local web server on a secondary port can automatically add that port to `.replit`.

**Why:** The temporary E2E server port was registered as a workspace port even though it is not an application workflow, leaving unrelated configuration drift after otherwise clean test runs.

**How to apply:** After browser tests, check `.replit` for newly generated secondary-port mappings and restore the file through Replit's schema-validated replacement flow. Keep only ports used by real workflows.