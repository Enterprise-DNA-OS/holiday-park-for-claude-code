---
description: "Move a booking or a guest on site to another site."
---
# Move

Read CLAUDE.md first. Use fresh data and run:

```bash
npm run park -- move <booking> [site] [--force]
```

--force moves to another site type at the booked rate.

Answer in plain language, tables for numbers, in the park's currency. Ambiguous names list the candidates and exit 1: ask which one. Never invent a booking, a rate, a payment, a meter reading or a guest detail. Nothing here sends a message or charges a card: drafts go to drafts/ and a person acts.
