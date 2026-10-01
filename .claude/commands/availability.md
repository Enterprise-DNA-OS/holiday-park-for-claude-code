---
description: "Sites free by type, night by night."
---
# Availability

Read CLAUDE.md first. Use fresh data and run:

```bash
npm run park -- availability [--from=YYYY-MM-DD] [--nights=14]
```

A negative number means more unassigned bookings than sites: say so plainly.

Answer in plain language, tables for numbers, in the park's currency. Ambiguous names list the candidates and exit 1: ask which one. Never invent a booking, a rate, a payment, a meter reading or a guest detail. Nothing here sends a message or charges a card: drafts go to drafts/ and a person acts.
