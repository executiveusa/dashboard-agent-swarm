# ZTE-20260715-0002 / Mercury switch
Date: 2026-07-15
Status: COMPLETE (fleet brain -> Mercury-2)

## Working key
- Vault MERCURY2_API_TOKEN (sk_958...) works against https://api.inceptionlabs.ai/v1
- Model: mercury-2
- Use reasoning_effort=low + max_tokens>=256 for non-null content

## Switched
- pauli-cosmos-brain (Jarvis): config.json model -> mercury-2 inception
- pauli-cosmos-pi: systemd OPENAI_API_KEY/API_BASE/MODEL -> mercury-2
- pauli-tars: config.json model -> mercury-2

## Verified
- Cosmos-II /health model mercury-2, /chat confirms Mercury-2
- Cosmos-Pi /mission returns MERCURY_PI_OK
- TARS online brain: OK after restart
- Hermes still dispatcher (no LLM in unit); agents it routes to use Mercury

## Not done
- Full TypeScript Pi monorepo deploy (still lightweight runtime, now Mercury-powered)
- Hermes Telegram chat ID
- Sandcastle / cron
