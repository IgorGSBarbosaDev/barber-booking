# Barber Booking — visual direction

## Direction

**Ficha de serviço / mesa de ofício.** A interface trata cada agendamento como uma ficha clara de serviço em uma mesa de trabalho bem organizada: informação direta, divisores finos, tipografia forte, ação primária inequívoca e estados que parecem marcações de operação, não decoração.

The assigned direction was candidate 5 from the Impeccable direction roll. It is deliberately operational enough for a solo barber, but warmer and more ownable than a generic SaaS dashboard.

## Product scene

The client is usually standing or using a phone between tasks, and the barber is scanning the next few appointments while working. The first viewport must prove the next decision immediately: choose a service or understand today's schedule without hunting through chrome.

## World grammar

- Warm off-white paper canvas (`#f7f7f4`) with graphite ink and quiet zinc dividers.
- Oxide terracotta is the single brand/action accent; semantic green, amber, and red are reserved for operational status.
- Surfaces use thin borders, subtle elevation, and compact 10–14px radii. No decorative gradients or oversized hero cards.
- Navigation and filters behave like indexed tabs and labeled file sections; content is grouped by task, not by arbitrary bento tiles.
- Numbers use tabular figures. Status is expressed through short, readable badges and a small state dot.
- Public booking is a short step sequence with a visible progress rail. Admin is a two-column work surface: persistent navigation plus a calm content column.

## First viewport

- Public: the barbershop identity, the line “Agende seu próximo horário”, three compact service fichas and a clear next action are visible without scroll on a typical phone.
- Admin: a restrained greeting, period filter, metric strip and today’s agenda are visible before the fold on desktop.

## Signature interaction

Selecting a service, date, slot, or active navigation item applies a clear ink state: filled primary surface, visible focus ring, and a short status update. Toasts use the same “office note” language for success, error, warning, and information.

## Component decisions

Use an HTML/CSS/JS analogue of shadcn/ui primitives: Button, IconButton, Input, Select, Textarea, Checkbox, Switch, Card, MetricCard, Badge, StatusBadge, Table, Tabs, Dialog, Drawer, Popover, Toast, Alert, Calendar, TimeSlot, Skeleton, EmptyState, Pagination, Breadcrumb, Sidebar, Topbar, Avatar, Separator, FormField, and LoadingSpinner. Each view can render them as small template helpers rather than introducing a frontend framework.

## Responsive rules

- Public is mobile-first: one-column content, 44px minimum touch targets, sticky booking summary only when it helps, and a date/slot grid that never creates horizontal overflow.
- Admin is desktop-first: a 248px sidebar at wide widths, a drawer/sidebar toggle below 960px, and stacked metric/table sections below 720px.
- Tables collapse into readable appointment rows on narrow screens; controls wrap without clipped text.

## Challenger audit

The challenger systems from the direction roll were weighed on audience identification and product clarity before borrowing:

- ASCII live scene — **declined**: keep its density discipline for schedule scanning, not its glyph surface.
- Nixie laboratory counter — **competitive**: keep its respect for numerical hierarchy and visible metric change; avoid theatrical chrome.
- Alphabet storm — **declined**: keep the idea that transitions should communicate state; preserve readable product language.
- Industrial streetwear — **competitive**: keep direct labels and a single active accent; avoid hazard stripes and costume.
- Game Boy field — **declined**: keep strict selected/disabled state contrast; do not reduce a professional tool to a retro theme.
- Airport wayfinding — **competitive**: keep one-next-decision navigation and concise directional labels.

## Quality bar

The surface should feel quiet, precise, and slightly tactile at the same time. A customer should understand the next action in seconds; a barber should recognize the next appointment, status, and available action at a glance. The UI must stay legible in loading, empty, error, success, disabled, hover, focus, and mobile states.
