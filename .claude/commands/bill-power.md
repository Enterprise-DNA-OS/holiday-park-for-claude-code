---
description: "On-charge the power each metered long-stay site used since its last bill."
---
# Bill power

Read CLAUDE.md first. Use fresh data and run:

```bash
npm run park -- bill-power [--rate=<cents per kWh>]
```

The first reading on a new agreement sets the baseline and charges nothing.

Answer in plain language, tables for numbers, in the park's currency. Ambiguous names list the candidates and exit 1: ask which one. Never invent a booking, a rate, a payment, a meter reading or a guest detail. Nothing here sends a message or charges a card: drafts go to drafts/ and a person acts.
