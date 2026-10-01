// Bring reservations across from RMS Cloud, and keep outside calendars (Booking.com, Airbnb, Vrbo) in step.
//   rms   a reservations CSV from RMS: the Reservation Made/Modified report's "Export To CSV", or a Report Writer export
//         (Utilities > Report Writer). Column names differ between reports and templates, so each field accepts
//         several names (see docs/replace-rms-cloud.md).
//   ical  an .ics calendar file or feed saved to disk, for one site or cabin: its events become blocks on that site.
// A dry run by default: everything runs inside the caller's transaction, which rolls back unless --apply.
// Every original row is kept in import_rows and source_data. Running the same file twice adds nothing.
import fs from 'node:fs';
import { parseCsv, pick, yesNo } from './csv.mjs';

const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12 };
const monthOf = (w) => MONTHS[w.toLowerCase().slice(0, 4)] || MONTHS[w.toLowerCase().slice(0, 3)];

export function toDate(v, order, what) {
  const s = String(v ?? '').trim();
  if (!s) return null;
  let m, y, mo, d;
  if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) [, y, mo, d] = m.map(Number);
  else if ((m = s.match(/^(\d{1,2})[ -]([A-Za-z]{3,9})[ ,-]*(\d{4})/)) && monthOf(m[2])) [d, mo, y] = [Number(m[1]), monthOf(m[2]), Number(m[3])];
  else if ((m = s.match(/^([A-Za-z]{3,9}) (\d{1,2}),? (\d{4})/)) && monthOf(m[1])) [mo, d, y] = [monthOf(m[1]), Number(m[2]), Number(m[3])];
  else if ((m = s.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{2,4})/))) {
    const [a, b] = [Number(m[1]), Number(m[2])];
    y = Number(m[3]) < 100 ? 2000 + Number(m[3]) : Number(m[3]);
    let o = order;
    if (!o) { if (a > 12) o = 'dmy'; else if (b > 12) o = 'mdy'; else throw Error(`${what}: "${s}" could be day-first or month-first. Rerun with --date-order=dmy or --date-order=mdy`); }
    [d, mo] = o === 'dmy' ? [a, b] : [b, a];
  } else throw Error(`${what}: "${s}" is not a date`);
  const iso = `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  if (Number.isNaN(Date.parse(`${iso}T00:00:00Z`)) || new Date(`${iso}T00:00:00Z`).toISOString().slice(0, 10) !== iso) throw Error(`${what}: "${s}" is not a real date`);
  return iso;
}

function cents(v, what) {
  const s = String(v ?? '').replace(/[^0-9.-]/g, '');
  if (!s) return 0;
  const n = Number(s);
  if (!Number.isFinite(n)) throw Error(`${what}: "${v}" is not an amount`);
  return Math.round(n * 100);
}

const statusOf = (t) => {
  const s = String(t || '').toLowerCase();
  if (/cancel/.test(s)) return 'cancelled';
  if (/no.?show/.test(s)) return 'no_show';
  if (/checked.?out|departed|completed/.test(s)) return 'checked_out';
  if (/arrived|checked.?in|in.?house/.test(s)) return 'checked_in';
  if (/enquir|inquir|quote|wait.?list|tentative|pencil|unconfirmed/.test(s)) return 'enquiry';
  return 'confirmed';
};
// RMS names its site types "categories". Guess the kind from the name; fix it after with set site-type.
const kindOf = (name) => {
  const s = String(name || '').toLowerCase();
  if (/glamp|safari|bell tent/.test(s)) return 'cabin';
  if (/unpowered|tent|camp ?site|non.?powered/.test(s)) return 'unpowered';
  if (/ensuite/.test(s)) return 'ensuite';
  if (/motel|unit|apartment|villa|lodge room/.test(s)) return 'unit';
  if (/cabin|chalet|cottage|glamp|bach|room|house|hut/.test(s)) return 'cabin';
  return 'powered';
};
const channelKind = (name) => {
  const s = String(name || '').toLowerCase();
  if (/walk/.test(s)) return 'walk-in';
  if (/booking engine|direct|website|phone|email|office|rms|repeat/.test(s)) return 'direct';
  if (/top 10|big4|big 4|kiwi|nrma|club|member|discovery/.test(s)) return 'club';
  if (/agent|travel|wholesal|tour/.test(s)) return 'agent';
  return 'ota';
};

const seen = async (db, entity, sourceId) => (await db.query('select record_id from import_rows where entity = $1 and source_id = $2', [entity, sourceId]))[0]?.record_id || null;
const remember = (db, entity, sourceId, recordId, raw) => db.query('insert into import_rows (entity, source_id, record_id, raw) values ($1, $2, $3, $4)', [entity, sourceId, recordId, JSON.stringify(raw)]);

export async function importRms(db, file, flags = {}) {
  if (!file || !fs.existsSync(file)) throw Error(`No file at ${file}`);
  const order = flags.date_order;
  if (order && !['dmy', 'mdy'].includes(order)) throw Error('--date-order must be dmy or mdy');
  const rows = parseCsv(fs.readFileSync(file, 'utf8'));
  const out = { mode: flags.apply ? 'applied' : 'dry-run', rows: rows.length, inserted: 0, existing: 0, guests_created: 0, site_types_created: 0, channels_created: 0, unassigned: 0, long_term: 0, notes: [] };
  const [settings] = await db.query('select * from settings');
  const newChannels = new Set(), newTypes = new Set(), longTerm = [];

  for (const [i, row] of rows.entries()) {
    const line = i + 2;
    const ref = pick(row, 'Res No', 'Res No.', 'Reservation Number', 'Reservation No', 'Res Number', 'Reservation ID', 'Booking Number', 'Confirmation Number');
    if (!ref) throw Error(`Row ${line}: no reservation number column (Res No, Reservation Number, ...)`);
    if (await seen(db, 'reservation', ref)) { out.existing++; continue; }
    if ((await db.query('select 1 from bookings where ref = $1 or external_id = $2', [ref, `rms:${ref}`])).length) { out.existing++; continue; }

    const arrive = toDate(pick(row, 'Arrive', 'Arrive Date', 'Arrival', 'Arrival Date', 'Arrive Date/Time'), order, `Row ${line} arrive`);
    const depart = toDate(pick(row, 'Depart', 'Depart Date', 'Departure', 'Departure Date', 'Depart Date/Time'), order, `Row ${line} depart`);
    if (!arrive || !depart) throw Error(`Row ${line}: arrive and depart dates are required`);
    if (depart <= arrive) throw Error(`Row ${line}: depart ${depart} is not after arrive ${arrive}`);

    let name = pick(row, 'Guest Name', 'Guest', 'Name', 'TitleGivenSurname', 'Full Name');
    if (!name) name = [pick(row, 'Given', 'Given Name', 'First Name', 'Guest Given'), pick(row, 'Surname', 'Last Name', 'Guest Surname')].filter(Boolean).join(' ');
    if (!name) name = `RMS guest ${ref}`;
    const email = pick(row, 'Email', 'Email Address', 'Guest Email', 'E-mail');
    const phone = pick(row, 'Mobile', 'Phone', 'Mobile Phone', 'Telephone', 'Phone Number');
    let guestId = email ? (await db.query("select id from guests where lower(email) = lower($1) and email <> '' limit 1", [email]))[0]?.id : null;
    if (!guestId) guestId = (await db.query("select id from guests where lower(name) = lower($1) and (phone = $2 or $2 = '') limit 1", [name, phone]))[0]?.id;
    if (!guestId) {
      const address = [pick(row, 'Address', 'Address Line 1', 'Street'), pick(row, 'Town', 'City', 'Suburb'), pick(row, 'State'), pick(row, 'Post Code', 'Postcode')].filter(Boolean).join(', ');
      guestId = (await db.query('insert into guests (name, email, phone, address, country, source_data) values ($1, $2, $3, $4, $5, $6) returning id',
        [name, email, phone, address, pick(row, 'Country'), JSON.stringify({ rms: ref })]))[0].id;
      out.guests_created++;
    }

    // RMS calls the site type a Category and the individual site or cabin an Area.
    const typeName = pick(row, 'Category', 'Category Name', 'Site Type', 'Room Type') || 'Imported site';
    const siteName = pick(row, 'Area', 'Area Name', 'Site', 'Site Number', 'Room');
    const nights = (Date.parse(depart) - Date.parse(arrive)) / 86400000;
    const total = cents(pick(row, 'Accommodation', 'Accommodation Total', 'Total', 'Total Amount', 'Tariff', 'Rate Amount', 'Amount'), `Row ${line} total`);
    let [type] = await db.query('select id from site_types where lower(name) = lower($1)', [typeName]);
    if (!type) {
      [type] = await db.query('insert into site_types (name, kind, base_rate_cents) values ($1, $2, $3) returning id', [typeName, kindOf(typeName), Math.round(total / nights)]);
      out.site_types_created++;
      newTypes.add(typeName);
    }
    const siteId = siteName ? (await db.query('select id from sites where lower(name) = lower($1)', [siteName]))[0]?.id || null : null;
    if (!siteId) out.unassigned++;

    const channelName = pick(row, 'Booking Source', 'Source', 'Channel', 'Travel Agent', 'Agent', 'Market Segment') || 'RMS';
    let [channel] = await db.query('select id from channels where lower(name) = lower($1)', [channelName]);
    if (!channel) {
      [channel] = await db.query('insert into channels (name, kind) values ($1, $2) returning id', [channelName, channelKind(channelName)]);
      out.channels_created++;
      newChannels.add(channelName);
    }

    const status = statusOf(pick(row, 'Status', 'Reservation Status', 'Res Status'));
    const booked = toDate(pick(row, 'Made Date', 'Date Made', 'Booked Date', 'Created', 'Created Date', 'Made'), order, `Row ${line} made date`) || arrive;
    const adults = Number(pick(row, 'Adults', 'Number of Adults', 'Adult') || 2) || 2;
    const children = (Number(pick(row, 'Children', 'Number of Children', 'Child') || 0) || 0) + (Number(pick(row, 'Infants', 'Infant') || 0) || 0);
    const van = Number(pick(row, 'Van Length', 'Vehicle Length', 'Length')) || null;
    const [b] = await db.query(
      `insert into bookings (ref, guest_id, site_type_id, site_id, channel_id, arrive_on, depart_on, adults, children, status, booked_on, channel_ref, requests, vehicle_rego, van_length_m,
         cancelled_on, checked_in_at, checked_out_at, external_id, source_data)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20) returning id`,
      [ref, guestId, type.id, siteId, channel.id, arrive, depart, adults, children, status, booked, pick(row, 'OTA Ref', 'Channel Reference', 'Agent Ref', 'Voucher Number', 'Ext Ref'),
        pick(row, 'Notes', 'Comments', 'Special Requests', 'Guest Notes'), pick(row, 'Rego', 'Vehicle Rego', 'Registration', 'Car Rego'), van,
        status === 'cancelled' ? booked : null, ['checked_in', 'checked_out'].includes(status) ? arrive : null, status === 'checked_out' ? depart : null, `rms:${ref}`, JSON.stringify(row)]);
    // The total spread over the nights; the last night carries the rounding.
    const each = Math.floor(total / nights);
    for (let n = 0; n < nights; n++) {
      const night = new Date(Date.parse(`${arrive}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
      await db.query("insert into booking_nights (booking_id, night_on, rate_cents, rate_plan) values ($1, $2, $3, 'RMS import')", [b.id, night, n === nights - 1 ? total - each * (nights - 1) : each]);
    }
    const paid = cents(pick(row, 'Paid', 'Amount Paid', 'Deposit Paid', 'Payments', 'Total Paid'), `Row ${line} paid`);
    if (paid > 0) await db.query("insert into payments (booking_id, paid_on, kind, method, amount_cents, reference) values ($1, $2, 'payment', 'other', $3, 'RMS import')", [b.id, booked, paid]);
    if (yesNo(pick(row, 'Long Term', 'Long Term Guest', 'Permanent'))) { out.long_term++; longTerm.push(ref); }
    await remember(db, 'reservation', ref, b.id, row);
    out.inserted++;
  }
  if (out.unassigned) out.notes.push(`${out.unassigned} reservation(s) have no site matched by its Area name: assign them, or add the sites first and rerun on a fresh database`);
  if (newTypes.size) out.notes.push(`New site types ${[...newTypes].join(', ')}: check each kind, rate and extra-person charges with set site-type`);
  if (newChannels.size) out.notes.push(`New channels ${[...newChannels].join(', ')}: set each commission with set channel <name> --commission-pct=`);
  if (longTerm.length) out.notes.push(`${longTerm.join(', ')} marked Long Term in RMS: set each up as a long-stay agreement with agree, then cancel the imported booking`);
  out.notes.push(`Totals are spread evenly across the nights, in ${settings.currency}. Payments come across as one line per reservation`);
  return [out];
}

// iCal: unfold lines, read each VEVENT's UID, SUMMARY, DTSTART and DTEND (all-day or date-time).
export function parseIcal(text) {
  if (!/BEGIN:VCALENDAR/.test(text)) throw Error('Not an iCal file: no BEGIN:VCALENDAR');
  const lines = String(text).replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '').split(/\r?\n/);
  const events = [];
  let ev = null;
  const day = (v) => { const m = String(v || '').match(/(\d{4})(\d{2})(\d{2})/); return m ? `${m[1]}-${m[2]}-${m[3]}` : null; };
  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') ev = {};
    else if (line === 'END:VEVENT') { if (ev) events.push(ev); ev = null; }
    else if (ev) {
      const i = line.indexOf(':');
      if (i < 0) continue;
      const key = line.slice(0, i).split(';')[0].toUpperCase();
      const value = line.slice(i + 1);
      if (key === 'UID') ev.uid = value;
      if (key === 'SUMMARY') ev.summary = value.replace(/\\,/g, ',').replace(/\\n/g, ' ');
      if (key === 'DTSTART') ev.start = day(value);
      if (key === 'DTEND') ev.end = day(value);
    }
  }
  return events.filter((e) => e.start).map((e) => ({ ...e, end: e.end && e.end > e.start ? e.end : new Date(Date.parse(`${e.start}T00:00:00Z`) + 86400000).toISOString().slice(0, 10), uid: e.uid || `${e.start}:${e.end}` }));
}

export async function importIcal(db, site, file, flags = {}) {
  if (!file || !fs.existsSync(file)) throw Error(`No file at ${file}`);
  const source = String(flags.source || 'ical').toLowerCase();
  if (['manual', 'owner'].includes(source)) throw Error('--source names the outside calendar, for example bookingcom or airbnb');
  const events = parseIcal(fs.readFileSync(file, 'utf8'));
  const out = { mode: flags.apply ? 'applied' : 'dry-run', site: site.name, source, events: events.length, inserted: 0, updated: 0, removed: 0, unchanged: 0 };
  const uids = [];
  for (const e of events) {
    uids.push(e.uid);
    const [had] = await db.query('select * from blocks where site_id = $1 and source = $2 and uid = $3', [site.id, source, e.uid]);
    if (!had) { await db.query('insert into blocks (site_id, starts_on, ends_on, source, uid, summary) values ($1, $2, $3, $4, $5, $6)', [site.id, e.start, e.end, source, e.uid, e.summary || '']); out.inserted++; }
    else if (had.starts_on !== e.start || had.ends_on !== e.end) { await db.query('update blocks set starts_on = $1, ends_on = $2, summary = $3 where id = $4', [e.start, e.end, e.summary || '', had.id]); out.updated++; }
    else out.unchanged++;
  }
  // The feed is the truth for its own future dates: a block it no longer lists was cancelled there.
  const gone = await db.query('delete from blocks where site_id = $1 and source = $2 and ends_on >= park_today() and not (uid = any($3::text[])) returning id', [site.id, source, uids]);
  out.removed = gone.length;
  return [out];
}

// The calendar to give Booking.com or Airbnb for one site or cabin: live bookings, long-stay agreements, holds and
// out-of-order dates. Guest names never leave the park: every event is "Not available".
export async function icalFor(db, site, flags = {}) {
  const exclude = String(flags.exclude_source || '').toLowerCase();
  const busy = await db.query(`select 'b-' || id uid, arrive_on s, depart_on e from bookings where site_id = $1 and status in ('confirmed', 'checked_in') and depart_on >= park_today()
    union all select 'a-' || id, greatest(starts_on, park_today()), least(holds_to, park_today() + 365) + 1 from v_holding where site_id = $1 and status = 'active' and holds_to >= park_today()
    union all select 'k-' || id, starts_on, ends_on from blocks where site_id = $1 and ends_on >= park_today() and source <> $2
    union all select 'o-' || id, park_today(), coalesce(out_of_order_until, park_today()) + 1 from sites
      where id = $1 and status = 'out_of_order' and coalesce(out_of_order_until, park_today()) >= park_today()
    order by 2`, [site.id, exclude]);
  const d = (v) => String(v).replaceAll('-', '');
  const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Holiday Park for Claude Code//EN', 'CALSCALE:GREGORIAN',
    ...busy.flatMap((x) => ['BEGIN:VEVENT', `UID:${x.uid}@holiday-park`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${d(x.s)}`, `DTEND;VALUE=DATE:${d(x.e)}`, 'SUMMARY:Not available', 'END:VEVENT']),
    'END:VCALENDAR', ''].join('\r\n');
}
