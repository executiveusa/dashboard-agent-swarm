---
mode: 'agent'
description: 'Add Ralphy autonomous coding loop to any agent repository with config, scripts, and docs.'
---

Add Ralphy end-to-end integration to this repo.

Requirements:
1. Ensure `.ralphy/config.yaml` exists with:
   - project metadata
   - lint/test/build commands
   - boundaries for env/secrets and protected identity files
2. Add scripts:
   - `scripts/ralphy-loop.ps1`
   - `scripts/ralphy-loop.sh`
3. Update `package.json` scripts with:
   - `ralphy:init`
   - `ralphy:config`
   - `ralphy:loop`
4. Update `README.md` with a short "Ralphy Loop" section:
   - install
   - init
   - run PRD mode
   - run single-task mode
5. Keep edits minimal and avoid touching unrelated files.

Validation:
- `npm run ralphy:config` should print config if CLI is installed.
- Return a concise change summary with file paths.
