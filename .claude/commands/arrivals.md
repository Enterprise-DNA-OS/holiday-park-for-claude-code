---
description: "Who arrives today and tomorrow: site, van length, rego, ETA and balance."
---
# Arrivals

Read CLAUDE.md first. Use fresh data and run:

```bash
npm run park -- arrivals
```

Flag anyone with no site, a van longer than the site takes, or a balance to collect. Offer /assign for the unassigned.

Answer in plain language, tables for numbers, in the park's currency. Ambiguous names list the candidates and exit 1: ask which one. Never invent a booking, a rate, a payment, a meter reading or a guest detail. Nothing here sends a message or charges a card: drafts go to drafts/ and a person acts.
