---
description: "Change a site type, site, rate, channel, guest, booking, agreement or the park settings."
---
# Change a record

Read CLAUDE.md first. Use fresh data and run:

```bash
npm run park -- set <type> <name> --field=value ...   |   set settings --field=value
```

Answer in plain language, tables for numbers, in the park's currency. Ambiguous names list the candidates and exit 1: ask which one. Never invent a booking, a rate, a payment, a meter reading or a guest detail. Nothing here sends a message or charges a card: drafts go to drafts/ and a person acts.
