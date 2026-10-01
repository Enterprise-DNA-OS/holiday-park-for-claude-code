---
description: "The monthly meter walk: what to read, record each reading, then bill the power used."
---
# Meter run

Read CLAUDE.md first.

1. Run `npm run park -- meters` and list the sites to read, overdue first. For a sheet to carry: `npm run docs -- meter-sheet`.
2. For each reading the operator gives you, run `npm run park -- read-meter <site> <kWh> --by=<name>`. A reading below the last one is refused: ask them to check the meter, never adjust the number.
3. When every reading is in, run `npm run park -- bill-power` and show what each site was charged.
4. Offer the statements: `npm run docs -- site-account-statement`.

Answer in plain language, tables for numbers, in the park's currency. Ambiguous names list the candidates and exit 1: ask which one. Never invent a booking, a rate, a payment, a meter reading or a guest detail. Nothing here sends a message or charges a card: drafts go to drafts/ and a person acts.
