---
description: "Record a power meter reading on a long-stay site."
---
# Read a meter

Read CLAUDE.md first. Use fresh data and run:

```bash
npm run park -- read-meter <site> <kWh> [--on=] [--by=]
```

A reading below the last one is refused: check the meter.

Answer in plain language, tables for numbers, in the park's currency. Ambiguous names list the candidates and exit 1: ask which one. Never invent a booking, a rate, a payment, a meter reading or a guest detail. Nothing here sends a message or charges a card: drafts go to drafts/ and a person acts.
