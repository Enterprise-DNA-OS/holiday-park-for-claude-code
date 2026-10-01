---
description: "End of day: who is on site tonight, casual and long-stay, the no-shows to decide, tomorrow's arrivals."
---
# Night audit

Read CLAUDE.md first. Use fresh data and run:

```bash
npm run park -- night-audit
```

Then print the on-site register: npm run docs -- on-site-register.

Answer in plain language, tables for numbers, in the park's currency. Ambiguous names list the candidates and exit 1: ask which one. Never invent a booking, a rate, a payment, a meter reading or a guest detail. Nothing here sends a message or charges a card: drafts go to drafts/ and a person acts.
