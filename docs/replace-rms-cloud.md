# Moving off RMS Cloud

Holiday Park for Claude Code holds what most parks use RMS Cloud for day to day: sites and cabins, rates, casual bookings, guests, folios, invoices, cabin cleaning, long-stay agreements with their accounts, and power meter readings. This guide moves your reservations across in an afternoon. Keep RMS running until you have checked the counts and run a week side by side.

## 1. Set up your park first

Your site types, sites and rates come first, because reservations are matched to them by name.

```bash
npm run park -- set settings --business-name="Your Park" --gst-number=123-456-789 --registration-number=CG-0000 --registration-expires-on=2027-06-30
npm run park -- add site-type --name="Powered site" --kind=powered --base-rate=54 --included-guests=2 --extra-adult=20 --extra-child=12 --max-guests=6
npm run park -- add site --name=P1 --site-type="Powered site" --area=Riverside --max-length-m=8.5
npm run park -- add rate --name="Summer peak" --site-type="Powered site" --starts-on=2026-12-20 --ends-on=2027-02-07 --nightly=69 --min-nights=3
```

Name each site type exactly as RMS names the **Category**, and each site exactly as RMS names the **Area** (P1, Cabin 4, Site 12). Or ask Claude Code: "set up my sites from this list" and paste the list from RMS.

For Australia: `--country=AU --state=NSW --currency=AUD --gst-rate=0.10`.

## 2. Export your reservations from RMS

Two reports in RMS give a reservations file:

- **Reservation Made/Modified report.** Pick a date range and select **Export To CSV**. Each reservation comes out as a row with its reservation number, surname, Area, rate, arrive and depart dates, nights and status.
- **Report Writer** (Utilities > Report Writer). Search on Reservation, Arrive Date, over the date range you want, then pick the fields to export and click Export. Save the field choice as an export template so you can run it again.

Export everything from the start of the current season onwards, plus last year if you want the history in your reports. The Report Writer template that maps best:

| RMS field | Column name to use |
|---|---|
| Reservation number | `Res No` |
| Guest surname and given name | `Surname`, `Given` (or `TitleGivenSurname`) |
| Email, mobile | `Email`, `Mobile` |
| Arrive date, depart date | `Arrive`, `Depart` |
| Category (site type) | `Category` |
| Area (site or cabin) | `Area` |
| Adults, children, infants | `Adults`, `Children`, `Infants` |
| Booking source or travel agent | `Booking Source` |
| Reservation status | `Status` |
| Accommodation total | `Accommodation` |
| Amount paid | `Paid` |
| Date made | `Made Date` |
| Vehicle registration | `Rego` |
| Long term | `Long Term` |

The importer also accepts other common names for each field (Reservation Number, Arrival, Departure, Site, Source, Total and more: see `scripts/lib/import.mjs`). Columns it does not know are kept with each booking in `source_data`.

## 3. Do a test run, then import

```bash
npm run park -- import rms exports/rms-reservations.csv --date-order=dmy
```

Nothing is saved. Read the counts and the notes: reservations, guests matched by email, new site types and channels, reservations with no site matched, and any marked Long Term. Fix the names in step 1 if sites did not match, then:

```bash
npm run park -- import rms exports/rms-reservations.csv --date-order=dmy --apply
```

Running the same file twice adds nothing. A newer export brings in only the reservations not seen before.

## 4. Long-stay residents and annual vans

RMS holds long-term guests as reservations with the Long Term field set. Here a long stay is an agreement with its own account, because the money works differently: a weekly, monthly or yearly site fee, power on-charged from the meter, and payments against a running balance.

For each long-stay occupant the import notes list:

```bash
npm run park -- agree "Bev Thompson" L1 resident 2024-07-24 --fee=210 --period=week --main-residence --signed-on=2024-07-24 --kwh=18000
npm run park -- cancel <the imported reservation>
```

Bring the opening balance across as one line if they owe or are in credit: `npm run park -- charge-account LS-101 420 "Opening balance from RMS"` (or `--kind=credit` for money held). Then run `/compliance`: it asks you to record which tenancy law covers each agreement.

## 5. Calendars

If a cabin is also listed on Booking.com or Airbnb, save that listing's calendar export and import it onto the cabin. Give the channel this cabin's calendar in return:

```bash
npm run park -- import ical "Cabin 4" exports/cabin-4-bookingcom.ics --source=bookingcom --apply
npm run park -- ical-export feeds --exclude-source=bookingcom
```

## What maps

- Categories become site types, Areas become sites, booking sources become channels (set each one's commission after).
- Reservations keep their RMS number as the booking reference, with dates, people, status, rego, notes and the amount paid.
- Guests are matched by email, then by name and phone, so a returning guest is one record.

## What does not carry over

- **Night-by-night rates.** The accommodation total is spread evenly across the nights. New bookings are priced from your rates here.
- **Payment detail.** Payments come across as one line per reservation. Card tokens stay with your payment provider.
- **Long-term accounts.** Site fee history and meter readings are set up again as agreements, with an opening balance.
- **Live channel connections, the booking engine, the interactive park map, kiosks and RMS Pay.** These are front-end features. Enterprise DNA builds the ones your park needs into your own version.
- **Housekeeping history, guest portal messages and RMS's reports.** Your reports here are the slash commands.

Want it done for you? Enterprise DNA moves your RMS data, sets up your sites and long stays, and runs it with you for the first weeks: https://enterprisedna.co/omni/instead-of/rms-cloud
