---
description: "Check a guest out and issue the tax invoice; a cabin goes on the cleaning list."
---
# Check out

Read CLAUDE.md first. Use fresh data and run:

```bash
npm run park -- check-out <booking> [--owing]
```

A balance stops it unless the operator says to leave it owing.

Answer in plain language, tables for numbers, in the park's currency. Ambiguous names list the candidates and exit 1: ask which one. Never invent a booking, a rate, a payment, a meter reading or a guest detail. Nothing here sends a message or charges a card: drafts go to drafts/ and a person acts.
