# The park CLI

`npm run park -- <command> [args] [--flags]`. Every slash command runs one of these. Output is a table; add `--json` for machines. Names match an exact id or name first, then a fragment of either. A booking matches its reference or the guest's name; an agreement matches its reference, the occupant's name or its site. Among several, the one still open wins. When more than one matches, the candidates are listed and the command exits 1. Dates are YYYY-MM-DD or day first (DD/MM/YYYY).

## Reports

| Command | What it answers |
|---|---|
| `attention` | Everything needing a decision: unassigned arrivals, double bookings, vans too long for their site, no-shows, overstays, balances, overdue deposits, missing invoices, quiet enquiries, cabins not ready, sites past their out-of-order date, long-stay arrears, site fees not billed, meter readings due, agreements ending, notice running |
| `arrivals`, `departures`, `in-house` | Today's and tomorrow's arrivals with van length, rego, ETA and balance; who is due out; who is on site |
| `site-board` | Every site tonight: taken, arriving, free or out of order, and who is on it |
| `housekeeping` | Cabins and units with the job each needs, arrivals first |
| `availability [--from=] [--nights=14]` | Sites free by type, night by night |
| `bookings` | Enquiries and bookings for the next 60 days |
| `booking <ref or guest>` | Nights and rates, charges, payments, balance, GST, invoice, notes |
| `guest <name>` | Details, every stay, any agreement, notes |
| `agreements` | Every active long stay: site, fee, billed to, balance, paperwork, law |
| `agreement <ref, occupant or site>` | One agreement and its account line by line, with the running balance |
| `arrears` | Long-stay accounts behind, in days of fees |
| `meters` | Metered long-stay sites: last reading, unbilled power, readings due |
| `balances`, `deposits` | Casual stays: who owes, who is owed; deposits paid, due, overdue |
| `conflicts` | Sites sold twice, against bookings, agreements and imported calendars |
| `occupancy` | Site nights by month: casual, long-stay, occupancy, casual revenue and average rate |
| `channel-mix` | Revenue, commission and net by channel, lead time, cancellations |
| `forecast`, `pickup` | Twelve weeks on the books by site type; bookings taken in the last seven days |
| `repeat-guests`, `cancellations` | Guests who come back; cancellations and no-shows with fees |
| `compliance` | The record checks in docs/compliance.md |
| `invoices`, `sites`, `site-types`, `rates`, `channels`, `guests`, `blocks` | The records |
| `weekly-review` | attention, forecast, pickup, long-stay arrears and channels together |
| `activity` | Notes and the audit trail |

## Actions

All actions run in one transaction and are written to `audit`. Money is entered in dollars and includes GST.

| Command | Notes |
|---|---|
| `quote <site type> <check-in> <nights\|check-out> [--adults=] [--children=] [--rate=]` | The rate plan covering each night (shortest first), else the base rate, plus extra adults and children beyond what the base covers. Minimum stays apply |
| `book "<guest>" <site type> <check-in> <nights\|check-out> [...]` | Flags: site, channel, email, phone, country, adults, children, van-length, rego, rate, deposit, eta, requests, channel-ref, long-stay, enquiry, new-guest, force. Refuses a site that is taken (by a booking, an agreement or an outside calendar), a type that is full, a van longer than the site, too many people, a past date or a do-not-rebook guest unless `--force`. Direct bookings carry the park deposit; OTA bookings none |
| `assign <booking> [site]`, `move <booking> [site]` | Best free site of the type: inspected, then clean, then the shortest that takes the van. `--force` moves to another type at the booked rate |
| `change-dates <booking> <check-in> <nights\|check-out>` | On site: `change-dates <booking> <check-out>`. Slept nights keep their rate |
| `check-in <booking> [--site=] [--rego=]` | Not before the arrival date; not into a dirty cabin without `--force` |
| `check-out <booking> [--owing]` | Early departure takes unused nights off. A balance stops it unless `--owing`. Issues the tax invoice; a cabin is set dirty |
| `cancel <booking> [--fee=] [--reason=]`, `no-show <booking> [--fee=]` | Fees post as a cancellation charge |
| `charge <booking> <amount> "<description>" [--kind=] [--no-gst]` | Kinds: extra, linen, shop, laundry, gas, fee, discount, other |
| `pay <booking> <amount> [--method=] [--reference=] [--deposit]`, `refund <booking> <amount>` | A refund cannot exceed what was paid |
| `site-status <site> <clean\|dirty\|inspected\|out_of_order> [--reason=] [--until=] [--by=]` | Out of order needs a reason and lists bookings to move; refused on a site with a guest or a long-stay agreement unless `--force` |
| `night-audit` | Stayover cabins set dirty; not-arrived bookings listed; casual and long-stay sites and people on site tonight |
| `agree "<occupant>" <site> <resident\|annual\|seasonal> <start> --fee= [...]` | Flags: period (week, fortnight, month, year), ends-on, occupants, park-dwelling, main-residence, bond, kwh (opening meter reading), signed-on, disclosure-given-on, rules-given-on, rego. Refused on a site taken from the start date |
| `end-agreement <agreement> <last night>` | The last part-period bills by the day |
| `give-notice <agreement> --reason= [--on=]` | Records the notice; shows the law recorded on the agreement |
| `bill-residents [agreement] [--through=]` | Posts every fee period that has started. Never bills a period twice |
| `read-meter <site> <kWh> [--on=] [--by=]` | Refuses a reading below the last one unless `--force` |
| `bill-power [--rate=<cents per kWh>]` | Power used since the last bill, at the settings rate. The first reading sets the baseline |
| `pay-account <agreement> <amount> [--method=] [--reference=] [--on=]` | A payment on a long-stay account |
| `charge-account <agreement> <amount> "<description>" [--kind=other\|water\|site_fee\|power\|credit]` | Anything else on the account, an opening balance, or a credit |
| `add <site-type\|site\|rate\|channel\|guest> --field=value` | Site type: name code kind base-rate included-guests extra-adult extra-child max-guests description. Site: name site-type area max-length-m drive-through has-meter sort active. Rate: name site-type starts-on ends-on nightly min-nights. Channel: name kind commission-pct. Guest: name email phone address country company business-number member-number vip do-not-rebook marketing-ok notes |
| `set <type> <name> --field=value`, `set settings --field=value` | Booking: adults children channel channel-ref eta requests vehicle-rego van-length-m deposit deposit-due-on long-stay-agreed. Agreement: fee fee-period ends-on occupants own-dwelling main-residence tenancy-law written-agreement signed-on disclosure-given-on rules-given-on bond vehicle-rego notes |
| `log <booking\|agreement\|guest\|site> "<note>"` | |
| `import rms <file.csv> [--date-order=dmy\|mdy] [--apply]` | See docs/replace-rms-cloud.md. Dry run by default |
| `import ical <site> <file.ics> --source=<name> [--apply]` | The feed replaces its own future blocks on that site |
| `ical-export [folder] [--site=] [--exclude-source=]` | One .ics per site, "Not available" events, no guest names; long-stay sites show as busy |
| `export <file.json>` | Every table, one file |
| `draft-confirmation`, `draft-prearrival [booking] [--days=2]`, `draft-deposit-reminder`, `draft-review-request`, `draft-arrears-reminder [agreement] [--days=7]` | Drafts to drafts/. Nothing sends |

## Documents and views

`npm run docs` renders, in brand.json's name and colours: tax invoices (last 30 days), site account statements for every long stay, arrival cards (arrivals today and tomorrow), the cabin cleaning sheet, the on-site register of who is in the park tonight, and the meter reading sheet. `npm run docs -- site-account-statement` renders one type. `npm run view` renders the `today`, `long-stays` and `performance` dashboards to `views/`.
