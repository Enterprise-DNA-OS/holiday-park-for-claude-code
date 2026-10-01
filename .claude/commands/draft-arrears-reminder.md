---
description: "Draft a friendly reminder for long-stay accounts behind, or one account."
---
# Draft an account reminder

Read CLAUDE.md first. Use fresh data and run:

```bash
npm run park -- draft-arrears-reminder [agreement] [--days=7]
```

Read the agreement first. The draft states the balance and recent charges, never a threat.

Answer in plain language, tables for numbers, in the park's currency. Ambiguous names list the candidates and exit 1: ask which one. Never invent a booking, a rate, a payment, a meter reading or a guest detail. Nothing here sends a message or charges a card: drafts go to drafts/ and a person acts.
