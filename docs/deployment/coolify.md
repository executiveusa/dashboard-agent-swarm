# Coolify Deployment Guide

This guide walks through deploying the Lovable Cloud stack to Contabo using Coolify. It covers server provisioning, container images, persistent model volumes, and TLS/ingress configuration. The stack is defined in [`docker-compose.yml`](../../docker-compose.yml) and the container build automation lives in [`.github/workflows/containers.yml`](../../.github/workflows/containers.yml).

## 1. Provision a Contabo Host

1. **Choose a VPS** – The edge runtime and model workloads need CPU and memory. A Contabo VPS S with at least 4 vCPU / 8 GB RAM is a good starting point; upgrade if you plan to host multiple large language models.
2. **Install the base tooling**
   ```bash
   sudo apt update && sudo apt install -y curl git jq
   curl -fsSL https://get.docker.com | sudo sh
   sudo usermod -aG docker $USER
   curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
   ```
   Reboot (or log out/in) so the user gains Docker privileges, then finish the Coolify onboarding at `https://<server-ip>:8000`.
3. **Open firewall ports** – Allow inbound 80/443 for TLS traffic and 22 for SSH. If you expose Ollama/LM Studio outside the VPS, open 11434/1234, otherwise keep them internal only.

## 2. Prepare Persistent Volumes

Coolify lets you bind host directories to containers. Create the following persistent folders (or mount network storage) before importing the stack:

| Service   | Host Path                    | Container Path                         | Purpose |
|-----------|-----------------------------|----------------------------------------|---------|
| Postgres  | `/var/lib/coolify/volumes/postgres_data` | `/var/lib/postgresql/data` | Database storage |
| Ollama    | `/var/lib/coolify/volumes/ollama_models` | `/root/.ollama` | Model weights & cache |
| LM Studio | `/var/lib/coolify/volumes/lmstudio_models` | `/root/.cache/lmstudio` | Model cache |

The Compose file already declares named volumes for these mounts. When you create the Coolify resources, map each named volume to the desired host path.

## 3. Import the Compose Stack into Coolify

1. In Coolify, add a new *Docker Compose* application.
2. Point it at the repository and select the `docker-compose.yml` file. Coolify will detect the services:
   - `frontend` (Next.js dashboards)
   - `backend` (Lovable coordination API)
   - `edge` (agent runtime)
   - `local-runner` (Open Interpreter proxy)
   - `postgres`, `nats`, `ollama`, and `lmstudio`
3. Provide the required environment variables. At minimum you must supply:
   - `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`
   - `JWT_SECRET`
   - `DATABASE_URL` if you use an external Postgres instead of the bundled one
   - API keys for any external integrations (OpenRouter, OpenAI, Firecrawl, Vapi, Voiceflow, Rube)
4. Set `EDGE_BASE_URL` for the backend to `http://edge:8787` (Coolify handles internal DNS).
5. If you want Coolify to pull pre-built images from GHCR, set the “Image” field for each service to `ghcr.io/<org>/<repo>-<service>:<tag>` (see Section 5) and disable auto-build.

## 4. Model Runtime Considerations

- **Ollama** – Download models once the container is running: `docker exec -it <ollama-container> ollama pull llama3` and any other local models you require. The persistent volume keeps them across restarts.
- **LM Studio** – The LM Studio container exposes an HTTP API on port 1234. Upload models through the LM Studio UI or pre-populate the mounted cache directory.
- **Local runner** – The `local-runner` service exposes port 3333 inside the network. The edge runtime points to it via `LOCAL_OI_PROXY_URL` so browser/code tool calls can fan out to on-prem resources.

## 5. Container Images & CI/CD

The GitHub Actions workflow [`containers.yml`](../../.github/workflows/containers.yml) builds multi-architecture images for each service and publishes them to GHCR with provenance and SBOM attestation. Tags include the branch name, git SHA, and any git tags. In Coolify you can reference a specific digest or tag (for example `ghcr.io/OWNER/REPO-edge:main`) to pull the signed artifact instead of letting Coolify build locally.

To trigger a manual build, run the workflow dispatch from GitHub’s Actions tab. Ensure the repository’s `GITHUB_TOKEN` retains `packages:write` permissions so the workflow can push to GHCR.

## 6. TLS and Ingress

1. Assign a Contabo *Elastic IP* (or configure DNS A records) that point to the VPS.
2. In Coolify, attach domains to the `frontend`, `backend`, and `edge` services as needed. Coolify will provision Let’s Encrypt certificates automatically—choose “Force HTTPS” to redirect HTTP traffic.
3. If you only need TLS on the public dashboard, expose the `frontend` service with HTTPS and leave internal services (backend, edge) on the private Coolify network. They can still communicate securely.

## 7. Rollback & Disaster Recovery

1. **Image rollback** – From the GitHub Packages page, copy the digest of the previous working image (for example `ghcr.io/OWNER/REPO-edge@sha256:...`). In Coolify edit the service, paste the digest, and redeploy. Because the Compose file pins services by name, other containers keep their configuration.
2. **Data snapshots** – Schedule filesystem snapshots or `pg_dump` exports of the Postgres volume. Store Ollama/LM Studio volumes on block storage (Contabo Object Storage or an attached volume) so you can reattach them to a new VPS if needed.
3. **Decentralized fallback** – You can run the same Compose file on developer laptops or alternate nodes. Use the published images and override environment variables (e.g. `EDGE_BASE_URL`, `DATABASE_URL`) to point at failover infrastructure. Roll forward by re-tagging the desired GHCR image and redeploying via Coolify once the primary site is stable.

With these steps you have an auditable deployment pipeline: Coolify orchestrates the Compose stack, GitHub Actions provides reproducible signed images, and persistent volumes keep model weights and database state safe across upgrades.
