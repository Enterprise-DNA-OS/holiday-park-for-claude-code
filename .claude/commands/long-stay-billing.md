---
description: "The long-stay billing run: post the site fees due, bill power, show who is behind and draft the reminders."
---
# Long-stay billing

Read CLAUDE.md first. Run in order:

```bash
npm run park -- bill-residents
npm run park -- meters
npm run park -- arrears
```

1. Show what was billed to each agreement.
2. If any meter reading is due, stop and offer /meter-run before billing power; otherwise run `npm run park -- bill-power`.
3. Show the arrears table. Offer `npm run park -- draft-arrears-reminder` for accounts more than a week behind, and `npm run docs -- site-account-statement` for the statements.

Billing twice is safe: a period is never posted twice. Answer in plain language, tables for numbers, in the park's currency. Ambiguous names list the candidates and exit 1: ask which one. Never invent a booking, a rate, a payment, a meter reading or a guest detail. Nothing here sends a message or charges a card: drafts go to drafts/ and a person acts.
