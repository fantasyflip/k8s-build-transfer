# Dockerize and Push to Infra-Repo GitHub Action

Dockerize an application and push Kubernetes manifests to an infrastructure repository.

## Description

This action automates:

1. Building an **ARM64** Docker image and pushing it to **GHCR** (`ghcr.io/{repo}:{branch}-{sha}`)
2. Patching `deployment.json` in the app repo with the new image URL (`[skip ci]`)
3. Copying pod manifests to the infra repo
4. Managing **namespace-level shared ingress** — merges new rules into `namespace/{namespace}/ingress.json`

## Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `infra-repo` | yes | — | Repository to push Kubernetes files to |
| `gh-token` | yes | — | GitHub token for checkout and push |
| `gh-email` | yes | — | Git email for infra/source commits |
| `namespace` | yes | — | Kubernetes namespace |
| `app-name` | yes | — | Application folder name in infra repo |
| `source-repo` | no | `${{ github.repository }}` | Source application repository |
| `gh-username` | no | `${{ github.actor }}` | Git author name for commits |
| `source-branch` | no | `main` | Branch to build from |
| `infra-branch` | no | `main` | Infra repo branch to read/write |
| `deployment-path` | no | `deployment` | Path to deployment files in source repo |
| `mode` | no | `full` | `full`, `build` or `transfer` — see [Parallel build](#parallel-build-with-tests) |
| `cache-backend` | no | `gha` | BuildKit layer cache: `gha`, `registry` (`ghcr.io/{repo}:buildcache`) or `none` |
| `cache-mode` | no | `max` | `max` caches all stages (incl. dependency install), `min` only the final image |
| `cache-mounts` | no | `auto` | Persist `RUN --mount=type=cache` dirs between runs: `auto`, `true`, `false` |
| `node-version` | no | `18` | **Deprecated** — no longer used; kept for backward compatibility |

## Outputs

| Output | Description |
|--------|-------------|
| `image-url` | Image reference built (`full`/`build`) or verified (`transfer`) |

## Repository structure

```
your-repo/
├── Dockerfile
├── .dockerignore
└── deployment/
    ├── ingress.json
    └── pod/
        ├── deployment.json
        └── service.yaml
```

`deployment.json` must be JSON, not YAML.

## Usage

```yaml
name: Dockerize and Push to Infra-Repo
on:
  push:
    branches:
      - main

concurrency:
  group: deploy-${{ github.ref }}
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: fantasyflip/k8s-build-transfer@v1.4.0
        with:
          infra-repo: "your-org/infra-repo"
          gh-token: ${{ secrets.GH_TOKEN }}
          gh-email: "you@example.com"
          namespace: "production"
          app-name: "your-app"
```

### Parallel build with tests

With `mode`, the image build runs alongside your tests, and only the infra transfer waits for them. Both jobs compute the same image tag from the commit SHA. `transfer` fails if that image was not pushed.

```yaml
jobs:
  tests:
    uses: ./.github/workflows/tests.yml
    secrets: inherit

  build:
    runs-on: ubuntu-latest
    steps:
      - uses: fantasyflip/k8s-build-transfer@v1.4.0
        with:
          mode: build
          infra-repo: "your-org/infra-repo"
          gh-token: ${{ secrets.GH_TOKEN }}
          gh-email: "you@example.com"
          namespace: "production"
          app-name: "your-app"

  transfer:
    needs: [tests, build]
    runs-on: ubuntu-latest
    steps:
      - uses: fantasyflip/k8s-build-transfer@v1.4.0
        with:
          mode: transfer
          infra-repo: "your-org/infra-repo"
          gh-token: ${{ secrets.GH_TOKEN }}
          gh-email: "you@example.com"
          namespace: "production"
          app-name: "your-app"
```

A failed test run then leaves an unused image in GHCR but never touches the infra repo.

## Fast builds: Dockerfile template

Most of the build time used to be the Nuxt build running under QEMU arm64 emulation on x86 runners (7–10 min per app). [`templates/Dockerfile.nuxt`](templates/Dockerfile.nuxt) runs the build on the runner's native arch with `FROM --platform=$BUILDPLATFORM` and only targets `linux/arm64` in the small runtime stage. `.output` is plain JavaScript, so it runs on either arch.

Copy these into the app repo:

- [`templates/Dockerfile.nuxt`](templates/Dockerfile.nuxt) → `Dockerfile`
- [`templates/nuxt.dockerignore`](templates/nuxt.dockerignore) → `.dockerignore`

The template:

- needs `packageManager` in `package.json` (pnpm is pinned through Corepack)
- uses a `pnpm-store` cache mount, which this action persists between runs (`cache-mounts: auto`)
- has an optional section for native modules (e.g. `sharp`). Packages that ship prebuilt binaries are installed for the target arch without emulation. Packages that compile in an install script (e.g. `better-sqlite3`) must be rebuilt in the runtime stage, which still runs under QEMU but only compiles one package.

ARM64 runners (`ubuntu-24.04-arm`) also work and skip QEMU entirely, but may not be available for private repositories.

## Caching

- **Layer cache** (`cache-backend`): `gha` stores BuildKit layers in the GitHub Actions cache (10 GB per repo, free). `registry` pushes them to `ghcr.io/{repo}:buildcache`, which is often faster to restore but counts against GHCR storage for private packages. Cache errors never fail the build.
- **Cache mounts** (`cache-mounts`): directories from `RUN --mount=type=cache` (e.g. the pnpm store) are saved to the Actions cache, keyed by the lockfile. This speeds up `pnpm install` when the lockfile changes. When it doesn't change, the cached install layer is reused and nothing new is saved.

## Pipeline steps

1. Checkout source and infra repositories (shallow, `fetch-depth: 1`). The infra repo is skipped in `build` mode.
2. Generate the image URL (`ghcr.io/{repo}:{branch}-{sha}`)
3. Set up Buildx, QEMU (x86 runners only), layer cache and cache mounts
4. Build and push the image. In `full` mode it runs in the **background** while ingress is processed. `transfer` mode only verifies that the image exists.
5. Process ingress (check → diff → merge)
6. Wait for the build, then patch `deployment.json` with the new image URL
7. Copy pod manifests into the infra checkout and make a **single commit** (ingress + pod)
8. Commit `deployment.json` back to the source repo if it changed

## Migrating from v1.2.x

### Breaking change: Docker build context

Since v1.3.0 the build context is `source` instead of `.`. Update your `Dockerfile` **before** upgrading, or start from the template:

```dockerfile
# Before (v1.2.x)
COPY source/package.json source/pnpm-lock.yaml ./
COPY source/. .

# After (v1.3.0+)
COPY package.json pnpm-lock.yaml ./
COPY . .
```

Your app repo `.dockerignore` now applies to the build.

### Consumer repos to update

- `fantasyflip/fmdb`
- `fantasyflip/carity`
- `fantasyflip/fantasyflip-nuxt`
- `fantasyflip/byflip`
- `fantasyflip/m8m-portfolio`
- `fantasyflip/m8m-admin`
- `fantasyflip/listify-nuxt`
- `fantasyflip/cooler-now`

## Related actions

- [`fantasyflip/k8s-receive-apply`](https://github.com/fantasyflip/k8s-receive-apply): Applies infra-repo commits tagged with `[CI]` to Kubernetes.

## Notes

- The GitHub token must have permission to push to the infra repo and GHCR.
- Infra commits include `[CI][N={namespace}]` tags; new ingress commits also include `[H={hostname}]`.
- Infra pushes are a single commit (ingress + pod), so each deploy triggers one `k8s-receive-apply` run.
