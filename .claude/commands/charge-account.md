---
description: "Put anything else on a long-stay account: water, a key, an opening balance brought across, or a credit."
---
# Long-stay charge or credit

Read CLAUDE.md first. Use fresh data and run:

```bash
npm run park -- charge-account <agreement> <amount> "<description>" [--kind=other|water|site_fee|power|credit] [--on=] [--reference=]
```

Site fees and power have their own runs (/bill-residents, /bill-power): use this for everything else. An opening balance from RMS is one line with kind other; money owed back is a credit.

Answer in plain language, tables for numbers, in the park's currency. Ambiguous names list the candidates and exit 1: ask which one. Never invent a booking, a rate, a payment, a meter reading or a guest detail. Nothing here sends a message or charges a card: drafts go to drafts/ and a person acts.
