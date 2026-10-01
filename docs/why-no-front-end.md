# Why there is no front end

RMS Cloud is a database with a subscription. The records underneath it are ordinary: sites, site types, rates, guests, reservations, payments, long-term accounts, meter readings. What you pay for is the layer on top that lets people who do not write SQL get at those records. Screens, filters, a tape chart, a park map, dashboards.

That layer used to be the whole product, because talking to a database was hard. It is not hard any more. Open this folder in Claude Code, describe what you want, and it writes the query, runs it, and explains the answer. Ask a question RMS never had a report for and you still get an answer.

## What you gain

- **Better answers.** "Which long-stay accounts are more than two weeks behind, and when did each last pay?" is one question, not three reports.
- **No seats, no modules.** Everyone in the office can look. Utilities metering, accounts and reporting are not separate tiers.
- **Your data in your Postgres.** Plain tables. Back them up, query them from anything, leave any time.
- **A park that runs your way.** Your site types, your extra-person charges, your long-stay rules. When something changes, you add a command or a field with `/customise`.

## What you give up

- **The tape chart and the park map.** RMS lets you drag a booking across a chart and shows sites on a map. Here you ask: `/site-board`, `/availability`, then `/move`.
- **A live channel manager.** RMS pushes rates and availability to the online travel agents. The free version keeps cabin calendars in step by iCal, which is slower and does not carry rates. See docs/replace-rms-cloud.md.
- **A booking engine on your website, kiosks and self check-in.** Guests cannot book themselves in here. Enquiries come to you, and you book them.
- **Card payments.** Payments are recorded, not taken. Your EFTPOS terminal or payment provider takes the money.
- **A phone app.** It runs where Claude Code runs.
- **A vendor help desk.** This is open source. Enterprise DNA supports the installed version for parks that want someone to call.

## Who this fits

Parks whose office already lives in spreadsheets and email, or who would rather ask than learn another screen. If your bookings depend on a live channel connection or guests booking a site off a map, keep RMS, or have Enterprise DNA build those parts into your version. If you need the answers more than the screens, this is cheaper, faster and yours.

Installed and run for you: https://enterprisedna.co/omni/instead-of/rms-cloud
