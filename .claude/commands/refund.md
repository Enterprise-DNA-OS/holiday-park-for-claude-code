---
description: "Record a refund on a booking."
---
# Refund

Read CLAUDE.md first. Use fresh data and run:

```bash
npm run park -- refund <booking> <amount> [--method=] [--reference=]
```

Recording a refund does not move money: the card provider or bank does that.

Answer in plain language, tables for numbers, in the park's currency. Ambiguous names list the candidates and exit 1: ask which one. Never invent a booking, a rate, a payment, a meter reading or a guest detail. Nothing here sends a message or charges a card: drafts go to drafts/ and a person acts.
