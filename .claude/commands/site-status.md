---
description: "Mark a cabin clean, dirty or inspected, or take any site out of order and bring it back."
---
# Site status

Read CLAUDE.md first. Use fresh data and run:

```bash
npm run park -- site-status <site> <clean|dirty|inspected|out_of_order> [--reason=] [--until=] [--by=]
```

Out of order needs a reason and lists the bookings to move.

Answer in plain language, tables for numbers, in the park's currency. Ambiguous names list the candidates and exit 1: ask which one. Never invent a booking, a rate, a payment, a meter reading or a guest detail. Nothing here sends a message or charges a card: drafts go to drafts/ and a person acts.
