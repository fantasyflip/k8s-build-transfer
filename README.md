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
| `node-version` | no | `18` | **Deprecated** — no longer used; kept for backward compatibility |

## Repository structure

```
your-repo/
├── Dockerfile
└── deployment/
    ├── ingress.json
    └── pod/
        ├── deployment.json
        └── service.yaml
```

`deployment.json` must be JSON, not YAML.

## Usage

Use an **ARM64 runner** for native builds (recommended). QEMU emulation on x86 is only used as a fallback when `runner.arch != 'ARM64'`.

```yaml
name: Dockerize and Push to Infra-Repo
on:
  push:
    branches:
      - main

jobs:
  build:
    runs-on: ubuntu-24.04-arm
    steps:
      - name: Use Dockerize and Push to Infra-Repo Action
        uses: fantasyflip/k8s-build-transfer@v1.3.0
        with:
          infra-repo: "your-org/infra-repo"
          gh-token: ${{ secrets.GH_TOKEN }}
          gh-email: "you@example.com"
          namespace: "production"
          app-name: "your-app"
```

## Pipeline steps (v1.3.0)

1. Checkout source and infra repositories (shallow, `fetch-depth: 1`)
2. Generate image URL (`ghcr.io/{repo}:{branch}-{sha}`)
3. Set up Docker Buildx (QEMU only on non-ARM runners)
4. Start Docker build in **background** (`context: source`)
5. Process ingress (check → diff → merge) **in parallel** with the build
6. Wait for Docker build to complete
7. Patch `deployment.json` with the new image URL
8. Copy pod manifests into infra checkout and **single commit** (ingress + pod)
9. Commit `deployment.json` back to source repo if changed

## Migrating to v1.3.0

### Breaking change: Docker build context

v1.3.0 uses `context: source` instead of `context: .`. Update your `Dockerfile` **before** upgrading:

```dockerfile
# Before (v1.2.x workaround)
COPY source/package.json source/pnpm-lock.yaml ./
COPY source/. .

# After (v1.3.0)
COPY package.json pnpm-lock.yaml ./
COPY . .
```

Your app repo `.dockerignore` will now apply correctly during builds.

### Recommended: ARM64 runner

```yaml
runs-on: ubuntu-24.04-arm
```

On x86 runners (`ubuntu-latest`), ARM64 images are built via QEMU emulation and are significantly slower (especially for Nuxt apps with native modules).

### Optional: pnpm BuildKit cache mount

For faster rebuilds in large apps:

```dockerfile
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile
```

### Consumer repos to update

These fantasyflip apps use `k8s-build-transfer` and should adopt v1.3.0 with the Dockerfile and runner changes above:

- `fantasyflip/fmdb` (updated in v1.3.0 rollout)
- `fantasyflip/carity`
- `fantasyflip/fantasyflip-nuxt`
- `fantasyflip/byflip`
- `fantasyflip/m8m-portfolio`
- `fantasyflip/m8m-admin`
- `fantasyflip/munchcoach`
- `fantasyflip/munchcoach_no-ai`
- `fantasyflip/cheese`
- `fantasyflip/cooler-now`

## Related actions

- [`fantasyflip/k8s-receive-apply`](https://github.com/fantasyflip/k8s-receive-apply): Applies infra-repo commits tagged with `[CI]` to Kubernetes.

## Notes

- The GitHub token must have permission to push to the infra repo and GHCR.
- Infra commits include `[CI][N={namespace}]` tags; new ingress commits also include `[H={hostname}]`.
- v1.3.0 consolidates infra pushes into a single commit (ingress + pod), reducing duplicate `k8s-receive-apply` runs.
