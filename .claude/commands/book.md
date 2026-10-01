---
description: "Take a booking or an enquiry: guest, site type, dates, people, van length, channel, deposit."
---
# Book

Read CLAUDE.md first. Use fresh data and run:

```bash
npm run park -- book "<guest>" <site type> <check-in> <nights|check-out> [--site=] [--adults=] [--children=] [--van-length=] [--rego=] [--channel=] [--email=] [--phone=] [--rate=] [--deposit=] [--eta=] [--requests=] [--channel-ref=] [--long-stay] [--enquiry] [--new-guest]
```

Quote first if the guest has not agreed a price. Always ask a van, caravan or motorhome guest for the length. A stay past 50 days in New Zealand belongs on /agree, not here. Offer /draft-confirmation after.

Answer in plain language, tables for numbers, in the park's currency. Ambiguous names list the candidates and exit 1: ask which one. Never invent a booking, a rate, a payment, a meter reading or a guest detail. Nothing here sends a message or charges a card: drafts go to drafts/ and a person acts.
