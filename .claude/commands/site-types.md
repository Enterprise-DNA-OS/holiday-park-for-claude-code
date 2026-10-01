---
description: "Each site type with its base rate, who it covers and the extra adult and child charges."
---
# Site types

Read CLAUDE.md first. Use fresh data and run:

```bash
npm run park -- site-types
```

Answer in plain language, tables for numbers, in the park's currency. Ambiguous names list the candidates and exit 1: ask which one. Never invent a booking, a rate, a payment, a meter reading or a guest detail. Nothing here sends a message or charges a card: drafts go to drafts/ and a person acts.
