---
description: "Site nights by month: casual, long-stay, occupancy, casual revenue and average rate, actual and on the books."
---
# Occupancy

Read CLAUDE.md first. Use fresh data and run:

```bash
npm run park -- occupancy
```

Casual occupancy leaves out the sites held by long-stay agreements; say which number you are quoting.

Answer in plain language, tables for numbers, in the park's currency. Ambiguous names list the candidates and exit 1: ask which one. Never invent a booking, a rate, a payment, a meter reading or a guest detail. Nothing here sends a message or charges a card: drafts go to drafts/ and a person acts.
