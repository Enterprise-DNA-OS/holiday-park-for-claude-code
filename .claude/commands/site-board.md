---
description: "Every site tonight: taken, arriving, free or out of order, with who is on it. The tape chart as a table."
---
# Site board

Read CLAUDE.md first. Use fresh data and run:

```bash
npm run park -- site-board
```

Group by area when the operator asks for the map view.

Answer in plain language, tables for numbers, in the park's currency. Ambiguous names list the candidates and exit 1: ask which one. Never invent a booking, a rate, a payment, a meter reading or a guest detail. Nothing here sends a message or charges a card: drafts go to drafts/ and a person acts.
