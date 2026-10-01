---
description: "Sites sold twice: two bookings, a booking on a long-stay site, or a clash with a Booking.com or Airbnb calendar."
---
# Conflicts

Read CLAUDE.md first. Use fresh data and run:

```bash
npm run park -- conflicts
```

Offer /move for each.

Answer in plain language, tables for numbers, in the park's currency. Ambiguous names list the candidates and exit 1: ask which one. Never invent a booking, a rate, a payment, a meter reading or a guest detail. Nothing here sends a message or charges a card: drafts go to drafts/ and a person acts.
