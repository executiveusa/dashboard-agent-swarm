---
name: Cosmos Vault Env
description: Unified secrets loaded from E:\THE PAULI FILES\Cosmos_Vault.env
type: reference
---

# Cosmos Vault

Loaded from `E:\THE PAULI FILES\Cosmos_Vault.env` (15,319 bytes, modified 2026-07-13).

## Key API Providers
- **ANTHROPIC_API_KEY** - Claude API
- **OPENAI_API_KEY** + ALT - OpenAI API
- **OPEN_ROUTER_API** - OpenRouter multi-model
- **DEEPSEEK_API_KEY** - DeepSeek API
- **GROQ_API_KEY** - Groq API
- **GEMINI_API_KEY** - Google Gemini (empty)
- **TELEGRAM_BOT_TOKEN** - Two tokens (8334090984:AAELS-...)

## Infrastructure
- **CLOUDFLARE_ACCOUNT_ID/API_TOKEN** - Cloudflare deployment
- **COOLIFY_URL/TOKENS** - 4 Coolify API tokens + SSH keys
- **VERCEL_API_KEY/TOKEN** - Vercel deployment (3 tokens)
- **SUPABASE_URL/KEYS** - 2 Supabase projects
- **HOSTINGER_API_KEY** - Hostinger VPS

## Agent Tools
- **ELEVEN_LABS_API** - TTS/voice
- **FAL_AI_API** - AI media generation
- **COMPOSIO_API_TOKEN** - Agent orchestration
- **APIFY_API_KEY** - Web scraping
- **FIRECRAWL_API_TOKEN** - Web crawling
- **NOTION_API_TOKEN** - Knowledge management

## Deployment Notes
- Use `infisical run --env=prod` for secret injection
- .env files should NEVER be committed
