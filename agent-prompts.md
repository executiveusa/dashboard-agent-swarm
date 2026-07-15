# Agent Fleet — Shared Prompt Library

> **Source**: [jeffreysprompts.com](https://jeffreysprompts.com/) by Jeffrey Emanuel ([@Dicklesworthstone](https://github.com/Dicklesworthstone))  
> **Version**: v1.0 — 2026-02-16  
> **Usage**: All agents in the fleet share access to ALL 21 prompts. Any agent may invoke any prompt at any time. Agents should select the prompt most appropriate to their current task.  
> **Protocol**: Reference this file as `agent-prompts.md` in all AGENT_PROTOCOL.md and ROLE_INSTRUCTIONS.md files.

---

## Prompt Index

| # | Prompt | Category | Level | Tokens |
|---|--------|----------|-------|--------|
| 1 | [The Idea Wizard](#1-the-idea-wizard) | Brainstorming | Beginner | ~500 |
| 2 | [The README Reviser](#2-the-readme-reviser) | Documentation | Advanced | ~300 |
| 3 | [The Robot-Mode Maker](#3-the-robot-mode-maker) | CLI/Automation | Intermediate | ~600 |
| 4 | [Stripe-Level UI](#4-stripe-level-ui) | UI/UX/Frontend | Beginner | ~200 |
| 5 | [The Git Committer](#5-the-git-committer) | Git/Automation | Intermediate | ~150 |
| 6 | [The De-Slopifier](#6-the-de-slopifier) | Writing/Editing | Intermediate | ~350 |
| 7 | [The Code Reorganizer](#7-the-code-reorganizer) | Refactoring | Intermediate | ~800 |
| 8 | [The Bug Hunter](#8-the-bug-hunter) | Debugging | Intermediate | ~400 |
| 9 | [System Weaknesses Analyzer](#9-system-weaknesses-analyzer) | Analysis | Advanced | ~100 |
| 10 | [The 100-to-10 Filter](#10-the-100-to-10-filter) | Brainstorming | Advanced | ~400 |
| 11 | [Multi-Model Synthesis](#11-multi-model-synthesis) | Planning | Intermediate | ~600 |
| 12 | [The Premortem Planner](#12-the-premortem-planner) | Planning/Risk | Beginner | ~350 |
| 13 | [Deep Project Primer](#13-deep-project-primer) | Onboarding | Intermediate | ~200 |
| 14 | [The Stub Eliminator](#14-the-stub-eliminator) | Production/Quality | Intermediate | ~150 |
| 15 | [Peer Code Reviewer](#15-peer-code-reviewer) | Review/Quality | Intermediate | ~250 |
| 16 | [E2E Pipeline Validator](#16-e2e-pipeline-validator) | Testing | Advanced | ~350 |
| 17 | [Agent Swarm Launcher](#17-agent-swarm-launcher) | Multi-Agent | Advanced | ~500 |
| 18 | [Deep Performance Audit](#18-deep-performance-audit) | Performance | Advanced | ~1200 |
| 19 | [CLI Error Tolerance](#19-cli-error-tolerance) | CLI/Agent-Friendly | Beginner | ~450 |
| 20 | [Project Opinion Elicitor](#20-project-opinion-elicitor) | Feedback | Beginner | ~150 |
| 21 | [Deployment Verifier](#21-deployment-verifier) | Deployment | Advanced | ~250 |

---

## Prompts

### 1. The Idea Wizard
**Category**: Brainstorming / Improvement / Evaluation  
**Level**: Beginner  

```
Come up with your very best ideas for improving this project.

First generate a list of 30 ideas (brief one-liner for each).

Then go through each one systematically and critically evaluate it, rejecting
any that are not truly excellent, impractical, or redundant. Be ruthless.

Finally, distill down to the very best 5 ideas. For each of the final 5,
provide:
- A clear description of the idea
- Why it's valuable
- How it could be implemented
- Estimated effort (low/medium/high)
- Expected impact (low/medium/high)
```

---

### 2. The README Reviser
**Category**: Documentation / README / Docs  
**Level**: Advanced  

```
Update the README and other documentation to reflect all of the recent changes
to the project.

Frame all updates as if they were always present (i.e., don't say "we added X"
or "X is now Y" — just describe the current state as if writing fresh
documentation from scratch).

Make sure every feature, configuration option, API endpoint, and installation
step is accurately documented. Remove any references to features that no longer
exist. Add documentation for any new features that are missing docs.

The tone should be clear, professional, and developer-friendly.
```

---

### 3. The Robot-Mode Maker
**Category**: CLI / Automation / Agent-Friendly  
**Level**: Intermediate  

```
Design and implement a "robot mode" CLI for this project.

The CLI should be optimized for use by AI coding agents:

1. **JSON Output**: Add --json flag to every command for machine-readable output
2. **Deterministic Behavior**: No interactive prompts in robot mode; all inputs
   via flags/args
3. **Exit Codes**: Meaningful exit codes (0=success, 1=error, 2=warning, etc.)
4. **Structured Errors**: Error messages in JSON format with error codes,
   descriptions, and suggested fixes
5. **Idempotent Operations**: Running the same command twice produces the same
   result
6. **Progress Reporting**: Machine-readable progress updates via stderr
7. **Discovery**: A --help-json flag that outputs all commands and their
   parameters in JSON schema format
8. **Batch Mode**: Accept multiple operations via stdin or file input
```

---

### 4. Stripe-Level UI
**Category**: UI / UX / Frontend  
**Level**: Beginner  

```
I want you to do a spectacular job building absolutely world-class UI/UX
components, with an intense focus on making the most visually appealing,
user-friendly, intuitive, slick, polished, "Stripe level" quality interface.

Every pixel matters. Every animation should feel intentional. Every interaction
should feel responsive and delightful. Think about micro-interactions, loading
states, error states, empty states, hover effects, transitions.

Use the best practices from the most beautiful SaaS products (Stripe, Linear,
Vercel, Raycast) as inspiration. The design should feel premium, modern,
and trustworthy.
```

---

### 5. The Git Committer
**Category**: Git / Commit / Automation  
**Level**: Intermediate  

```
Now, based on your knowledge of the project, commit all changed files now in a
series of logically connected groupings with super detailed commit messages for
each and then push. Take your time to do this right.

Each commit should:
- Group related changes together logically
- Have a clear, descriptive commit message following conventional commits
- Include a body explaining WHY the changes were made, not just what
- Reference any relevant issues or PRs
- Be in the correct order (dependencies first, then dependents)
```

---

### 6. The De-Slopifier
**Category**: Writing / Documentation / Editing  
**Level**: Intermediate  

```
I want you to read through the complete text carefully and look for any telltale
signs of "AI slop" style writing; one big tell is the use of em dash. You
should try to replace this with a semicolon, comma, or period instead.

Other signs to fix:
- Overuse of "Furthermore," "Moreover," "Additionally" as paragraph starters
- Unnecessary hedging ("It's worth noting that...", "It should be mentioned...")
- Filler phrases ("In order to" → "To", "Due to the fact that" → "Because")
- Overly formal tone where casual would be more natural
- Repetitive sentence structures
- Buzzword soup ("leverage," "utilize," "facilitate," "comprehensive")
- Lists that could be prose, or prose that should be lists
- Passive voice where active is clearer

Make the writing sound like a smart human wrote it, not an AI.
```

---

### 7. The Code Reorganizer
**Category**: Refactoring / Organization / Structure  
**Level**: Intermediate  

```
We really have WAY too many code files scattered inside src/ with no rhyme or
reason to the structure and location of code files; I feel like we could make
things a lot more organized, logical, intuitive, and well-structured.

Please propose and implement a new folder structure that:
1. Groups related functionality together
2. Follows established conventions for this framework/language
3. Makes it obvious where to find any given piece of code
4. Separates concerns (utils, services, components, types, etc.)
5. Updates all import paths to match the new structure
6. Doesn't break any existing functionality

Show the proposed structure first, explain your reasoning, then implement it.
```

---

### 8. The Bug Hunter
**Category**: Debugging / Bugs / Review  
**Level**: Intermediate  

```
I want you to sort of randomly explore the code files in this project, choosing
code files to deeply investigate and understand and trace their functionality
and execution flows through the related code files. Look for any obvious bugs,
issues, problems, or things that just don't look right.

Focus on:
- Logic errors and edge cases
- Race conditions and async issues
- Memory leaks or resource cleanup
- Error handling gaps
- Type mismatches or unsafe casts
- Security vulnerabilities
- Performance issues
- Dead code or unreachable paths

For each issue found, explain:
- What the bug is
- Where it is (file + line)
- Why it's a problem
- How to fix it
```

---

### 9. System Weaknesses Analyzer
**Category**: Analysis / Improvement / Review  
**Level**: Advanced  

```
Based on everything you've seen, what are the weakest/worst parts of the system?
What is most needing of fresh ideas and innovative/creative/clever improvements?
```

---

### 10. The 100-to-10 Filter
**Category**: Brainstorming / Filtering / Innovation  
**Level**: Advanced  

```
I want you to come up with your top 10 most brilliant ideas for adding extremely
powerful and cool functionality that will make this system far more compelling,
useful, intuitive, versatile, powerful, and impressive.

Start by generating 100 ideas (brief one-liners). Then ruthlessly filter down
to the 10 most brilliant, novel, and high-impact ones.

For each of the final 10:
- Describe the feature in detail
- Explain why it's brilliant and differentiated
- Outline implementation approach
- Estimate effort vs. impact
- Identify any dependencies or prerequisites
```

---

### 11. Multi-Model Synthesis
**Category**: Planning / Synthesis / Multi-Model  
**Level**: Intermediate  

```
I asked 3 competing LLMs to do the exact same thing and they came up with pretty
different plans which you can read below. I want you to REALLY carefully analyze
their plans with an open mind and be incredibly self-aware about which model
you are and potential biases.

Create a HYBRID plan that takes the absolute best ideas from each, resolves
contradictions intelligently, and produces something better than any individual
plan. Be specific about which ideas came from which model and why you
kept/rejected each element.
```

---

### 12. The Premortem Planner
**Category**: Planning / Risk / Premortem  
**Level**: Beginner  

```
Before we proceed, I want you to do a "premortem" on this plan. Imagine we're 6
months in the future and this approach has completely failed. What went wrong?
What assumptions did we make that turned out to be wrong? What risks did we
ignore? What dependencies broke?

Then revise the plan to address every failure mode you identified. For each risk:
- Describe the failure scenario
- Rate likelihood (low/medium/high) and impact (low/medium/high)
- Propose a specific mitigation strategy
- Add any monitoring/alerting that would catch the problem early
```

---

### 13. Deep Project Primer
**Category**: Onboarding / Understanding / Exploration  
**Level**: Intermediate  

```
First read ALL of the AGENTS.md file and README.md file super carefully and
understand ALL of both! Then use your code investigation agent mode to fully
understand the code, and technical architecture, and every single file and
folder in this project.

Create a comprehensive project summary that covers:
- What this project does (high level and detailed)
- Architecture and tech stack
- Key files and their purposes
- Data flow and system interactions
- Configuration and environment setup
- Known issues or limitations
- How to develop, test, and deploy
```

---

### 14. The Stub Eliminator
**Category**: Production / Quality / Completeness  
**Level**: Intermediate  

```
I need you to look for stubs, placeholders, mocks, of ANY KIND. These ALL must
be replaced with FULLY FLESHED OUT, working, correct, performant, idiomatic code
as per the beads. Do this meticulously and leave absolutely zero placeholders,
TODO comments, mock data, fake implementations, or "coming soon" features.

Every function must work. Every API call must be real. Every component must
render correctly. Every test must use real data patterns.
```

---

### 15. Peer Code Reviewer
**Category**: Review / Quality / Cross-Agent  
**Level**: Intermediate  

```
Ok can you now turn your attention to reviewing the code written by your fellow
agents and checking for any issues, bugs, errors, problems, inefficiencies,
security problems, reliability issues, etc. that you can find?

Review with the eye of a senior engineer doing a thorough code review:
- Correctness: Does the code do what it claims?
- Security: Any injection, XSS, auth bypass, data exposure?
- Performance: Any N+1 queries, unnecessary re-renders, memory leaks?
- Maintainability: Is the code clean, well-named, properly typed?
- Error handling: Are all error paths covered?
- Testing: Are there tests? Do they test the right things?
```

---

### 16. E2E Pipeline Validator
**Category**: Testing / E2E / Validation  
**Level**: Advanced  

```
We really need to have totally complete, totally comprehensive, granular,
perfect end to end testing coverage without ANY mocks or fake data, fake api
calls, etc., that prove that our entire pipeline works correctly end to end.

Tests should:
- Use real API calls (or sandboxed real environments)
- Cover every user flow from start to finish
- Test error paths and edge cases
- Validate data integrity at every step
- Run in CI/CD with clear pass/fail output
- Include performance benchmarks
- Test across browsers/devices where applicable
```

---

### 17. Agent Swarm Launcher
**Category**: Multi-Agent / Coordination / Swarm  
**Level**: Advanced  

```
First read ALL of the AGENTS.md file and README.md file super carefully and
understand ALL of both! Then use your code investigation agent mode to fully
understand the code, and technical architecture, and every single file and
folder in this project.

Then initialize the full agent swarm:
1. Boot all agents with full context
2. Establish communication channels between agents
3. Verify each agent can reach its dependencies
4. Run health checks on all endpoints
5. Set up monitoring and alerting
6. Begin the first coordinated task
7. Report swarm status to the dashboard
```

---

### 18. Deep Performance Audit
**Category**: Performance / Optimization / Profiling  
**Level**: Advanced  

```
First read ALL of the AGENTS.md file and README.md file super carefully and
understand ALL of both! Then use your code investigation agent mode to fully
understand the code, and technical architecture, and every single file and
folder in this project.

Then perform a systematic performance audit:
1. Identify all performance bottlenecks
2. Profile database queries (N+1, missing indexes, slow joins)
3. Analyze bundle size and code splitting
4. Check for memory leaks and resource cleanup
5. Review caching strategy (or lack thereof)
6. Measure API response times
7. Check for unnecessary re-renders in React
8. Review WebSocket efficiency
9. Propose specific optimizations with expected improvement
10. Implement the top 3 highest-impact optimizations

Every optimization must include before/after measurements as proof.
```

---

### 19. CLI Error Tolerance
**Category**: CLI / Agent-Friendly / Error-Handling  
**Level**: Beginner  

```
One thing that's critical for the robot mode flags in the CLI (the mode intended
for use by AI coding agents like yourself) is that we want to make it easy for
the agents to use the tool; so first off we should make it very forgiving and
tolerant of minor mistakes in syntax or argument formatting.

Implement:
- Fuzzy command matching (e.g., "statsu" matches "status")
- Case-insensitive flags
- Suggest corrections for typos
- Accept both --flag=value and --flag value syntax
- Accept common aliases (e.g., -v, --verbose, --debug all work)
- Clear, actionable error messages when something goes wrong
- A --strict mode for when exact matching is needed
```

---

### 20. Project Opinion Elicitor
**Category**: Feedback / Assessment / Honesty  
**Level**: Beginner  

```
Now tell me what you actually THINK of the project-- is it even a good idea? Is
it useful? Is it well designed and architected? Pragmatic? What could we do to
make it more useful and compelling and interesting?

Be brutally honest. I want your real opinion, not flattery. Tell me:
- What's genuinely good about it
- What's mediocre or needs work
- What's outright bad or misguided
- What the market really needs vs what we're building
- What you'd change if you were the technical co-founder
- Whether the architecture will scale
```

---

### 21. Deployment Verifier
**Category**: Deployment / Verification / Playwright  
**Level**: Advanced  

```
Deploy to vercel and verify that the deployment worked properly without any
errors (iterate and fix if there were errors). Then visit the live site with
playwright as both desktop and mobile browser and take screenshots to verify
everything is rendering correctly.

Verify:
- Build completes without errors
- All pages load correctly
- No console errors in browser
- All API endpoints respond correctly
- Mobile responsive layout works
- Performance scores (Lighthouse)
- SSL/HTTPS working
- Environment variables properly set
- No broken links or missing assets
```

---

## How Agents Should Use These Prompts

1. **Read `agent-prompts.md`** at the start of every session
2. **Select the prompt** most relevant to the current task
3. **Adapt the prompt** to the specific repo/context (replace generic references with actual file names, endpoints, etc.)
4. **Execute the prompt fully** — do not skip steps or produce partial results
5. **Report results** back to the dashboard via the agent-to-agent protocol
6. **Log prompt usage** via CAUT for tracking which prompts are most effective

## Prompt Chains (Recommended Sequences)

### New Agent Onboarding
1. Deep Project Primer (#13)
2. System Weaknesses Analyzer (#9)
3. Project Opinion Elicitor (#20)

### Feature Development Sprint
1. The Idea Wizard (#1) or The 100-to-10 Filter (#10)
2. The Premortem Planner (#12)
3. Stripe-Level UI (#4) — for frontend features
4. The Stub Eliminator (#14)
5. Peer Code Reviewer (#15)
6. The Git Committer (#5)

### Code Health Sprint
1. The Bug Hunter (#8)
2. Deep Performance Audit (#18)
3. The Code Reorganizer (#7)
4. The De-Slopifier (#6) — for docs
5. E2E Pipeline Validator (#16)

### Deployment Sprint
1. The Stub Eliminator (#14)
2. E2E Pipeline Validator (#16)
3. Deployment Verifier (#21)
4. The README Reviser (#2)

### Agent Infrastructure Sprint
1. Agent Swarm Launcher (#17)
2. The Robot-Mode Maker (#3)
3. CLI Error Tolerance (#19)
4. Multi-Model Synthesis (#11)

---

## External Tool Adoption Addendum (Fleet Standard)

When integrating external tools (including `markdown_web_browser`, `claude_code_agent_farm`, `ultimate_mcp_client`, CASS, SLB, and playlist transcription), use this sequence:

1. Classify action using ACIP (`SAFE`, `SENSITIVE-ALLOWED`, `DISALLOWED`)
2. Verify pinned version + checksum; reject unverified installer scripts
3. Define domain-native owner repo and owner agent
4. Add telemetry event mapping before enabling runtime invoke
5. Pilot in Core 4 repos; then promote to all 11 repos

### New shared skill requirement

`bulk_transcribe_youtube_videos_from_playlist` is now a fleet-wide shared skill. Canonical skill source is:

- `executiveusa/agent_flywheel_clawdbot_skills_and_integrations`

Consumer repos should sync from canonical source rather than maintaining divergent copies.
