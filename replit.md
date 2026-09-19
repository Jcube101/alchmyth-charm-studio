# Replit setup

## Run locally

Install the locked dependencies and start the development server:

```sh
bun install --frozen-lockfile
bun run dev --host 0.0.0.0 --port 5000
```

The configured Replit workflow is **Start application** and runs the same command on port 5000.

## Checks

Build the production output with:

```sh
bun run build
```

This project is a front-end-only React/TanStack Start storefront. It does not currently require a database, backend service, or additional secrets.