# Skills ICM Library (lazy-load)

Shelf layout mirrors `/opt/pauli-effect/library/shelves/`.

## Lazy load contract
Agents never bulk-load skills. They:
1. GET `/skills` or read `catalog.json` (ids + shelves only)
2. GET `/skills/{id}` to load one skill entry/manifest
3. Only then open `entry` file contents

## Shelves
- 100-IDENTITY
- 200-STRATEGY-AND-DOCTRINE
- 300-AGENTS-AND-PEOPLE
- 400-CLIENTS-AND-PROJECTS
- 500-SKILLS-AND-PATTERNS
- 600-OPERATIONS
- 700-MEMORY-AND-REFLECTION

## Access
Hermes, Cosmos-Pi, TARS, Cosmos-II, Dashboard persona switcher.
