# Agent Identity and Reporting Protocol

## Reporting envelope (canonical)

```json
{
  "agent_name": "<AGENT_NAME>",
  "agent_role": "<AGENT_ROLE>",
  "task_id": "<TASK_ID>",
  "status": "ANALYSIS | EXECUTING | BLOCKED | COMPLETED",
  "summary": "<SUMMARY>",
  "assumptions": [],
  "files_touched": [],
  "risks_or_notes": [],
  "next_actions": [],
  "signature": "— <AGENT_NAME>"
}
```

## Required fields

- `agent_name`
- `agent_role`
- `task_id`
- `status`
- `summary`
- `assumptions`
- `files_touched`
- `risks_or_notes`
- `next_actions`
- `signature`
