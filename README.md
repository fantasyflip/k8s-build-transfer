# Dockerize and Push to Infra-Repo GitHub Action

🚀 **Dockerize and push to Infra-Repo**  
A GitHub Action to Dockerize an application and push Kubernetes files to an infrastructure repository.

📄 **Description**  
This action automates the process of dockerizing an application and pushing the relevant Kubernetes deployment files to a specified infrastructure repository.

## ⚙️ Inputs

- **`node-version`** (required): Node-Version for `actions/setup-node@v3`
- **`infra-repo`** (required): Repository to push Kubernetes-files to
- **`source-repo`** (optional, default: `${{ github.repository }}`): Repository to pull application from
- **`gh-token`** (required): GitHub Token for pushing and pulling to/from Infra-Repo
- **`source-branch`** (optional, default: `"main"`): Branch to pull application from
- **`infra-branch`** (optional, default: `"main"`): Branch to pull and push Kubernetes-files from/to
- **`namespace`** (required): Namespace for Kubernetes-files
- **`app-name`** (required): Name of the application for the Infra-Repo
- **`deployment-path`** (optional, default: `"deployment"`): Path to the deployment files in the source repository

## 📂 Repository Structure Requirements

Ensure the following structure in your source repository:

- **Dockerfile**: A `Dockerfile` must be present in the root of the repository.
- **Deployment folder**: A folder named `deployment` containing:
  - `ingress.json`
  - A subfolder named `pod` with:
    - `deployment.yaml`
    - `service.yaml`

Example structure:

```
your-repo/
│
├── Dockerfile
└── deployment/
    ├── ingress.json
    └── pod/
        ├── deployment.yaml
        └── service.yaml
```

## 🛠️ Usage

```yaml
name: Dockerize and Push to Infra-Repo
on:
  push:
    branches:
      - main

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Use Dockerize and Push to Infra-Repo Action
        uses: fantasyflip/k8s-build-transfer@v1
        with:
          node-version: 18
          infra-repo: "your-org/infra-repo"
          gh-token: ${{ secrets.GITHUB_TOKEN }}
          namespace: "default"
          app-name: "your-app"
```

## 📋 Steps

1. **Display inputs**: Logs the provided inputs.
2. **Setup Node.js**: Uses `actions/setup-node@v3` to set up Node.js.
3. **Checkout repositories**:
   - Action repository
   - Source repository (if provided)
   - Infra repository
4. **Install dependencies**: Runs `npm install`.
5. **Run custom action**: Executes `checkIngress` action with the provided inputs.
6. **Check Ingress files**: Determines if the Ingress files are identical.
7. **Merge Ingress ruleset**: Merges Ingress rules if needed.
8. **Check for changes**: Verifies if changes were made to the Ingress file.
9. **Generate commit message**: Creates a commit message based on changes.
10. **Commit and push changes**: Pushes changes to the Infra-Repo if there are any.
11. **Generate image URL**: Creates a Docker image URL.
12. **Setup QEMU**: Uses `docker/setup-qemu-action@v3` for multi-platform builds.
13. **Setup Docker Buildx**: Sets up Docker Buildx for building images.
14. **Login to GitHub Container Registry**: Authenticates with GitHub Container Registry.
15. **Build and push Docker image**: Builds and pushes the Docker image.
16. **Update k8s deployment image**: Updates the Kubernetes deployment file with the new image URL.
17. **Push deployment files**: Uses `datalbry/copy_folder_to_another_repo_action@1.0.0` to push the deployment files to the Infra-Repo.

## 🌐 Example

```yaml
name: CI/CD Pipeline
on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v3

      - name: Dockerize and Push
        uses: fantasyflip/k8s-build-transfer@v1
        with:
          node-version: 18
          infra-repo: "your-org/infra-repo"
          gh-token: ${{ secrets.GITHUB_TOKEN }}
          namespace: "production"
          app-name: "your-app"
          deployment-path: "deployment"
```

## 🔄 Related Actions

- [**`fantasyflip/k8s-receive-apply`**](https://github.com/fantasyflip/k8s-receive-apply): This action reacts to the commits made by this GitHub action to the infra-repo and applies the changes to Kubernetes. It can also manage Cloudflare DNS entries if needed.

## 📝 Notes

- Ensure that the GitHub token provided has the necessary permissions to push to the Infra-Repo.

Feel free to customize the inputs and steps according to your specific requirements!
