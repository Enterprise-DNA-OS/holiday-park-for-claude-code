---
description: "Record that notice was given on a long-stay agreement, with the reason."
---
# Give notice

Read CLAUDE.md first. Use fresh data and run:

```bash
npm run park -- give-notice <agreement> --reason= [--on=]
```

Notice periods depend on which law covers the agreement. Say which law is recorded; if none is, say the notice may not be valid until that is decided. Not legal advice.

Answer in plain language, tables for numbers, in the park's currency. Ambiguous names list the candidates and exit 1: ask which one. Never invent a booking, a rate, a payment, a meter reading or a guest detail. Nothing here sends a message or charges a card: drafts go to drafts/ and a person acts.
