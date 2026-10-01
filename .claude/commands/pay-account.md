---
description: "Record a payment on a long-stay account."
---
# Long-stay payment

Read CLAUDE.md first. Use fresh data and run:

```bash
npm run park -- pay-account <agreement> <amount> [--method=bank|cash|card|eftpos] [--reference=] [--on=]
```

Recording a payment does not move money: say so.

Answer in plain language, tables for numbers, in the park's currency. Ambiguous names list the candidates and exit 1: ask which one. Never invent a booking, a rate, a payment, a meter reading or a guest detail. Nothing here sends a message or charges a card: drafts go to drafts/ and a person acts.
