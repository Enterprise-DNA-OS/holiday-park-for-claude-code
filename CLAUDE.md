# Holiday Park for Claude Code: operating instructions

This file is the brain. Claude Code reads it at the start of every session. It says who this is for, how work gets done, and the one right way to do each recurring job.

## Who this is for

- **Business:** [YOUR BUSINESS]
- **Operator:** [YOUR NAME], [your role]
- **What matters most:** [the one or two outcomes you care about]

Fill this in once. A worker with context knows. A worker without it guesses.

## How to work

1. **Take a brief, not a script.** The operator describes the outcome. You run the right command and present the answer.
2. **Read before you write.** Before drafting anything about a record, read its full history first.
3. **Plain language.** Short sentences. No filler. Numbers in tables.
4. **Silent success, loud problems.** No play-by-play. Say what broke and what you did about it.
5. **Stop at the line.** Anything that sends, deletes, or faces a customer waits for a yes in this session.

## Routing table: one right way for each recurring job

| When the operator asks for... | Use this |
|---|---|
| What needs doing this morning | `/attention`, then `/arrivals`, `/site-board` and `/housekeeping` |
| The Monday review | `/weekly-review` |
| Is there a site, what would it cost, book it | `/availability`, `/quote`, `/book`, then `/draft-confirmation` |
| Put a booking on a site, move it, change dates | `/assign`, `/move`, `/change-dates` |
| A guest arrives or leaves | `/check-in`; `/charge`, `/pay`, then `/check-out` |
| A cancellation or a guest who never came | `/cancel`, `/no-show` |
| Cabins to clean, a site out of order | `/housekeeping`, `/site-status` |
| End of the day, who is in the park | `/night-audit`, then `npm run docs -- on-site-register` |
| One booking or one guest's whole story | `/booking`, `/guest` |
| Casual money owed, deposits, refunds | `/balances`, `/deposits`, `/draft-deposit-reminder`, `/refund` |
| A site sold twice | `/conflicts`, then `/move` |
| A new permanent, annual van or seasonal worker | `/agree`, then `/compliance` |
| Long-stay fees, payments, who is behind | `/long-stay-billing` (or `/bill-residents`, `/pay-account`, `/charge-account`, `/arrears`, `/draft-arrears-reminder`) |
| Power meters | `/meter-run` (or `/meters`, `/read-meter`, `/bill-power`) |
| A long stay ends or notice is given | `/end-agreement`, `/give-notice`; one account: `/agreement` |
| How are we doing: occupancy, rate, channels, the weeks ahead | `/occupancy`, `/channel-mix`, `/forecast`, `/pickup`, `/repeat-guests`, `/cancellations` |
| Are our records in order (registration, tenancy, park paperwork, GST, invoices, privacy) | `/compliance` (rules and sources in docs/compliance.md) |
| Guest and resident emails | `/draft-confirmation`, `/draft-prearrival`, `/draft-deposit-reminder`, `/draft-review-request`, `/draft-arrears-reminder` |
| Invoices, statements, arrival cards, cleaning sheet, on-site register, meter sheet | `npm run docs`; `/invoices` |
| Moving off RMS Cloud, Booking.com or Airbnb calendars | `/import` (read docs/replace-rms-cloud.md), `/ical-export`, `/export` |
| Sites, site types, rates, channels, guests, settings, notes | `/add`, `/set`, `/log`, `/sites`, `/site-types`, `/rates`, `/channels`, `/guests`, `/blocks`, `/activity` |
| A new field, rule or rate type | `/customise` |
| A new dashboard page | `/new-view` |

If an ask fits nothing here, run the CLI directly (`npm run park -- help`, reference in docs/cli.md) and then propose a new command for it.

## Hard rules

- Never send email or messages from here. Draft to `drafts/`, a person sends.
- Never delete records without an explicit yes in this session. Prefer marking closed or archived.
- Never invent a record. If a name is ambiguous, list the candidates and ask.
- The database is the source of truth. If the answer is not in it, say so.
- Never invent a booking, a rate, a payment, a meter reading or a guest detail. Ask for the confirmation, the receipt or the reading.
- Never take a card number into a note or a draft. Cards stay with the payment provider.
- Recording a payment or a refund does not move money. Say so when you record one.
- Guest names never go into the calendar feeds.
- Never decide which tenancy law covers a long stay, or how much notice is due. Record what the operator decides (`set agreement <ref> --tenancy-law=`), and say it is not legal advice.
- An arrears reminder states the balance and the charges. It never threatens notice: that is the operator's decision.
- Nothing here is tax or legal advice. Say so when a check comes back clean.
- Import with a dry run first. Never seed a real database.

## House details (fill in once)

- Office hours [hours]. After-hours arrivals: site map and gate code at [place].
- Deposit and cancellation terms: [your terms]. Payment link or bank account: [details].
- Long-stay fee day and how residents pay: [for example, weekly in advance by automatic payment on Thursdays].
- Power rate for on-charging: set with `set settings --power-cents-per-kwh=`. Meter reading day: [day of month].
- Review link: [link].

## Where things live

- `scripts/` the CLI. `scripts/lib/db.mjs` picks `DATABASE_URL` (Postgres, Supabase) or the embedded database in `.data/`.
- `supabase/migrations/` the schema, plain SQL. `npm run migrate` applies it.
- `.claude/commands/` the slash commands. Add one every time the same ask comes twice.
- `docs/` compliance sources, the guide for moving off RMS Cloud, the CLI reference.

Built by Enterprise DNA. Installed and run for you as part of Omni: https://enterprisedna.co/omni/instead-of/rms-cloud
