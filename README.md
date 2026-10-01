<h1 align="center">Holiday Park for Claude Code</h1>

<p align="center">
  <strong>The open-source holiday park and campground management system that is just a database and Claude Code.</strong>
</p>

<p align="center">
  Created by <a href="https://www.enterprisedna.co"><strong>Enterprise DNA</strong></a>. Free and open source. Works with Claude Code, Codex, OpenCode or Cursor.
</p>

<!-- three-doors -->
<table align="center">
  <tr>
    <td align="center"><strong>Do it yourself</strong><br/>Clone it, run it, own it. Free, MIT.<br/><a href="#quick-start">Quick start</a></td>
    <td align="center"><strong>We customise it</strong><br/>Your sites, your rates, your long stays and your RMS Cloud data brought across.<br/><a href="https://enterprisedna.co/omni/book/?utm_source=github&utm_medium=readme&utm_campaign=rms-cloud">Book a call</a></td>
    <td align="center"><strong>We run it for you</strong><br/>Installed, connected and operated inside Omni. Setup fee, then a retainer.<br/><a href="https://enterprisedna.co/omni/instead-of/rms-cloud?utm_source=github&utm_medium=readme&utm_campaign=rms-cloud">How it works</a></td>
  </tr>
</table>

<p align="center">
  <a href="#what-is-this">What is this</a> &bull;
  <a href="#why-no-front-end">Why no front end</a> &bull;
  <a href="#quick-start">Quick start</a> &bull;
  <a href="#the-commands">Commands</a> &bull;
  <a href="#instead-of-rms-cloud">Instead of RMS Cloud</a> &bull;
  <a href="#want-it-installed-and-run-for-you">Installed for you</a> &bull;
  <a href="#license">License</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node-20+-339933?style=flat-square" alt="Node 20+" />
  <img src="https://img.shields.io/badge/PostgreSQL-any-336791?style=flat-square" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/PGlite-embedded-3ecf8e?style=flat-square" alt="PGlite" />
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=flat-square" alt="MIT License" />
</p>

---

## What is this

Holiday Park for Claude Code does the job you pay RMS Cloud for, as a Postgres database and a set of agent commands. There is no web front end. You open the folder in [Claude Code](https://claude.com/claude-code) (or Codex, OpenCode, Cursor: see `AGENTS.md`) and ask for what you want in plain language. It runs the right query, and it can answer questions the RMS Cloud dashboard cannot.

RMS Cloud does not publish a price. Its pricing page lists two plans for parks and campgrounds, Accelerate for medium-sized parks and Elevate for multi-property groups, each with "Request a quote", and interactive maps, utilities metering and API access sit inside particular plans or as add-ons ([rmscloud.com/pricing-plans](https://www.rmscloud.com/pricing-plans), read 1 October 2026). You find out what a park pays after a discovery call, and you pay it every year.

Want the same thing with a web front end, or built on a different stack? That is a customisation, and it is exactly what Enterprise DNA does: [book a call](https://enterprisedna.co/omni/book/?utm_source=github&utm_medium=readme&utm_campaign=rms-cloud).

It covers the office of a holiday park, caravan park or campground: powered, unpowered and ensuite sites, cabins and units, rates with extra adults and children, casual bookings night by night with van lengths and regos, folios and tax invoices with GST worked out (including the reduced value for long stays in New Zealand and the long-term concession in Australia), cabin cleaning, and the long-stay side most park software treats as an afterthought: permanent residents, annual holiday vans and seasonal workers on agreements, with weekly or yearly site fees, power on-charged from the meter, arrears, and the paperwork the tenancy and holiday park laws ask for. It is built for owner-operated parks of 20 to 200 sites in New Zealand and Australia.

## What it does every day and every week

- **Morning in the office** (`/attention`, `/arrivals`, `/site-board`): who arrives with no site, which motorhome is too long for the site it was sold, which cabin has a guest coming and is not clean.
- **Check-in and check-out** (`/check-in`, `/charge`, `/pay`, `/check-out`): rego recorded, the folio, the balance, the tax invoice, the cabin back on the cleaning list.
- **Long-stay billing** (`/long-stay-billing`): the week's site fees posted for every permanent and seasonal, arrears shown in days of fees, a friendly reminder drafted.
- **The meter run** (`/meter-run`): the sheet of meters to read, each reading entered, power used since the last bill on-charged to the account.
- **The night audit** (`/night-audit`): who is in the park tonight, casual and long-stay, the arrivals that never came, and the on-site register printed.
- **Monday review** (`/weekly-review`): soft weeks ahead by site type, this week's pickup, long-stay accounts behind, and what each channel cost in commission.

## Ten questions the RMS Cloud dashboard does not answer out of the box

RMS has reports of its own. These are questions you can ask here in plain words, each answered by a command today, and you can change any of them.

1. Which long-stay accounts are behind, by how many days of fees, and when did each last pay? `/arrears`
2. Which metered sites are due a reading, and how much power is used but not yet billed? `/meters`
3. Which long stays have no signed agreement, or no decision on which tenancy law covers them? `/compliance`
4. Which vans arriving this week are longer than the site they were sold? `/attention`
5. Which sites are sold twice, across our bookings, our long stays and the Booking.com calendar? `/conflicts`
6. What was casual occupancy each month once the long-stay sites are taken out? `/occupancy`
7. Which weeks in the next three months look soft, by site type? `/forecast`
8. What did each booking channel earn us after commission this year? `/channel-mix`
9. Who is in the park tonight, casual and long-stay, with their vehicle registrations? `/night-audit`, then the on-site register
10. Which regulars still book through a commission channel instead of coming to us direct? `/repeat-guests`

## Your first hour: ten things to ask for

1. "Put our name, logo and colours on the invoices, statements and arrival cards" (edit `brand.json`, then `npm run docs`).
2. "Set us up: 60 powered sites, 20 tent sites, eight cabins, these rates, our GST number and our camping ground registration."
3. "Add our summer peak rates with a three-night minimum over Christmas and New Year."
4. "Import our RMS reservations export as a test run."
5. "Set up our twelve permanents and their weekly fees, and bring across what each one owes."
6. "What needs doing this morning?"
7. "Book the Hendersons onto a powered site for four nights from Friday, 8.5 metre caravan, and draft their confirmation."
8. "Here are this month's meter readings: bill the power."
9. "Who is behind on their site fees, and draft them a reminder."
10. "Add a dog field to bookings and a pet charge per night." (`/customise`)

## Why no front end

- The front end was only ever there because the database was hard to talk to. That is no longer true.
- Your data sits in plain Postgres tables you own. Any tool can read them. No export, no lock-in.
- No seats, no modules, no quote to renew. Read [docs/why-no-front-end.md](docs/why-no-front-end.md) for the honest trade-offs too.

## Quick start

Sixty seconds, no database install (an embedded Postgres runs inside Node):

```bash
git clone https://github.com/Enterprise-DNA-OS/holiday-park-for-claude-code.git
cd holiday-park-for-claude-code
npm install
npm run demo
```

Then open the folder in Claude Code and type `/attention` to see what needs a decision this morning, or `/site-board` for every site tonight. The demo is Riverbend Holiday Park, a fictional park beside the Motueka River with 23 sites, cabins and units, six months of stays behind it, an 11.5 metre motorhome arriving with no site, a fifth-wheeler sold a site too short for it, a casual booking on an annual van's site, a picking crew 56 nights into a stay, a seasonal worker three weeks behind, a meter not read in 50 days and the camping ground registration due for renewal.

### Use it with your own Postgres or Supabase

Copy `.env.example` to `.env`, set `DATABASE_URL`, then `npm run migrate`. Same commands, shared data, no per-seat fee.

## The commands

| Command | What it does |
|---|---|
| `/attention` | Everything needing a decision today |
| `/weekly-review` | The Monday review: soft weeks, pickup, long-stay arrears, channels |
| `/arrivals`, `/departures`, `/in-house` | Who arrives, leaves and stays, with van lengths, regos and balances |
| `/site-board` | Every site tonight: taken, arriving, free or out of order |
| `/housekeeping`, `/site-status` | The cabin cleaning list; mark cabins clean or take any site out of order |
| `/night-audit` | End of day: who is on site, not arrived, tomorrow's arrivals |
| `/availability`, `/quote`, `/book` | Sites free by night; price a stay with extra people; take a booking or enquiry |
| `/assign`, `/move`, `/change-dates` | Put a booking on a site that fits the van, move it, change its dates |
| `/check-in`, `/check-out` | Arrive and leave, with the tax invoice issued at check-out |
| `/charge`, `/pay`, `/refund` | The folio: linen, gas, shop, payments, refunds recorded |
| `/cancel`, `/no-show` | With a fee when your terms allow one |
| `/booking`, `/guest`, `/bookings` | One stay, one guest, the next 60 days |
| `/balances`, `/deposits`, `/conflicts` | Who owes on casual stays, deposits due, sites sold twice |
| `/agreements`, `/agreement`, `/agree`, `/end-agreement`, `/give-notice` | Long stays: the list, one account, start one, end one, record notice |
| `/long-stay-billing`, `/bill-residents`, `/pay-account`, `/charge-account`, `/arrears` | Site fees posted, payments and other charges, who is behind |
| `/meter-run`, `/meters`, `/read-meter`, `/bill-power` | Power meters read and on-charged |
| `/occupancy`, `/forecast`, `/pickup` | Casual and long-stay occupancy; the weeks ahead; this week's bookings |
| `/channel-mix`, `/repeat-guests`, `/cancellations` | What each channel really earns; regulars; lost bookings |
| `/compliance` | Registration, tenancy thresholds, NSW and Victorian park paperwork, long-stay GST, invoice details, privacy, each with its source |
| `/invoices`, `/sites`, `/site-types`, `/rates`, `/channels`, `/guests`, `/blocks` | The records |
| `/draft-confirmation`, `/draft-prearrival`, `/draft-deposit-reminder`, `/draft-review-request`, `/draft-arrears-reminder` | Emails drafted to `drafts/`. Nothing sends |
| `/import`, `/ical-export`, `/export` | RMS and iCal in; calendars out; everything out |
| `/add`, `/set`, `/log`, `/activity` | Add or change any record or setting; notes; the audit trail |
| `/customise`, `/new-view` | Make it yours; add a dashboard page |

`npm run view` renders the `today`, `long-stays` and `performance` dashboards to `views/`. `npm run docs` renders tax invoices, site account statements, arrival cards, the cabin cleaning sheet, the on-site register and the meter sheet to `docs-out/`, in your brand. Full reference: [docs/cli.md](docs/cli.md).

## Instead of RMS Cloud

Set up your site types and sites with the names RMS uses for its Categories and Areas, export your reservations from the Reservation Made/Modified report (Export To CSV) or Report Writer, then:

```bash
npm run park -- import rms reservations.csv --date-order=dmy            # a dry run first
npm run park -- import rms reservations.csv --date-order=dmy --apply
npm run park -- agree "Bev Thompson" L1 resident 2024-07-24 --fee=210   # each long-stay occupant
npm run park -- import ical "Cabin 4" cabin-4.ics --source=bookingcom --apply
```

Guests are matched by email, new site types and channels are created, every original column is kept, and a second run adds nothing. Reservations marked Long Term are listed so you can set each up as an agreement with its opening balance. [docs/replace-rms-cloud.md](docs/replace-rms-cloud.md) has the column map and what does not carry over.

## Checks, not advice

[docs/compliance.md](docs/compliance.md) lists every record check with its source: the Camping-Grounds Regulations, the Residential Tenancies Act, the NSW Holiday Parks (Long-term Casual Occupation) Act, Consumer Affairs Victoria, Inland Revenue, the ATO and the Privacy Commissioner. A clean check means the records are complete, not that the park meets the law. Nothing here sends email, charges a card or pushes to a channel: drafts go to `drafts/` and a person acts.

## Architecture

```
holiday-park-for-claude-code/
  CLAUDE.md                 how the operator wants this run (routing table + house rules)
  AGENTS.md                 the same, for Codex / OpenCode / Cursor / Gemini CLI
  .claude/commands/         the slash commands
  scripts/park.mjs          the CLI the commands drive
  scripts/lib/domain.mjs    every report as one query
  scripts/lib/import.mjs    the RMS and iCal importers, the iCal export
  scripts/lib/db.mjs        one adapter: DATABASE_URL (pg) or embedded PGlite
  supabase/migrations/      plain SQL schema
  supabase/seed.sql         demo data
  docs/                     compliance sources, the RMS guide, the CLI reference
  views.json, documents.json  dashboards and paperwork, rendered in brand.json
```

## Built for coding agents

The database, CLI and command recipes work with Claude Code, Codex, OpenCode or Cursor. Ask your coding agent for a new command and have it implement and test the change against the same records.

## Contributing

Issues and pull requests are welcome. Keep the shape: plain SQL, a small CLI, a slash command per recurring job, no front end.

## Want it installed and run for you?

Enterprise DNA installs Holiday Park for Claude Code for your park, migrates your RMS Cloud data, sets up your long stays, connects it to the rest of your tools, and runs it for you as part of **Omni**, our managed Command Center. One setup fee, then a monthly retainer.

- Book a call: [enterprisedna.co/omni/book](https://enterprisedna.co/omni/book/?offer=replace-software&utm_source=github&utm_medium=readme&utm_campaign=rms-cloud)
- Read more: [enterprisedna.co/omni/instead-of/rms-cloud](https://enterprisedna.co/omni/instead-of/rms-cloud?utm_source=github&utm_medium=readme&utm_campaign=rms-cloud)

## License

MIT. Copyright (c) 2026 Enterprise DNA. Not affiliated with RMS Cloud, Booking.com, Inland Revenue, the ATO or Anthropic. RMS Cloud is a trademark of its owner.
