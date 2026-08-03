# MediTrack Design System

A calm, clinical, modern SaaS aesthetic — think Linear/Stripe dashboard applied
to a pharmacy. Dense enough for real operational work, generous enough to feel
premium. Light and dark mode both first-class.

## Tokens (Tailwind CSS v4 `@theme` in `src/styles/index.css`)

All colors are defined as CSS variables on `:root` and overridden under `.dark`,
then exposed to Tailwind as semantic utilities. **Never hardcode hex values in
components** — always use the semantic classes.

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `--color-bg` | `#f7f8fa` | `#0b0f14` | app background |
| `--color-surface` | `#ffffff` | `#11171f` | cards, panels |
| `--color-surface-muted` | `#f1f3f7` | `#161e29` | table headers, inputs |
| `--color-border` | `#e3e7ee` | `#1f2a37` | hairlines |
| `--color-fg` | `#0f172a` | `#e8edf5` | primary text |
| `--color-fg-muted` | `#5b6779` | `#93a1b5` | secondary text |
| `--color-primary` | `#0d9488` | `#14b8a6` | teal — brand, primary actions |
| `--color-primary-fg` | `#ffffff` | `#04211f` | text on primary |
| `--color-accent` | `#4f46e5` | `#818cf8` | indigo — charts, highlights |
| `--color-success` | `#059669` | `#34d399` | in stock, paid |
| `--color-warning` | `#d97706` | `#fbbf24` | low stock, expiring |
| `--color-danger` | `#dc2626` | `#f87171` | expired, destructive |
| `--color-info` | `#0284c7` | `#38bdf8` | neutral info |

- Radii: `--radius-card: 14px`, `--radius-control: 10px`, pills `9999px`.
- Shadows: `--shadow-card: 0 1px 2px rgb(15 23 42 / .04), 0 8px 24px -12px rgb(15 23 42 / .12)`.
  Dark mode uses borders instead of heavy shadows.
- Type: Inter (self-host via `@fontsource-variable/inter`), tabular numerals
  (`font-variant-numeric: tabular-nums`) on every money/quantity cell.
  Scale: display 30/36, h1 24/32, h2 18/26, body 14/20, small 12/16.
- Spacing rhythm: 4px base; card padding 20px; page gutter 24px; section gap 24px.
- Motion: 150ms ease-out for hover/press, 200ms for enter. Respect
  `prefers-reduced-motion` (disable transitions/animations).

## Layout shell

- Fixed left sidebar, 260px, collapsible to 72px icon rail (state persisted in
  `localStorage`). On `<lg` it becomes an overlay drawer with a backdrop.
- Sidebar: brand lockup (pill logo + "MediTrack"), nav groups
  (Overview / Operations / Catalog / Admin), each item with a lucide icon,
  active item gets a primary-tinted background and a 3px left bar.
- Topbar, 64px, sticky: page title + breadcrumb, global search (⌘K), theme
  toggle, unread-messages bell with count badge, user avatar menu
  (profile, change password, logout).
- Content max-width 1400px, centered, 24px gutters.

## Core components (in `src/components/ui/`)

`Button` (variants: primary, secondary, ghost, danger; sizes sm/md; loading
spinner + disabled), `Input`, `Textarea`, `Select`, `Checkbox`, `Label`,
`FormField` (label + control + error text), `Card` (+ `CardHeader`,
`CardTitle`, `CardContent`), `StatCard` (label, value, delta, icon, sparkline
slot), `Badge` (neutral/success/warning/danger/info + `StatusBadge` mapping
drug status and payment mode), `Table` (sticky header, zebra-free hairline
rows, hover tint, right-aligned numeric columns, sortable header buttons),
`Pagination`, `Modal` (focus trap, Esc to close, backdrop blur),
`ConfirmDialog`, `Drawer`, `Tabs`, `Toast` (context + `useToast`, stacked
bottom-right, auto-dismiss 4s), `Skeleton`, `EmptyState` (icon, title,
description, action), `ErrorState` (with retry), `Spinner`, `Tooltip`,
`SearchInput` (debounced 300ms).

## Data-display rules

- Every async view has three explicit states: skeleton loading, empty state,
  error state with a retry button. Never render a blank page.
- Tables: 20 rows/page, server-driven pagination, sortable columns, and a
  debounced search box; each row has a right-aligned action menu.
- Currency via a shared `formatCurrency` helper (`en-IN`, `INR`, 2 decimals).
  Dates via `formatDate`/`formatDateTime` helpers. No ad-hoc `toFixed` in JSX.
- Charts: Recharts, no gridline clutter (horizontal only), gradient area fill
  in `--color-primary`, custom tooltip using surface/border tokens, and they
  must re-read colors so dark mode looks right.

## Accessibility

- Visible focus ring on every interactive element:
  `focus-visible:ring-2 ring-primary ring-offset-2 ring-offset-bg`.
- All icon-only buttons have `aria-label`. Modals use `role="dialog"` +
  `aria-modal` + focus trap + focus restore. Tables use real `<th scope>`.
- Form errors are wired with `aria-invalid` + `aria-describedby`.
- Text contrast >= WCAG AA (4.5:1) in both themes.
