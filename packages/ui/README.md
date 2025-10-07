# UI Package

This package will own the Shadcn-based design system used across the web, desktop, and mobile clients. It should export locked
tokens, component wrappers, and lint rules that prevent consumers from bypassing the shared styles.

## Planned Contents

- `theme.ts`: CSS variable definitions and ThemeProvider wiring.
- `components/`: Re-exported Shadcn primitives with opinionated defaults.
- `lint/`: ESLint plugin that blocks direct imports from upstream `@/components/ui/*` paths.
- `docs/`: Usage guidelines consumed by the Designer agent when auditing UI changes.
