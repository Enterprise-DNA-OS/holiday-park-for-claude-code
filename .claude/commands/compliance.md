---
description: "Check the records against the rules a holiday park lives under, each rule cited in docs/compliance.md."
---
# Compliance

Read CLAUDE.md first. Use fresh data and run:

```bash
npm run park -- compliance
```

Read docs/compliance.md first. Report breached first, then due soon. For each, draft the fix the operator can approve. If a rule looks out of date, say so and stop: do not guess at law. A clean result means the records are complete, not that the law is met. Nothing here is legal or tax advice.

Answer in plain language, tables for numbers, in the park's currency. Ambiguous names list the candidates and exit 1: ask which one. Never invent a booking, a rate, a payment, a meter reading or a guest detail. Nothing here sends a message or charges a card: drafts go to drafts/ and a person acts.
