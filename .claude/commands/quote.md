---
description: "Price a stay before booking it: the rate each night plus extra adults and children."
---
# Quote

Read CLAUDE.md first. Use fresh data and run:

```bash
npm run park -- quote <site type> <check-in> <nights|check-out> [--adults=] [--children=] [--rate=]
```

Say whether that site type is free for every night.

Answer in plain language, tables for numbers, in the park's currency. Ambiguous names list the candidates and exit 1: ask which one. Never invent a booking, a rate, a payment, a meter reading or a guest detail. Nothing here sends a message or charges a card: drafts go to drafts/ and a person acts.
