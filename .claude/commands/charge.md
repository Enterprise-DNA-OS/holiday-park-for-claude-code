---
description: "Add an extra to a stay: linen, gas, shop, laundry, a fee or a discount."
---
# Charge

Read CLAUDE.md first. Use fresh data and run:

```bash
npm run park -- charge <booking> <amount> "<description>" [--kind=extra|linen|shop|laundry|gas|fee|discount|other] [--no-gst]
```

Answer in plain language, tables for numbers, in the park's currency. Ambiguous names list the candidates and exit 1: ask which one. Never invent a booking, a rate, a payment, a meter reading or a guest detail. Nothing here sends a message or charges a card: drafts go to drafts/ and a person acts.
