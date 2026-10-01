---
description: "Post every long-stay site fee period that has started, up to today."
---
# Bill site fees

Read CLAUDE.md first. Use fresh data and run:

```bash
npm run park -- bill-residents [agreement] [--through=YYYY-MM-DD]
```

Safe to run any number of times: a period is never billed twice.

Answer in plain language, tables for numbers, in the park's currency. Ambiguous names list the candidates and exit 1: ask which one. Never invent a booking, a rate, a payment, a meter reading or a guest detail. Nothing here sends a message or charges a card: drafts go to drafts/ and a person acts.
