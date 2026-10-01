# Test files

Used by `npm test`. Fictional records only.

- `rms/reservations.csv`: a reservations export using column names from RMS Cloud's reports (Res No, Surname, Given, Arrive, Depart, Category, Area, Booking Source, Long Term; yours may differ, and the importer accepts several names for each field), with day-first dates, a cancelled and a departed reservation, a category and two booking sources that do not exist yet, reservations with no Area, and one guest marked Long Term.
- `ical/bookingcom-cabin-4.ics`: a Booking.com availability calendar for one cabin, the file you get from the property's calendar export link, with one folded line.
