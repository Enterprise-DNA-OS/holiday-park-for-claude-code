---
description: "Change a booking's dates, or extend a guest already on site."
---
# Change dates

Read CLAUDE.md first. Use fresh data and run:

```bash
npm run park -- change-dates <booking> <check-in> <nights|check-out>   (on site: change-dates <booking> <check-out>)
```

Nights already slept keep their rate.

Answer in plain language, tables for numbers, in the park's currency. Ambiguous names list the candidates and exit 1: ask which one. Never invent a booking, a rate, a payment, a meter reading or a guest detail. Nothing here sends a message or charges a card: drafts go to drafts/ and a person acts.
