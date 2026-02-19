# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [1.0.0] - 2026-02-16

### Added
- **Pauli Effect Fleet Integration** — Branded as `DRY-004` in the 17-agent fleet
- **AGENTS.md** — Master fleet hierarchy with Ralphy process, flywheel integration, voice stack, Docker deployment
- **Dockerfile** — Multi-stage build for production deployment
- **docker-compose.yml** — Coolify-ready orchestration with health checks
- **Deploy buttons** — 1-click deploy to Vercel, Cloudflare, and Docker in README
- **Ralphy process** — Hardcoded requirement for large feature changes via `ralphy-cli`
- **ACFS Flywheel mapping** — 11 tools mapped to agent fleet roles
- **Voice Agent Stack** — 4 voice repos documented (voice-agents-fork, phone-call-assistant, VisionClaw, voice-web-architect)

### Changed
- **README.md** — Updated with animated "Built by The Pauli Effect" branding, codename badges, deploy buttons
- **Agent hierarchy** — Added Caller (CLR-010) and Architect (ARC-011) to codename registry
- **Critical repos table** — Added phone-call-assistant, VisionClaw, voice-web-architect

### Security
- Full security audit completed across all 8 repos
- All stale branches cleaned (11 deleted)
- npm audit fixes applied
- .gitignore verified across all repos
