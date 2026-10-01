---
description: "Set up a long-stay agreement on a site: resident, annual or seasonal, fee and period, paperwork dates, starting meter reading."
---
# Start a long stay

Read CLAUDE.md first. Use fresh data and run:

```bash
npm run park -- agree "<occupant>" <site> <resident|annual|seasonal> <start date> --fee= [--period=week|fortnight|month|year] [--ends-on=] [--occupants=] [--park-dwelling] [--main-residence] [--bond=] [--kwh=] [--signed-on=] [--disclosure-given-on=] [--rules-given-on=] [--rego=]
```

Ask for the signed agreement date and the disclosure and park rules dates; record what is missing rather than guessing. Then run /compliance.

Answer in plain language, tables for numbers, in the park's currency. Ambiguous names list the candidates and exit 1: ask which one. Never invent a booking, a rate, a payment, a meter reading or a guest detail. Nothing here sends a message or charges a card: drafts go to drafts/ and a person acts.
