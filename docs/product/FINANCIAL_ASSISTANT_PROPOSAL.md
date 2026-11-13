# Conversational financial assistant — proposal

Status: Discovery proposal only. No assistant is implemented or approved for release.
Owner input: explore a useful assistant that answers questions such as “Where did I spend the most this month?”
Constraints: Colombian personal-finance context, Spanish UI, COP, privacy-first, and free resources only.

## Product hypothesis

A person should be able to ask a natural question about their own recorded movements and receive a concise answer grounded in the product's confirmed data. The assistant could make existing account, pocket, category, and history information easier to understand. Its value is accurate, traceable help that respects the financial model, not the presence of an LLM by itself.

This is a hypothesis, not a public product claim. Competing product descriptions already mention AI assistants. Validate whether people can complete common questions more easily and trust the answer compared with ordinary filters and summaries.

## Candidate first questions

1. “¿En qué categoría gasté más este mes?” Return the period, category, COP total, confirmed movement count, and a link to matching history.
2. “¿Cuánto gasté en pizzas?” Match confirmed descriptions/merchant text, state the exact period and match count, and disclose when the phrase is ambiguous.
3. “¿Qué pasó con mi disponible?” Explain the selected account/pocket and its category allocation using the P2-verified source of truth.

Do not answer until the underlying view/query is correct and reconciled under P2. Only `confirmada` movements affect calculations. Pending, duplicate, discarded, or unclassified data must not silently enter totals.

## Privacy-first initial architecture

- Prefer a deterministic local intent parser and allowlisted, user-scoped aggregate queries for the first version. The first questions are narrow enough to avoid sending personal data to a model.
- Use the authenticated server session and existing RLS boundaries. Never use a service-role client for member-facing assistant queries.
- Expose named, read-only operations such as category totals and description search. Do not accept arbitrary SQL, table names, or generated database code.
- Return provenance with every answer: period, filters, included states, relevant account/pocket/category, and a link to the matching records. Do not fabricate an answer when records are insufficient.
- The assistant cannot create, edit, delete, transfer, or confirm financial records. Do not include prediction, investment, tax, credit, or personalized financial-advice claims in the initial scope.
- Minimize prompt/log retention. Do not log descriptions, amounts, receipts, message bodies, auth tokens, or generated answers that reproduce personal finance data.

## External-model restriction

Current source has integrations that can send receipt images/OCR text and allowlisted email bodies to Google Gemini, and images to a configurable PaddleOCR endpoint. They are not approved provider configurations. Source-level gates now block these calls by default unless explicit server-side approval flags are enabled. Production environment state and provider settings were not inspected.

Google's Gemini API terms state that unpaid services may use submitted content and responses to improve products and may involve human review; the terms warn against submitting sensitive, confidential, or personal information. The pricing page likewise says Free Tier content is used to improve products. This conflicts with the platform's sensitive personal financial data and current free-only constraint. Therefore, do not enable Gemini Free for private financial data or route assistant questions/records to it. Revisit only after an explicit provider, privacy, security, legal, consent, retention, and cost review; a paid tier would require a separate owner decision because paid resources are not currently authorized.

Sources (official/provider pages; reviewed 2026-11-13):

- Gemini API Additional Terms: <https://ai.google.dev/gemini-api/terms>
- Gemini API pricing and data-use tiers: <https://ai.google.dev/gemini-api/docs/pricing>
- Gemini API usage policies and abuse monitoring: <https://ai.google.dev/gemini-api/docs/usage-policies?hl=en>
- Gemini API billing: <https://ai.google.dev/gemini-api/docs/billing?hl=en>
- Competitor's developer-described AI feature: <https://play.google.com/store/apps/details?id=com.joxibe.finanzapp>

## Discovery and release gates

1. Complete and verify P2 calculations before defining assistant answers.
2. Interview intended users about questions, trust, ambiguity, and when a filter is preferable.
3. Build a synthetic-data prototype with rule-based intents; compare accuracy and task completion against dashboard/history filters.
4. Measure answer correctness, abstention on ambiguity, provenance comprehension, and time-to-answer. Do not launch if answers cannot be traced to the filtered records.
5. Complete privacy/threat review, abuse/rate controls, retention policy, and accessibility review before any real user data is processed.
6. Ask the owner to approve implementation scope and provider/data-processing policy separately. No approval is implied by this proposal.
