---
description: "Record the last night of a long-stay agreement; the last part-period bills by the day."
---
# End a long stay

Read CLAUDE.md first. Use fresh data and run:

```bash
npm run park -- end-agreement <agreement> <last night>
```

Run /long-stay-billing after, and say what is owing or in credit.

Answer in plain language, tables for numbers, in the park's currency. Ambiguous names list the candidates and exit 1: ask which one. Never invent a booking, a rate, a payment, a meter reading or a guest detail. Nothing here sends a message or charges a card: drafts go to drafts/ and a person acts.
