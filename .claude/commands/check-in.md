---
description: "Check a guest in, onto their site or the best free one; record the rego."
---
# Check in

Read CLAUDE.md first. Use fresh data and run:

```bash
npm run park -- check-in <booking> [--site=] [--rego=]
```

A cabin that has not been cleaned is refused: mark it with /site-status first.

Answer in plain language, tables for numbers, in the park's currency. Ambiguous names list the candidates and exit 1: ask which one. Never invent a booking, a rate, a payment, a meter reading or a guest detail. Nothing here sends a message or charges a card: drafts go to drafts/ and a person acts.
