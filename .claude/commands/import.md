---
description: "Bring reservations across from RMS Cloud, or an outside calendar onto a site."
---
# Import

Read CLAUDE.md first. Use fresh data and run:

```bash
npm run park -- import rms <reservations.csv> [--date-order=dmy|mdy] [--apply]   |   import ical <site> <calendar.ics> --source=<name> [--apply]
```

Read docs/replace-rms-cloud.md. Always run without --apply first and show the counts and notes; apply only on a yes.

Answer in plain language, tables for numbers, in the park's currency. Ambiguous names list the candidates and exit 1: ask which one. Never invent a booking, a rate, a payment, a meter reading or a guest detail. Nothing here sends a message or charges a card: drafts go to drafts/ and a person acts.
