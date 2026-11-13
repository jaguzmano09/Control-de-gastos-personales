# Brand discovery — positioning and territories

Status: Draft reflecting owner direction. No replacement name, logo, or final visual direction is approved by this document.
Roadmap: P0.5 and P4.1 exploration; naming and identity execution remain in P4.2–P4.8.
Research date: 2026-11-13.

## Product facts that can shape the brand

- Audience confirmed by the owner: people in Colombia organizing personal finances in COP and America/Bogota.
- Core job confirmed by the owner: record and organize personal financial movements.
- User control is central: OCR and email entries remain reviewable before affecting financial calculations.
- Money is organized through tracked accounts and optional pockets. Categories and their monthly allocations attach to a specific account or pocket.
- Transfers are internal movements. They should move money and category allocation between locations without appearing as income or spending.
- Availability is intended to reconcile from account/pocket locations into category and dashboard views. This accounting behavior is still under P2 verification and must not be presented as a proven public promise yet.
- The product does not provide general automatic bank aggregation. Do not imply that it connects to every Colombian bank.
- Owner direction: create the name and logo from scratch, then make the wider identity coherent around them. Inspect existing visual assets critically and preserve/adapt only what supports the selected identity.
- Owner direction: financial language should be precise, calm, and empathetic, without making people feel judged.

## Initial market scan

This is a limited desk scan of public product descriptions, not a complete competitor audit or user study.

- Bancolombia's Día a Día describes categorized movement reports and budgets within its app. This makes “categories, reports, and budgets” alone weak differentiators for the product.[^1]
- Bolsillos App describes organizing money across banks, cash, and currencies, assigning money to named pockets, and recording expenses by voice. “All your money in one place” and “pockets” are already prominent market language.[^2]
- Nequi's “Habla con tu plata” describes a period summary of spending, transfers, categories, and a financial profile.[^3]
- Auri's App Store listing describes Colombian personal finance management across accounts/wallets, available balances, budgets, and voice or messaging-assisted entry. This is a developer-provided listing, not an independently tested product comparison.[^4]
- FinanzApp's Google Play listing advertises a financial AI assistant as a Pro feature and labels it as in development. This is a developer-provided claim, not evidence of shipped quality or adoption; it does show that “has AI” alone is not a defensible differentiator.[^5]

### What this implies

The platform should not claim to be unique because it has budgets, categories, pockets, reports, automation, or an AI assistant. Those ideas already appear in current product descriptions. The stronger hypothesis is the coherence of the financial model: each movement belongs to a real tracked location, each location has a category allocation, and the category summary is derived from its underlying locations. That distinction is only credible after P2 verifies the calculations and user research confirms that people understand and value it. A grounded conversational assistant could make this coherence easier to use, but its privacy-preserving scope and actual usefulness need separate validation.

## Recommended positioning draft

**Working category:** personal money organizer for people who manage money across more than one account or pocket.

**Primary job:** record what happened, where the money moved, and what category it affects; then find that record and understand its current context.

**Draft value proposition:** “Registra tus movimientos y entiende cómo se distribuye tu plata entre cuentas, bolsillos y categorías.”

**Draft distinction:** one understandable view connects the place where money is held with the category the person assigned it to. Automated capture can help with entry, but the person keeps control over what becomes a confirmed movement.

**Proof required before public use:** demonstrate with synthetic accounts that the same transaction produces coherent account/pocket, category, and dashboard figures; verify transfers and month boundaries; show that imported entries do not affect calculations before confirmation; observe intended users explaining an available amount without coaching.

This promise is intentionally descriptive. Do not claim better outcomes, guaranteed savings, bank synchronization, perfect availability, or superiority over competitors without evidence.

## Personality and experience principles

| Trait | Product behavior | Avoid |
|---|---|---|
| Clear | Explain what a number includes and which account/pocket it comes from | Finance jargon without explanation |
| Calm | Make recording, correction, and review feel predictable | Urgency, guilt, or fear-based prompts |
| Respectful | Describe spending without judging the person | “Bad spending,” shame, or moral scores |
| Human-controlled | Label suggestions and wait for confirmation where required | Presenting AI/OCR/email output as inherently correct |
| Grounded | Use natural Colombian Spanish and COP context without relying on stereotypes | Bank-like authority claims, regional caricature, or generic paisa/flag motifs |

The most useful brand moment should occur during a real task: before saving, show where the transaction lands and which category it affects; after saving, make the resulting change understandable. This turns identity into behavior instead of limiting it to a logo.

## Creative territories to review

These are strategic directions, not proposed product names or approved visual identities.

### A. Money in context — recommended to explore first

The idea connects two questions people currently have to reconcile: “Where is my money?” and “What is it for?” The identity can use clear relationships, movement, and grouped locations without defaulting to a wallet, piggy bank, bank card, or generic rising chart. The current account/category model is the proof candidate, pending P2 verification.

**Risk:** the product's accounting semantics are complex. The interface must make this connection feel simple, and users must confirm that it solves a problem they recognize.

### B. Calm control

The identity emphasizes confidence, user agency, and nonjudgmental financial habits. It is a strong tone and interaction principle, but “control your money” is common category language and is unlikely to stand alone as a distinctive positioning.

**Risk:** can sound generic unless paired with a specific product mechanism.

### C. Everyday money, made legible

The identity makes the product feel practical and approachable for daily records, not like accounting software or an investment platform. It could support the manual-first experience and short frequent use.

**Risk:** “simple money management” is broad, and focusing only on ease could hide the product's account/pocket/category model.

**Recommendation:** use A as the positioning center, with B as the tone. Treat C as an interface quality requirement, not the main distinction. The owner has said “money in context” is appealing; validate the proposition in user-facing examples before treating it as final public positioning.

## Naming guardrails for P4.2

- Do not use “Bolsillo(s)” as the main distinctive element. It is a familiar financial term and an existing Colombian app brand.
- Avoid names implying a regulated bank, automatic connection to every institution, guaranteed returns, or financial advice.
- Prefer a short, pronounceable Spanish name that works aloud and in text, with a clear long name/short form system.
- Screen candidates for confusingly similar products, domains, app stores, and Colombia's SIC trademark search before selecting one. A web search is preliminary screening, not legal clearance.
- Do not change the current production name or logo until the owner approves a candidate and the migration scope is mapped across app metadata, PWA icons, email, legal text, domains, and social accounts.

## Current identity audit

The current name (“Control de gastos”) is descriptive but generic, and the wallet glyph is a familiar category symbol rather than a distinctive mark. Existing forest-green/ivory colors and serif display typography may provide useful warmth and continuity, but should be evaluated against the chosen concept rather than treated as commitments. Source inspection also found duplicated/conflicting palette definitions between global CSS and Tailwind, plus inconsistent product labels and theme colors in app/PWA metadata. These inconsistencies should be consolidated after a new identity direction is selected.

**Direction confirmed:** name and logo are to be created from scratch. The broader system should then be designed coherently around that foundation. The current palette and typography are candidates for adaptation only if they strengthen recognition, legibility, and the intended personality. No replacement name, mark, palette, or typography has been approved.

## Owner review needed

1. Review a concrete “money in context” proposition and confirm the wording before public claims.
2. Confirm the calm, empathetic, precise, nonjudgmental voice in real interface examples.
3. Review naming and logo options, then compare the current forest/ivory palette and serif typography as possible inputs to the coherent identity system.

These choices should guide naming. Naming availability and a logo concept should follow, rather than having an untested name determine the product positioning.

## Sources

[^1]: Bancolombia, Día a Día product page: <https://www.bancolombia.com/personas/canales/app-mi-bancolombia/dia-a-dia>.
[^2]: Bolsillos App, product page: <https://www.bolsillos.app/>.
[^3]: Nequi Help Center, “¿Qué es ‘Habla con tu plata’?”: <https://ayuda.nequi.com.co/hc/es/articles/38205273952781--Qu%C3%A9-es-Habla-con-tu-plata>.
[^4]: Apple App Store, Auri: Finanzas Personales: <https://apps.apple.com/co/app/auri-finanzas-personales/id6773147800>.
[^5]: Google Play, FinanzApp: <https://play.google.com/store/apps/details?id=com.joxibe.finanzapp>.
