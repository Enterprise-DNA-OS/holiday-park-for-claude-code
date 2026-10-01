---
description: "Which cabins and units to clean first today: arrivals first, then check-outs, then stayovers."
---
# Cabin cleaning

Read CLAUDE.md first. Use fresh data and run:

```bash
npm run park -- housekeeping
```

Sites are not cleaned. For a printable sheet: npm run docs -- cabin-cleaning-sheet. Mark each done with /site-status.

Answer in plain language, tables for numbers, in the park's currency. Ambiguous names list the candidates and exit 1: ask which one. Never invent a booking, a rate, a payment, a meter reading or a guest detail. Nothing here sends a message or charges a card: drafts go to drafts/ and a person acts.
