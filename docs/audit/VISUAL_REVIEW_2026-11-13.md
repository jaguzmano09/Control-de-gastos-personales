# Visual UI Review — 2026-11-13

| Field | Value |
|---|---|
| Target | Local development server at `http://localhost:3000` |
| Browser | Chrome for Testing 157.0.8103.78 through `agent-browser` 0.43.0 |
| Scope | Public homepage and information pages; responsive layout and unauthenticated route boundary |
| Authentication | None |

## Summary

No confirmed product-specific text clipping or horizontal page overflow was found on the publicly accessible pages within this review. The page document and body widths matched the tested viewport widths of 320, 390, and 768 CSS pixels. The homepage was also visually reviewed at a 1258-pixel desktop viewport. One public-copy inconsistency was found: the current UI still uses “beta” wording despite the owner-confirmed D09 direction in the product brief.

The `/cuentas` and `/transacciones/nueva` routes redirected to `/login`, so authenticated dashboard and transaction views were not visually reviewed. Review those views with an authorized test session before treating the visual audit as complete for the full product.

## Coverage

- `/` and `/login` (same public homepage): 320×780, 390×844, 768×1024, and approximately 1258-pixel desktop width.
- `/privacidad`: 320×780 and 390×844.
- `/seguridad`, `/terminos`, and `/soporte`: 390×844.
- `/cuentas` and `/transacciones/nueva`: unauthenticated redirect behavior only.
- Browser error check on the public homepage: no page errors reported. Console output contained React DevTools and Next.js Fast Refresh informational messages.

## Observation

### ISSUE-001: Public copy still uses beta framing

| Field | Value |
|---|---|
| Severity | Medium |
| Category | Content |
| URL | `/` (also visible on `/privacidad` and `/terminos`) |
| Repro video | N/A — static copy |

**Description:** The homepage describes integrations as “funciones beta” in its hero note and footer, while legal pages label themselves “Versión beta”. This conflicts with owner-confirmed D09: do not describe the current product as a beta; existing capabilities remain part of the product and continue to improve. Keep progressive integration availability, but describe it without beta framing.

**Repro steps:** Open `/` at a narrow mobile width and inspect the copy below the two hero actions and in the footer. The hero copy is visible in [this 320-pixel screenshot](visual-review-2026-11-13-home-320-beta-copy.png). Open `/privacidad` or `/terminos` to see the version label.

---

The Next.js development-tools badge is fixed to the lower-left corner and overlaps page content in narrow mobile screenshots, including text on the public information pages. This badge belongs to the local development environment and is not part of the production UI; it is not counted as a product defect. Evidence: [annotated mobile support screenshot](visual-review-2026-11-13-support-320-annotated.png) and [unannotated screenshot](visual-review-2026-11-13-support-320-devtools.png).

## Limitations

This was a visual smoke review of the pages available without signing in. It did not assess authenticated dashboard data, transaction forms, account and pocket cards, admin pages, actual user-specific content, or production rendering. No application files or financial data were changed or accessed.
