---
description: "Every permanent resident, annual van and seasonal worker: site, fee, billed to, balance, paperwork and which law covers it."
---
# Long-stay agreements

Read CLAUDE.md first. Use fresh data and run:

```bash
npm run park -- agreements
```

Point out any agreement not signed or with the law not decided, and run /compliance for the detail.

Answer in plain language, tables for numbers, in the park's currency. Ambiguous names list the candidates and exit 1: ask which one. Never invent a booking, a rate, a payment, a meter reading or a guest detail. Nothing here sends a message or charges a card: drafts go to drafts/ and a person acts.
