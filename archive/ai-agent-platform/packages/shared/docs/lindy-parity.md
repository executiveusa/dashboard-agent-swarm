# Lindy.ai Capability Parity

This document maps Lindy.ai's flagship capabilities to the Lovable Cloud agent tooling stack so product and GTM teams can quickly see what is supported today and which integrations remain on the roadmap.

## Summary Table

| Capability | Tool Bundle(s) | Coverage | Notes |
| --- | --- | --- | --- |
| Scheduling & Calendar | `RubeTool` (planned `calendar.*` providers), `Workflow` triggers | 🚧 Partial | OAuth/session plumbing is in place, but calendar-specific Rube services still need to be exposed; workflows can trigger time-based jobs once events are available. |
| CRM / Account Updates | `RubeTool` → `notion.createPage`, Files tooling | ✅ Available (Notion-based) | Supports logging research notes or CRM updates into Notion workspaces via per-session OAuth tokens; additional CRM connectors (Salesforce, HubSpot) are pending. |
| Email Outreach | `RubeTool` → `gmail.sendEmail`, `SpeechTool` (voice follow-ups) | ✅ Available | Gmail send is wired through Rube with per-session OAuth tokens; multi-channel follow-ups can layer on SpeechTool for voice memos. |
| Browser Automation & Research | `BrowserTool`, `FirecrawlTool`, `HTTPTool`, `routeLLM` | ✅ Available | Cross-browser automation, scraping, and HTTP probes run through the Open Interpreter sandbox with Supabase artifact storage. |
| Knowledge Capture & Data Cleaning | `CodeTool`, `FilesTool`, `FirecrawlTool` | ✅ Available | Data pipelines can clean, transform, and persist structured outputs directly to Supabase-backed storage. |
| Voice Assistants | `routeLLM`, `SpeechTool` | ✅ Available | LLM routing feeds SpeechTool synthesis for hands-free interactions, with audit logs capturing provider choices. |

## Detailed Notes

### Scheduling & Calendar
- **Current State:** Session-scoped OAuth tokens are persisted in Supabase (`rube_tokens`) so that once calendar endpoints are available they can be invoked without re-authentication.
- **Gap:** Rube MCP endpoints for creating, listing, and updating calendar events are not yet implemented. Additions such as `calendar.createEvent` and `calendar.listAvailabilities` are required for full Lindy parity.
- **Workaround:** Use workflow cron triggers combined with Notion/Gmail outputs to approximate reminders until direct calendar access is shipped.

### CRM / Account Updates
- **Current State:** The `notion.createPage` Rube service gives agents a structured CRM destination. Responses from the LLM router can be pushed into Notion databases alongside uploaded artifacts from Supabase.
- **Next Steps:** Add Salesforce/HubSpot MCP bridges and map workflow templates that route research summaries straight into CRM pipelines.

### Email Outreach
- **Current State:** `gmail.sendEmail` is live with per-session OAuth tokens, allowing agents to draft and send personalized outreach derived from LLM responses.
- **Enhancements:** Expand to multi-channel messaging (e.g., SMS via Twilio) and add reply-thread awareness so agents can follow Lindy's conversational workflows end-to-end.

### Browser Automation & Research
- **Current State:** `BrowserTool` and `FirecrawlTool` run inside the Open Interpreter sandbox, with screenshots and scraped artifacts uploaded to Supabase buckets for auditability. The router steers between local (Ollama/LM Studio) and remote (OpenRouter/OpenAI) LLMs to keep research latency predictable.
- **Opportunities:** Layer heuristic planning (e.g., using the optimizer cache) to choose between crawling vs. direct HTTP probes based on prior task outcomes.

### Knowledge Capture & Data Cleaning
- **Current State:** `CodeTool` executes Python/Node jobs within a sandboxed environment and ships outputs to Supabase storage, letting agents normalize CSVs or enrich datasets before syncing to CRM.
- **Future Work:** Add native connectors for BI destinations (BigQuery, Snowflake) so cleaned data can be pushed downstream automatically.

### Voice Assistants
- **Current State:** Voice agents reuse the router's chosen LLM output as TTS input, ensuring consistent messaging across voice and text channels.
- **Enhancements:** Add WebRTC/Webhook glue for live-call scenarios and expose SSML controls for richer speech synthesis akin to Lindy's concierge flows.

