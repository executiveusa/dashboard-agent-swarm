# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/93ccd06b-8bfa-45f2-b469-eceaf3d8ef32

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/93ccd06b-8bfa-45f2-b469-eceaf3d8ef32) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/93ccd06b-8bfa-45f2-b469-eceaf3d8ef32) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

## Windows desktop build & runtime

The repository ships with an Electron-based desktop shell that loads the existing React UI, exposes file-system helpers for local agents, and proxies API calls to a Lovable backend.

### Prerequisites

Install the following on Windows before building:

- **Node.js 18+** (the project is tested with Node 22 via nvm).
- **npm** (bundled with Node.js) or an alternative package manager compatible with `package-lock.json`.
- **Microsoft Visual Studio Build Tools 2019+** with the Desktop development with C++ workload (required by native Node modules bundled via Electron Builder).
- **Git** for cloning and version control.

Optional but recommended:

- **Windows 10/11 SDK** for full desktop integration.
- **SignTool** (part of the Windows SDK) or your chosen code-signing utility.

### Environment configuration

The desktop runtime can forward API calls through a lightweight proxy. Configure these environment variables before running or packaging:

- `LOVABLE_BACKEND_URL` – Base URL for your hosted Lovable backend (defaults to `https://lovable.dev`).
- `DESKTOP_PROXY_PORT` – Local port exposed by the proxy (defaults to `48888`). Point any API base URLs (e.g., Supabase) used by the renderer at `http://127.0.0.1:<port>` when you need to inspect or tunnel requests.
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and other frontend environment values required by the existing web build.

### Development workflow

```powershell
# Install dependencies
echo "Installing dependencies"
npm install

# Run the renderer + desktop shell together
npm run desktop:dev
```

The `desktop:dev` script starts Vite and then launches Electron once the dev server is reachable. Inside Electron the renderer can interact with the `window.desktopAgent` bridge to access workspace selection and text file helpers.

### Packaging a Windows executable

```powershell
# Build the Vite renderer and compile the Electron main/preload bundle
npm run desktop:build

# Produce a signed installer or portable EXE (unsigned by default)
npm run desktop:package:win
```

Electron Builder generates output under `out/desktop`. By default the NSIS installer is unsigned. To distribute safely on Windows:

1. Acquire a **code-signing certificate** from a trusted CA (EV certificates reduce SmartScreen warnings).
2. Configure the certificate for Electron Builder by setting environment variables before running the packaging command:
   - `CSC_LINK` – HTTPS link or file path to the PFX/PKCS12 certificate bundle.
   - `CSC_KEY_PASSWORD` – Password for the certificate bundle (if set).
3. Re-run `npm run desktop:package:win`. Electron Builder signs the binaries during packaging.

For enterprise or private distribution you can also sign the generated binaries manually using `signtool.exe`:

```powershell
signtool sign /fd SHA256 /a /t http://timestamp.digicert.com "out/desktop/Dashboard Agent Swarm-<version>-Setup.exe"
```

### Running the packaged app locally

Double-click the generated installer to install the desktop agent UI. The proxy server embedded in the Electron main process starts automatically, so the renderer can continue to call the Lovable backend using the configured environment variables.

