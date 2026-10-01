---
description: "Everything that needs a decision today, from every part of the park."
---
# Attention

Read CLAUDE.md first. Use fresh data and run:

```bash
npm run park -- attention
```

Group by reason. For each, say the next action and the command that does it (assign, move, pay, check-out, no-show, site-status, bill-residents, read-meter, draft-arrears-reminder).

Answer in plain language, tables for numbers, in the park's currency. Ambiguous names list the candidates and exit 1: ask which one. Never invent a booking, a rate, a payment, a meter reading or a guest detail. Nothing here sends a message or charges a card: drafts go to drafts/ and a person acts.
