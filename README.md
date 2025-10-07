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

## Workflow scheduling & history

- Supabase Edge function `/workflows/poller` discovers YAML workflows in `packages/shared/workflows`, respects the concurrency limits declared in each file, and enqueues executions through `/workflows/supabase` so that runs and steps are captured in the new `workflow_runs` and `workflow_steps` tables.
- Provision a Lovable cron job that hits `https://<your-project-ref>.functions.supabase.co/workflows/poller` every minute with a small JSON body (e.g. `{ "dryRun": false }`) to keep scheduled and cron-based definitions current.
- Provision a Coolify background job (or task) to call the same endpoint inside your private network if you run the Edge bundle there; for authentication, use a dedicated secret (distinct from the Supabase service role key), signed webhook verification, or require a service-role JWT issued server-side to the job and validate the claims in the function. **Do not send the Supabase service role key over the network.**
- The Vite dashboard Tasks page and the Next.js console now include a "Workflow History" panel so operators can review previous runs, drill into step failures, and click artifact links stored in Supabase Storage. Retry actions call the Supabase function directly for safe replays.
