# Project skill library

The imported skill library is grouped by responsibility:

- `ui/`: visual design, accessibility, and Tailwind components.
- `architecture/`: Next.js App Router patterns.
- `design-system/`: design tokens and system definitions.
- `brand/`: visual identity and branding.
- `brand/ip-as-logo/`: guidance for creating and maintaining the brand mascot/logo.
- `creative/`: graphic design, banners, and presentations.

Skills installed through `skills-lock.json` live in this directory and are
integrated into the categories above. Project-scoped skills that Codex should
discover automatically live in `.agents/skills/`; keep those there instead of
copying them into this library. The shadcn skill in `.agents/skills/shadcn/`
provides component and design-system implementation guidance. It does not
replace the brand strategy and visual-identity skills in `brand/`.
