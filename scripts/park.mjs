#!/usr/bin/env node
// The park office CLI. Every slash command in .claude/commands runs one of these.
//   npm run park -- <report>                     arrivals, site-board, housekeeping, attention, arrears, meters, occupancy, ... (see help)
//   npm run park -- <action> <args> [--flags]    book, check-in, check-out, charge, pay, agree, bill-residents, read-meter, bill-power, ...
// Human tables by default, --json for machines. Names match exactly, then by fragment; ambiguous lists candidates and exits 1.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { getDb, REPO_ROOT } from './lib/db.mjs';
import { table } from './lib/format.mjs';
import { entities, refs, money, reports, resolve, resolveBooking, resolveAgreement } from './lib/domain.mjs';
import { importRms, importIcal, icalFor, toDate } from './lib/import.mjs';

export const actions = ['quote', 'book', 'assign', 'move', 'change-dates', 'check-in', 'check-out', 'cancel', 'no-show', 'charge', 'pay', 'refund',
  'site-status', 'night-audit', 'agree', 'end-agreement', 'give-notice', 'bill-residents', 'read-meter', 'bill-power', 'pay-account', 'charge-account',
  'add', 'set', 'log', 'import', 'ical-export', 'export',
  'draft-confirmation', 'draft-prearrival', 'draft-deposit-reminder', 'draft-review-request', 'draft-arrears-reminder'];
const specials = ['help', 'availability', 'booking', 'guest', 'agreement', 'weekly-review'];
const BOOLEAN_FLAGS = ['json', 'apply', 'help', 'force', 'owing', 'deposit', 'long-stay', 'no-gst', 'enquiry', 'new-guest', 'main-residence', 'park-dwelling'];
const KINDS = ['resident', 'annual', 'seasonal'];

export function parseArgs(args) {
  const flags = {}, pos = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (!a.startsWith('--')) { pos.push(a); continue; }
    const eq = a.indexOf('=');
    if (eq >= 0) flags[a.slice(2, eq).replaceAll('-', '_')] = a.slice(eq + 1);
    else if (BOOLEAN_FLAGS.includes(a.slice(2))) flags[a.slice(2).replaceAll('-', '_')] = true;
    else if (args[i + 1] !== undefined && !args[i + 1].startsWith('--')) flags[a.slice(2).replaceAll('-', '_')] = args[++i];
    else throw Error(`Flag ${a} needs a value`);
  }
  return { flags, pos };
}

const required = (v, what) => { if (v === undefined || v === null || String(v).trim() === '') throw Error(`Required: ${what}`); return v; };
function toCents(v, what, { negative = false } = {}) {
  const n = Number(String(required(v, what)).replace(/[$,]/g, ''));
  if (!Number.isFinite(n) || (!negative && n < 0)) throw Error(`${what} must be an amount like 49.50`);
  return Math.round(n * 100);
}
const isoDay = (v, what) => (v === undefined || v === null ? null : toDate(v, 'dmy', what));
const addDays = (iso, n) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
const daysBetween = (a, b) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);
function addMonths(iso, n) {
  const [y, m, d] = iso.split('-').map(Number);
  const target = new Date(Date.UTC(y, m - 1 + n, 1));
  const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d, last));
  return target.toISOString().slice(0, 10);
}
const nextPeriod = (from, period) => (period === 'week' ? addDays(from, 7) : period === 'fortnight' ? addDays(from, 14) : period === 'month' ? addMonths(from, 1) : addMonths(from, 12));
const fmt = (cents, cur) => `${cur} ${(Number(cents) / 100).toFixed(2)}`;
const today = async (db) => (await db.query('select park_today()::text d'))[0].d;
const settingsOf = async (db) => (await db.query('select * from settings'))[0];
const isCabin = (kind) => ['cabin', 'unit'].includes(kind);

// "3" nights, or a check-out date.
function departFrom(arrive, v) {
  const s = String(required(v, 'nights or a check-out date'));
  if (/^\d{1,3}$/.test(s)) {
    if (Number(s) < 1) throw Error('At least one night');
    return addDays(arrive, Number(s));
  }
  const d = isoDay(s, 'check-out');
  if (d <= arrive) throw Error(`Check-out ${d} is not after check-in ${arrive}`);
  return d;
}

async function audit(db, action, id, detail) {
  await db.query('insert into audit (action, record_id, detail) values ($1, $2, $3)', [action, id || null, JSON.stringify(detail)]);
}

// add/set: --field=value pairs checked against the entity's allowed list; names resolve to ids, dollars to cents.
async function record(db, entity, flags, existing = null) {
  const def = entities[entity];
  if (!def) throw Error(`Record type must be one of ${Object.keys(entities).join(', ')}`);
  const [tableName, , allowed] = def;
  const cols = [], vals = [];
  for (const [key, raw] of Object.entries(flags)) {
    if (['json', 'force'].includes(key)) continue;
    if (!allowed.includes(key)) throw Error(`Unknown ${entity} field --${key.replaceAll('_', '-')}. Allowed: ${allowed.join(', ')}`);
    let v = raw === 'null' ? null : raw;
    let col = key;
    if (refs[key]) { col = refs[key][0]; if (v !== null) v = (await resolve(db, refs[key][1], v)).id; }
    else if (money[key]) { col = money[key]; if (v !== null) v = toCents(v, key); }
    else if (/_on$/.test(key) && v !== null) v = isoDay(v, key);
    else if (v === true) v = 'true';
    cols.push(col); vals.push(v);
  }
  if (!cols.length) throw Error('Give at least one --field=value');
  if (existing) {
    vals.push(existing.id);
    return db.query(`update ${tableName} set ${cols.map((c, i) => `${c} = $${i + 1}`).join(', ')} where id = $${vals.length} returning *`, vals);
  }
  return db.query(`insert into ${tableName} (${cols.join(', ')}) values (${vals.map((_, i) => `$${i + 1}`).join(', ')}) returning *`, vals);
}

// Extra people beyond what the base rate covers: adults fill the included places first, then children.
function extras(type, adults, children) {
  const inc = Number(type.included_guests);
  const extraAdults = Math.max(0, adults - inc);
  const extraChildren = Math.max(0, children - Math.max(0, inc - adults));
  return { extraAdults, extraChildren, cents: extraAdults * Number(type.extra_adult_cents) + extraChildren * Number(type.extra_child_cents) };
}

// The price of each night: the shortest rate plan covering it (else the base rate), plus extra adults and children.
async function priceStay(db, type, arrive, depart, adults, children, flags = {}) {
  const nights = await db.query(`select d::date::text night_on, coalesce(p.nightly_cents, t.base_rate_cents) rate_cents, coalesce(p.name, 'Base rate') rate_plan, coalesce(p.min_nights, 1) min_nights
    from site_types t cross join generate_series($2::date, $3::date - 1, interval '1 day') d
    left join lateral (select name, nightly_cents, min_nights from rate_plans r where r.site_type_id = t.id and d::date between r.starts_on and r.ends_on order by r.ends_on - r.starts_on limit 1) p on true
    where t.id = $1 order by 1`, [type.id, arrive, depart]);
  const x = extras(type, adults, children);
  for (const n of nights) {
    n.rate_cents = Number(n.rate_cents) + x.cents;
    if (x.cents) n.rate_plan += ` + ${[x.extraAdults && `${x.extraAdults} extra adult${x.extraAdults > 1 ? 's' : ''}`, x.extraChildren && `${x.extraChildren} extra child${x.extraChildren > 1 ? 'ren' : ''}`].filter(Boolean).join(', ')}`;
  }
  if (flags.rate !== undefined) { const c = toCents(flags.rate, '--rate'); for (const n of nights) { n.rate_cents = c; n.rate_plan = 'Agreed rate'; } }
  const min = Math.max(...nights.map((n) => Number(n.min_nights)));
  if (flags.rate === undefined && nights.length < min && !flags.force) throw Error(`${nights.find((n) => Number(n.min_nights) === min).rate_plan.split(' + ')[0]} needs at least ${min} nights. Use --force to take it anyway`);
  return nights.map(({ min_nights, ...n }) => n);
}

// The nights a site is not for sale, as SQL that takes the site id, the first night and the night after the last.
const TAKEN = `(exists (select 1 from v_live b where b.site_id = s.id and b.arrive_on < $3 and $2 < b.depart_on and b.id is distinct from $4::uuid)
    or exists (select 1 from blocks k where k.site_id = s.id and k.starts_on < $3 and $2 < k.ends_on)
    or exists (select 1 from v_holding h where h.site_id = s.id and h.status = 'active' and h.starts_on < $3 and $2 <= h.holds_to)
    or (s.status = 'out_of_order' and (s.out_of_order_until is null or s.out_of_order_until >= $2::date)))`;

// Sites free for every night of a stay, best first: inspected, then clean; for vans, the shortest site the van fits.
async function freeSites(db, typeId, arrive, depart, exceptBooking = null, vanLength = null) {
  return db.query(`select s.* from sites s where s.active and ($1::uuid is null or s.site_type_id = $1) and not ${TAKEN}
    and ($5::numeric is null or s.max_length_m is null or s.max_length_m >= $5::numeric)
    order by case s.status when 'inspected' then 0 when 'clean' then 1 else 2 end, s.max_length_m nulls last, s.sort, s.name`, [typeId, arrive, depart, exceptBooking, vanLength]);
}

// For a stay with no site chosen: every night must have a site of the type left after the other unassigned bookings.
async function typeHasSite(db, typeId, arrive, depart, exceptBooking = null) {
  const short = await db.query(`select d::date::text night from generate_series($2::date, $3::date - 1, interval '1 day') d
    where (select count(*) from sites s where s.active and s.site_type_id = $1
        and not (s.status = 'out_of_order' and (s.out_of_order_until is null or s.out_of_order_until >= d::date))
        and not exists (select 1 from v_live b where b.site_id = s.id and b.arrive_on <= d::date and d::date < b.depart_on and b.id is distinct from $4::uuid)
        and not exists (select 1 from blocks k where k.site_id = s.id and k.starts_on <= d::date and d::date < k.ends_on)
        and not exists (select 1 from v_holding h where h.site_id = s.id and h.status = 'active' and h.starts_on <= d::date and d::date <= h.holds_to))
      - (select count(*) from v_live b where b.site_type_id = $1 and b.site_id is null and b.arrive_on <= d::date and d::date < b.depart_on and b.id is distinct from $4::uuid) < 1
    order by 1`, [typeId, arrive, depart, exceptBooking]);
  return short.map((r) => r.night);
}

async function writeNights(db, bookingId, nights) {
  await db.query('delete from booking_nights where booking_id = $1', [bookingId]);
  for (const n of nights) await db.query('insert into booking_nights (booking_id, night_on, rate_cents, rate_plan) values ($1, $2, $3, $4)', [bookingId, n.night_on, n.rate_cents, n.rate_plan]);
}

async function nextNumber(db, tableName, column, prefix, start = 1001) {
  const esc = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const [r] = await db.query(`select coalesce(max(substring(${column} from $1)::int), $2 - 1) + 1 n from ${tableName}`, [`^${esc}(\\d+)$`, start]);
  return `${prefix}${r.n}`;
}

const folio = async (db, id) => (await db.query('select * from v_folio where id = $1', [id]))[0];
const account = async (db, id) => (await db.query('select * from v_agreements where id = $1', [id]))[0];
const typeOf = async (db, id) => (await db.query('select * from site_types where id = $1', [id]))[0];

async function writeDraft(name, body) {
  const dir = path.resolve(process.env.OUTPUT_DIR || REPO_ROOT, 'drafts');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${Date.now()}.md`);
  fs.writeFileSync(file, body, { flag: 'wx' });
  return file;
}

async function guestFor(db, name, flags) {
  if (!flags.new_guest) {
    const found = await db.query('select * from guests where lower(name) = lower($1) or (email <> \'\' and lower(email) = lower($2))', [name, flags.email || '']);
    if (found.length === 1) return found[0];
    if (found.length > 1) throw Error(`More than one guest called "${name}". Candidates:\n${found.map((g) => `  ${g.id.slice(0, 8)}  ${g.name}  ${g.email}`).join('\n')}\nUse the id, or --new-guest`);
  }
  return (await db.query('insert into guests (name, email, phone, country) values ($1, $2, $3, $4) returning *', [required(name, 'guest name'), flags.email || '', flags.phone || '', flags.country || '']))[0];
}

async function stayView(db, b) {
  const s = await settingsOf(db);
  const f = await folio(db, b.id);
  return {
    booking: [{ ref: f.ref, status: f.status, guest: f.guest, site_type: f.site_type, site: f.site || 'not assigned', arrive_on: f.arrive_on, depart_on: f.depart_on, nights: f.nights,
      adults: f.adults, children: f.children, rego: f.vehicle_rego, van_m: f.van_length_m, channel: f.channel }],
    nights: await db.query('select night_on, rate_plan, round(rate_cents / 100.0, 2) rate from booking_nights where booking_id = $1 order by night_on', [b.id]),
    charges: await db.query('select posted_on, kind, description, round(amount_cents / 100.0, 2) amount from charges where booking_id = $1 order by posted_on', [b.id]),
    payments: await db.query('select paid_on, kind, method, round(amount_cents / 100.0, 2) amount, reference from payments where booking_id = $1 order by paid_on', [b.id]),
    folio: [{ currency: s.currency, accommodation: (f.accommodation_cents / 100).toFixed(2), extras: (f.extras_cents / 100).toFixed(2), total: (f.total_cents / 100).toFixed(2), gst_included: (f.gst_cents / 100).toFixed(2),
      paid: (f.paid_cents / 100).toFixed(2), balance: (f.balance_cents / 100).toFixed(2), deposit: (f.deposit_cents / 100).toFixed(2), deposit_due_on: f.deposit_due_on, invoice: (await db.query('select number from invoices where booking_id = $1', [b.id]))[0]?.number || '' }],
    notes: await db.query('select note, created_at from notes where booking_id = $1 order by created_at desc limit 5', [b.id]),
  };
}

async function agreementView(db, a) {
  const v = await account(db, a.id);
  return {
    agreement: [{ ref: v.ref, kind: v.kind, status: v.status, occupant: v.guest, site: v.site, starts_on: v.starts_on, ends_on: v.ends_on, days_on_site: v.days_on_site,
      fee: fmt(v.fee_cents, v.currency), period: v.fee_period, billed_to: v.billed_to, occupants: v.occupants, own_dwelling: v.own_dwelling, main_residence: v.main_residence,
      law: v.tenancy_law || 'not decided', signed_on: v.signed_on, disclosure_given_on: v.disclosure_given_on, rules_given_on: v.rules_given_on, bond: fmt(v.bond_cents, v.currency), notice_given_on: v.notice_given_on }],
    account: await db.query(`select posted_on, kind, description, period_from, period_to, round(amount_cents / 100.0, 2) amount, reference,
      round(sum(amount_cents) over (order by posted_on, amount_cents < 0, created_at) / 100.0, 2) running_balance from account_lines where agreement_id = $1 order by posted_on, amount_cents < 0, created_at`, [a.id]),
    balance: [{ currency: v.currency, charged: (v.charged_cents / 100).toFixed(2), paid: (v.paid_cents / 100).toFixed(2), balance: (v.balance_cents / 100).toFixed(2), last_paid_on: v.last_paid_on }],
    notes: await db.query('select note, created_at from notes where agreement_id = $1 order by created_at desc limit 5', [a.id]),
  };
}

export async function run(db, args) {
  const { pos, flags } = parseArgs(args);
  const [cmd = 'help', a, b, c, d] = pos;
  if (cmd === 'help' || flags.help) return [{ reports: [...Object.keys(reports), ...specials.filter((x) => x !== 'help')].join(', '), actions: actions.join(', '), guide: 'docs/cli.md' }];
  if (reports[cmd]) return db.query(reports[cmd]);
  if (cmd === 'weekly-review') {
    return { attention: await db.query(reports.attention), 'next twelve weeks': await db.query(reports.forecast), 'picked up this week': await db.query(reports.pickup),
      'long-stay arrears': await db.query(reports.arrears), channels: await db.query(reports['channel-mix']) };
  }
  if (cmd === 'availability') {
    const from = isoDay(flags.from, '--from') || await today(db);
    const n = Math.min(Number(flags.nights || 14), 31);
    const types = await db.query('select id, name from site_types order by base_rate_cents');
    const out = [];
    for (const t of types) {
      const row = { site_type: t.name };
      const free = await db.query(`select d::date::text night, (select count(*) from sites s where s.active and s.site_type_id = $1
          and not (s.status = 'out_of_order' and (s.out_of_order_until is null or s.out_of_order_until >= d::date))
          and not exists (select 1 from v_live b where b.site_id = s.id and b.arrive_on <= d::date and d::date < b.depart_on)
          and not exists (select 1 from blocks k where k.site_id = s.id and k.starts_on <= d::date and d::date < k.ends_on)
          and not exists (select 1 from v_holding h where h.site_id = s.id and h.status = 'active' and h.starts_on <= d::date and d::date <= h.holds_to))
        - (select count(*) from v_live b where b.site_type_id = $1 and b.site_id is null and b.arrive_on <= d::date and d::date < b.depart_on) free
        from generate_series($2::date, $2::date + ($3::int - 1), interval '1 day') d order by 1`, [t.id, from, n]);
      for (const f of free) row[f.night.slice(5)] = Number(f.free);
      out.push(row);
    }
    return out;
  }
  if (cmd === 'booking') return stayView(db, await resolveBooking(db, a));
  if (cmd === 'agreement') return agreementView(db, await resolveAgreement(db, a));
  if (cmd === 'guest') {
    const g = await resolve(db, 'guest', a);
    return {
      guest: [{ name: g.name, email: g.email, phone: g.phone, address: g.address, country: g.country, member_number: g.member_number, vip: g.vip, do_not_rebook: g.do_not_rebook, notes: g.notes }],
      stays: await db.query('select ref, status, site, arrive_on, nights, channel, currency, round(total_cents / 100.0, 2) total, round(balance_cents / 100.0, 2) balance from v_bookings where guest_id = $1 order by arrive_on desc', [g.id]),
      agreements: await db.query('select ref, kind, status, site, starts_on, ends_on, currency, round(balance_cents / 100.0, 2) balance from v_agreements where guest_id = $1 order by starts_on desc', [g.id]),
      notes: await db.query('select note, created_at from notes where guest_id = $1 order by created_at desc limit 5', [g.id]),
    };
  }
  if (cmd === 'quote') {
    const t = await resolve(db, 'site-type', a);
    const arrive = isoDay(required(b, 'check-in date'), 'check-in');
    const depart = departFrom(arrive, c);
    const adults = Number(flags.adults ?? 2), children = Number(flags.children ?? 0);
    const nights = await priceStay(db, t, arrive, depart, adults, children, flags);
    const s = await settingsOf(db);
    const short = await typeHasSite(db, t.id, arrive, depart);
    const total = nights.reduce((n, x) => n + x.rate_cents, 0);
    return { quote: [{ site_type: t.name, arrive_on: arrive, depart_on: depart, nights: nights.length, adults, children, total: fmt(total, s.currency), available: short.length ? `no, full on ${short.join(', ')}` : 'yes' }],
      nights: nights.map((n) => ({ night: n.night_on, rate_plan: n.rate_plan, rate: (n.rate_cents / 100).toFixed(2) })) };
  }
  if (cmd === 'export') {
    const file = path.resolve(required(a, 'output file, for example backup/park.json'));
    const snapshot = { version: 1, exported_at: new Date().toISOString(), records: {} };
    for (const t of ['settings', 'site_types', 'sites', 'rate_plans', 'channels', 'guests', 'bookings', 'booking_nights', 'charges', 'payments', 'invoices', 'blocks', 'housekeeping',
      'agreements', 'account_lines', 'meter_readings', 'notes', 'audit', 'import_rows']) {
      snapshot.records[t] = await db.query(`select * from ${t}`);
    }
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(snapshot, null, 2) + '\n', { flag: 'wx' });
    return [{ file, records: Object.values(snapshot.records).reduce((n, r) => n + r.length, 0) }];
  }
  if (cmd === 'ical-export') {
    const dir = path.resolve(process.env.OUTPUT_DIR || REPO_ROOT, a || 'feeds');
    fs.mkdirSync(dir, { recursive: true });
    const sites = flags.site ? [await resolve(db, 'site', flags.site)] : await db.query('select * from sites where active order by sort, name');
    const out = [];
    for (const si of sites) {
      const text = await icalFor(db, si, flags);
      const file = path.join(dir, `${si.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.ics`);
      fs.writeFileSync(file, text);
      out.push({ site: si.name, file, busy_periods: (text.match(/BEGIN:VEVENT/g) || []).length });
    }
    return out;
  }
  if (cmd.startsWith('draft-')) return draft(db, cmd, a, flags);
  if (!actions.includes(cmd)) throw Error(`Unknown command "${cmd}". Run help.`);

  await db.exec('BEGIN');
  let result;
  try {
    // One writer at a time on a shared database; reads carry on. Two people cannot sell the same site.
    await db.exec('LOCK TABLE bookings, agreements IN SHARE ROW EXCLUSIVE MODE');
    const s = await settingsOf(db);
    const now = await today(db);
    if (cmd === 'add') {
      if (a === 'site' && flags.site_type === undefined) throw Error('A site needs --site-type=');
      result = await record(db, a, Object.fromEntries(Object.entries(flags).filter(([k]) => k !== 'json')));
    } else if (cmd === 'set') {
      if (a === 'settings' || a === 'setting') result = await record(db, 'setting', flags, { id: 1 });
      else result = await record(db, a, Object.fromEntries(Object.entries(flags).filter(([k]) => k !== 'json')), await resolve(db, a, b));
    } else if (cmd === 'import') {
      if (a === 'rms') result = await importRms(db, b, flags);
      else if (a === 'ical') result = await importIcal(db, await resolve(db, 'site', b), c, flags);
      else throw Error('Supported imports: rms <reservations.csv>, ical <site> <calendar.ics> --source=bookingcom');
    } else if (cmd === 'book') {
      const t = await resolve(db, 'site-type', b);
      const arrive = isoDay(required(c, 'check-in date'), 'check-in');
      const depart = departFrom(arrive, d);
      if (arrive < now && !flags.force) throw Error(`Check-in ${arrive} is in the past. Use --force to record a past stay`);
      const guest = await guestFor(db, required(a, 'guest name'), flags);
      if (guest.do_not_rebook && !flags.force) throw Error(`${guest.name} is marked do not rebook: ${guest.notes || 'see the guest record'}. Use --force to book anyway`);
      const adults = Number(flags.adults ?? 2), children = Number(flags.children ?? 0);
      if (adults + children > t.max_guests && !flags.force) throw Error(`${t.name} takes ${t.max_guests}; this booking has ${adults + children}. Use --force to take it anyway`);
      const van = flags.van_length !== undefined ? Number(flags.van_length) : null;
      if (van !== null && !(van > 0)) throw Error('--van-length is the van or motorhome length in metres, like 7.5');
      const channel = flags.channel ? await resolve(db, 'channel', flags.channel) : null;
      const status = flags.enquiry ? 'enquiry' : 'confirmed';
      let site = null;
      if (flags.site) {
        site = await resolve(db, 'site', flags.site);
        if (site.site_type_id !== t.id && !flags.force) throw Error(`${site.name} is not a ${t.name}. Use --force to put them there anyway`);
        if (van !== null && site.max_length_m !== null && Number(site.max_length_m) < van && !flags.force) throw Error(`${site.name} takes up to ${site.max_length_m} m; the van is ${van} m. Use --force to put them there anyway`);
        if (status === 'confirmed' && !(await freeSites(db, null, arrive, depart)).some((r) => r.id === site.id)) throw Error(`${site.name} is not free from ${arrive} to ${depart}. Run availability`);
      } else if (status === 'confirmed') {
        const full = await typeHasSite(db, t.id, arrive, depart);
        if (full.length && !flags.force) throw Error(`No ${t.name} left on ${full.join(', ')}. Run availability, or --force to overbook`);
        if (van !== null && !(await freeSites(db, t.id, arrive, depart, null, van)).length && !flags.force) throw Error(`No ${t.name} free for those dates takes a ${van} m van. Use --force to take it and sort the site later`);
      }
      const nights = await priceStay(db, t, arrive, depart, adults, children, flags);
      const total = nights.reduce((n, x) => n + x.rate_cents, 0);
      // The channel collects for OTA bookings; direct bookings carry the park deposit unless told otherwise.
      const deposit = flags.deposit !== undefined && flags.deposit !== true ? toCents(flags.deposit, '--deposit')
        : channel?.kind === 'ota' ? 0 : Math.round(total * s.deposit_pct / 100);
      const due = deposit ? [addDays(now, s.deposit_days), arrive].sort()[0] : null;
      [result] = await db.query(`insert into bookings (ref, guest_id, site_type_id, site_id, channel_id, arrive_on, depart_on, adults, children, status, vehicle_rego, van_length_m, long_stay_agreed, deposit_cents, deposit_due_on, channel_ref, eta, requests)
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18) returning *`,
      [await nextNumber(db, 'bookings', 'ref', s.booking_prefix), guest.id, t.id, site?.id || null, channel?.id || null, arrive, depart, adults, children, status,
        flags.rego || '', van, !!flags.long_stay, deposit, due, flags.channel_ref || '', flags.eta || '', flags.requests || '']);
      await writeNights(db, result.id, nights);
      result = [{ ref: result.ref, status, guest: guest.name, site_type: t.name, site: site?.name || 'not assigned', arrive_on: arrive, depart_on: depart, nights: nights.length, total: fmt(total, s.currency), deposit: deposit ? `${fmt(deposit, s.currency)} due ${due}` : 'none' }];
    } else if (cmd === 'assign' || cmd === 'move') {
      const bk = await resolveBooking(db, a);
      if (!['confirmed', 'checked_in', 'enquiry'].includes(bk.status)) throw Error(`${bk.ref} is ${bk.status}`);
      const from = bk.status === 'checked_in' ? now : bk.arrive_on;
      const free = await freeSites(db, null, from, bk.depart_on, bk.id);
      let site;
      if (b) {
        site = await resolve(db, 'site', b);
        if (bk.van_length_m !== null && site.max_length_m !== null && Number(site.max_length_m) < Number(bk.van_length_m) && !flags.force) throw Error(`${site.name} takes up to ${site.max_length_m} m; the van is ${bk.van_length_m} m`);
        if (!free.some((r) => r.id === site.id)) throw Error(`${site.name} is not free from ${from} to ${bk.depart_on}`);
        if (site.site_type_id !== bk.site_type_id && !flags.force) throw Error(`${site.name} is a different site type. Use --force to move them there (the rate stays as booked)`);
      } else {
        site = free.find((r) => r.site_type_id === bk.site_type_id && (bk.van_length_m === null || r.max_length_m === null || Number(r.max_length_m) >= Number(bk.van_length_m)));
        if (!site) throw Error(`No site of that type free from ${from} to ${bk.depart_on}${bk.van_length_m ? ` for a ${bk.van_length_m} m van` : ''}`);
      }
      const [was] = bk.site_id ? await db.query('select s.name, t.kind from sites s join site_types t on t.id = s.site_type_id where s.id = $1', [bk.site_id]) : [null];
      await db.query('update bookings set site_id = $1, site_type_id = $2 where id = $3', [site.id, flags.force ? site.site_type_id : bk.site_type_id, bk.id]);
      if (bk.status === 'checked_in' && was && isCabin(was.kind)) await db.query("update sites set status = 'dirty' where name = $1", [was.name]);
      result = [{ ref: bk.ref, guest: bk.guest, from_site: was?.name || 'not assigned', to_site: site.name, max_length_m: site.max_length_m, status: site.status }];
    } else if (cmd === 'change-dates') {
      const bk = await resolveBooking(db, a);
      if (!['confirmed', 'enquiry', 'checked_in'].includes(bk.status)) throw Error(`${bk.ref} is ${bk.status}`);
      const arrive = bk.status === 'checked_in' ? bk.arrive_on : isoDay(required(b, 'new check-in date'), 'check-in');
      const depart = departFrom(arrive, bk.status === 'checked_in' ? required(b, 'new check-out date or total nights') : c);
      if (bk.status === 'checked_in' && depart <= now) throw Error('Use check-out to end a stay today');
      if (bk.site_id && bk.status !== 'enquiry' && !(await freeSites(db, null, arrive, depart, bk.id)).some((r) => r.id === bk.site_id)) throw Error(`The site is not free for ${arrive} to ${depart}. Move them first, or pick other dates`);
      if (!bk.site_id && bk.status !== 'enquiry') { const full = await typeHasSite(db, bk.site_type_id, arrive, depart, bk.id); if (full.length && !flags.force) throw Error(`No site of that type left on ${full.join(', ')}`); }
      // Nights already slept keep their rate; new nights are priced today.
      const kept = await db.query('select night_on::text, rate_cents, rate_plan from booking_nights where booking_id = $1 and night_on >= $2 and night_on < $3', [bk.id, arrive, depart]);
      const priced = await priceStay(db, await typeOf(db, bk.site_type_id), arrive, depart, bk.adults, bk.children, { ...flags, force: true });
      const nights = priced.map((n) => kept.find((k) => k.night_on === n.night_on) || n);
      await db.query('update bookings set arrive_on = $1, depart_on = $2 where id = $3', [arrive, depart, bk.id]);
      await writeNights(db, bk.id, nights);
      result = [{ ref: bk.ref, arrive_on: arrive, depart_on: depart, nights: nights.length, total: fmt(nights.reduce((n, x) => n + Number(x.rate_cents), 0), s.currency) }];
    } else if (cmd === 'check-in') {
      const bk = await resolveBooking(db, a);
      if (bk.status !== 'confirmed') throw Error(`${bk.ref} is ${bk.status}, not confirmed`);
      if (bk.arrive_on > now) throw Error(`${bk.ref} arrives ${bk.arrive_on}. Change the dates first for an early arrival`);
      let siteId = flags.site ? (await resolve(db, 'site', flags.site)).id : bk.site_id;
      if (!siteId) siteId = (await freeSites(db, bk.site_type_id, now, bk.depart_on, bk.id, bk.van_length_m))[0]?.id;
      if (!siteId) throw Error('No site of that type is free. Move another booking or upgrade with move --force');
      const [site] = await db.query('select s.*, t.kind from sites s join site_types t on t.id = s.site_type_id where s.id = $1', [siteId]);
      if (!(await freeSites(db, null, now, bk.depart_on, bk.id)).some((r) => r.id === site.id)) throw Error(`${site.name} is not free until ${bk.depart_on}`);
      if (isCabin(site.kind) && site.status === 'dirty' && !flags.force) throw Error(`${site.name} has not been cleaned. Mark it clean with site-status, or --force`);
      if (flags.rego) await db.query('update bookings set vehicle_rego = $1 where id = $2', [flags.rego, bk.id]);
      await db.query("update bookings set status = 'checked_in', site_id = $1, checked_in_at = now() where id = $2", [site.id, bk.id]);
      const f = await folio(db, bk.id);
      result = [{ ref: bk.ref, guest: bk.guest, site: site.name, departs: bk.depart_on, rego: flags.rego || bk.vehicle_rego, balance: fmt(f.balance_cents, s.currency) }];
    } else if (cmd === 'check-out') {
      const bk = await resolveBooking(db, a);
      if (bk.status !== 'checked_in') throw Error(`${bk.ref} is ${bk.status}, not checked in`);
      // Leaving early: nights from today on come off the bill. At least one night stays.
      if (now < bk.depart_on) {
        const depart = now > bk.arrive_on ? now : addDays(bk.arrive_on, 1);
        await db.query('delete from booking_nights where booking_id = $1 and night_on >= $2', [bk.id, depart]);
        await db.query('update bookings set depart_on = $1 where id = $2', [depart, bk.id]);
      }
      const f = await folio(db, bk.id);
      if (f.balance_cents > 0 && !flags.owing) throw Error(`${fmt(f.balance_cents, s.currency)} is owing on ${bk.ref}. Take it with pay, or check out with --owing`);
      await db.query("update bookings set status = 'checked_out', checked_out_at = now() where id = $1", [bk.id]);
      const [site] = await db.query('select s.id, t.kind from sites s join site_types t on t.id = s.site_type_id where s.id = $1', [bk.site_id]);
      if (isCabin(site.kind)) {
        await db.query("update sites set status = 'dirty' where id = $1", [site.id]);
        await db.query("insert into housekeeping (site_id, kind, note) values ($1, 'dirty', $2)", [site.id, `check-out ${bk.ref}`]);
      }
      const after = await folio(db, bk.id);
      let [inv] = await db.query('select * from invoices where booking_id = $1', [bk.id]);
      if (!inv) [inv] = await db.query('insert into invoices (number, booking_id, total_cents, gst_cents) values ($1, $2, $3, $4) returning *', [await nextNumber(db, 'invoices', 'number', s.invoice_prefix), bk.id, after.total_cents, after.gst_cents]);
      result = [{ ref: bk.ref, guest: bk.guest, nights: after.nights, total: fmt(after.total_cents, s.currency), gst_included: fmt(after.gst_cents, s.currency), balance: fmt(after.balance_cents, s.currency), invoice: inv.number }];
    } else if (cmd === 'cancel' || cmd === 'no-show') {
      const bk = await resolveBooking(db, a);
      const allowed = cmd === 'cancel' ? ['enquiry', 'confirmed'] : ['confirmed'];
      if (!allowed.includes(bk.status)) throw Error(`${bk.ref} is ${bk.status}`);
      if (cmd === 'no-show' && bk.arrive_on > now) throw Error(`${bk.ref} is not due until ${bk.arrive_on}`);
      await db.query('update bookings set status = $1, cancelled_on = $2, cancel_reason = $3 where id = $4', [cmd === 'cancel' ? 'cancelled' : 'no_show', now, flags.reason || (cmd === 'no-show' ? 'did not arrive' : ''), bk.id]);
      if (flags.fee) await db.query("insert into charges (booking_id, kind, description, amount_cents) values ($1, 'cancellation', $2, $3)", [bk.id, cmd === 'cancel' ? 'Cancellation fee' : 'No-show fee', toCents(flags.fee, '--fee')]);
      const f = await folio(db, bk.id);
      result = [{ ref: bk.ref, guest: bk.guest, status: f.status, fee: fmt(f.extras_cents, s.currency), paid: fmt(f.paid_cents, s.currency), balance: fmt(f.balance_cents, s.currency), next: f.balance_cents < 0 ? 'refund the difference, or keep it as agreed in your terms' : f.balance_cents > 0 ? 'charge the card on file or send the fee request' : 'nothing owing' }];
    } else if (cmd === 'charge') {
      const bk = await resolveBooking(db, a);
      if (bk.status === 'enquiry') throw Error(`${bk.ref} is an enquiry; confirm it before charging`);
      const kind = flags.kind || 'extra';
      const amount = toCents(b, 'amount', { negative: kind === 'discount' });
      result = await db.query('insert into charges (booking_id, kind, description, amount_cents, gst_applies) values ($1, $2, $3, $4, $5) returning posted_on, kind, description, round(amount_cents / 100.0, 2) amount',
        [bk.id, kind, required(c, 'description'), kind === 'discount' ? -Math.abs(amount) : amount, !flags.no_gst]);
    } else if (cmd === 'pay' || cmd === 'refund') {
      const bk = await resolveBooking(db, a);
      const amount = toCents(b, 'amount');
      if (!(amount > 0)) throw Error('Amount must be more than zero');
      await db.query('insert into payments (booking_id, kind, method, amount_cents, reference) values ($1, $2, $3, $4, $5)',
        [bk.id, cmd === 'refund' ? 'refund' : flags.deposit ? 'deposit' : 'payment', flags.method || 'card', cmd === 'refund' ? -amount : amount, flags.reference || '']);
      const f = await folio(db, bk.id);
      if (cmd === 'refund' && f.paid_cents < 0) throw Error(`That refunds more than was paid (${fmt(f.paid_cents + amount, s.currency)})`);
      result = [{ ref: bk.ref, guest: bk.guest, [cmd === 'refund' ? 'refunded' : 'paid']: fmt(amount, s.currency), total: fmt(f.total_cents, s.currency), balance: fmt(f.balance_cents, s.currency) }];
    } else if (cmd === 'site-status') {
      const site = await resolve(db, 'site', a);
      const status = required(b, 'clean, dirty, inspected or out_of_order').replace('-', '_');
      if (!['clean', 'dirty', 'inspected', 'out_of_order'].includes(status)) throw Error('Status must be clean, dirty, inspected or out_of_order');
      if (status === 'out_of_order') {
        required(flags.reason, '--reason for taking the site out of order');
        if ((await db.query("select 1 from bookings where site_id = $1 and status = 'checked_in'", [site.id])).length && !flags.force) throw Error(`${site.name} has a guest on it. Move them first, or --force`);
        if ((await db.query("select 1 from agreements where site_id = $1 and status = 'active'", [site.id])).length && !flags.force) throw Error(`${site.name} is under a long-stay agreement. Use --force to record work on it anyway`);
      }
      await db.query('update sites set status = $1, out_of_order_reason = $2, out_of_order_until = $3 where id = $4',
        [status, status === 'out_of_order' ? flags.reason : '', status === 'out_of_order' ? isoDay(flags.until, '--until') : null, site.id]);
      await db.query('insert into housekeeping (site_id, kind, done_by, note) values ($1, $2, $3, $4)',
        [site.id, status === 'out_of_order' ? 'out_of_order' : site.status === 'out_of_order' ? 'back_in_service' : status === 'inspected' ? 'inspect' : status, flags.by || '', flags.reason || '']);
      const hit = status === 'out_of_order' ? await db.query("select ref from v_live where site_id = $1 and status = 'confirmed' and depart_on > $2 and arrive_on <= coalesce($3::date, $2::date + 30) order by arrive_on", [site.id, now, isoDay(flags.until, '--until')]) : [];
      result = [{ site: site.name, status, bookings_to_move: hit.map((h) => h.ref).join(', ') || 'none' }];
    } else if (cmd === 'night-audit') {
      // End of day: stayover cabins need a tidy tomorrow, no-shows are listed for a decision, tonight's numbers are recorded.
      const stay = await db.query(`update sites set status = 'dirty' where id in (select b.site_id from bookings b join site_types t on t.id = b.site_type_id
        where b.status = 'checked_in' and b.depart_on > $1 and t.kind in ('cabin', 'unit')) and status <> 'out_of_order' returning name`, [now]);
      const [night] = await db.query(`select count(*) filter (where status = 'checked_in') in_house, coalesce(sum(b.adults + b.children), 0) people,
        coalesce(sum(n.rate_cents), 0) revenue from bookings b left join booking_nights n on n.booking_id = b.id and n.night_on = $1 where b.status = 'checked_in'`, [now]);
      const [held] = await db.query("select count(*) n, coalesce(sum(occupants), 0) people from agreements where status = 'active' and starts_on <= $1 and (ends_on is null or ends_on >= $1)", [now]);
      const [sites] = await db.query('select count(*) n from sites where active');
      const noShows = await db.query("select ref from bookings where status = 'confirmed' and arrive_on <= $1", [now]);
      const [tomorrow] = await db.query("select count(*) n from bookings where status = 'confirmed' and arrive_on = $1", [addDays(now, 1)]);
      result = [{ night: now, casual_sites: Number(night.in_house), long_stay_sites: Number(held.n), people_on_site: Number(night.people) + Number(held.people),
        occupancy_pct: Math.round(1000 * (Number(night.in_house) + Number(held.n)) / Number(sites.n)) / 10, site_revenue: fmt(night.revenue, s.currency),
        stayover_cabins_marked_dirty: stay.length, not_arrived: noShows.map((x) => x.ref).join(', ') || 'none', arrivals_tomorrow: Number(tomorrow.n) }];
    } else if (cmd === 'agree') {
      // agree "<occupant>" <site> <resident|annual|seasonal> <start date> --fee= [--period=week]
      const site = await resolve(db, 'site', b);
      const kind = String(required(c, 'resident, annual or seasonal')).toLowerCase();
      if (!KINDS.includes(kind)) throw Error('Kind must be resident, annual or seasonal');
      const start = isoDay(required(d, 'start date'), 'start date');
      const ends = isoDay(flags.ends_on, '--ends-on');
      if (ends && ends < start) throw Error(`--ends-on ${ends} is before the start ${start}`);
      const period = flags.period || 'week';
      if (!['week', 'fortnight', 'month', 'year'].includes(period)) throw Error('--period must be week, fortnight, month or year');
      const fee = toCents(flags.fee, '--fee (the site fee per period)');
      const clash = await db.query(`select ref from v_holding where site_id = $1 and status = 'active' and starts_on <= coalesce($3::date, '9999-12-31') and $2 <= holds_to
        union all select ref from v_live where site_id = $1 and status in ('confirmed', 'checked_in') and depart_on > $2 and ($3::date is null or arrive_on <= $3::date)`, [site.id, start, ends]);
      if (clash.length && !flags.force) throw Error(`${site.name} is taken from ${start} by ${clash.map((x) => x.ref).join(', ')}. Move them first, or --force`);
      const guest = await guestFor(db, required(a, 'occupant name'), flags);
      const kwh = flags.kwh !== undefined ? Number(flags.kwh) : null;
      if (kwh !== null && !(kwh >= 0)) throw Error('--kwh is the meter reading at the start, like 18204.5');
      if (kwh !== null && !site.has_meter) throw Error(`${site.name} has no meter on record. Set it with set site "${site.name}" --has-meter=true`);
      const ref = await nextNumber(db, 'agreements', 'ref', 'LS-', 101);
      [result] = await db.query(`insert into agreements (ref, guest_id, site_id, kind, starts_on, ends_on, fee_cents, fee_period, billed_to, occupants, own_dwelling, main_residence,
          written_agreement, signed_on, disclosure_given_on, rules_given_on, bond_cents, power_billed_kwh, power_billed_on, vehicle_rego)
        values ($1, $2, $3, $4, $5, $6, $7, $8, $5, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19) returning *`,
      [ref, guest.id, site.id, kind, start, ends, fee, period, Number(flags.occupants || 1), !flags.park_dwelling, !!flags.main_residence,
        !!flags.signed_on, isoDay(flags.signed_on, '--signed-on'), isoDay(flags.disclosure_given_on, '--disclosure-given-on'), isoDay(flags.rules_given_on, '--rules-given-on'),
        flags.bond ? toCents(flags.bond, '--bond') : 0, kwh, kwh !== null ? start : null, flags.rego || '']);
      if (kwh !== null) await db.query('insert into meter_readings (site_id, read_on, kwh, read_by) values ($1, $2, $3, $4) on conflict (site_id, read_on) do update set kwh = excluded.kwh', [site.id, start, kwh, 'start of agreement']);
      result = [{ ref, kind, occupant: guest.name, site: site.name, starts_on: start, ends_on: ends, fee: `${fmt(fee, s.currency)} a ${period}`, signed: flags.signed_on ? 'yes' : 'not yet: record it with set agreement --signed-on=' }];
    } else if (cmd === 'end-agreement') {
      const ag = await resolveAgreement(db, a);
      if (ag.status !== 'active') throw Error(`${ag.ref} has already ended`);
      const last = isoDay(required(b, 'the last night on site'), 'last night');
      if (last < ag.starts_on) throw Error(`${last} is before the agreement started (${ag.starts_on})`);
      await db.query('update agreements set ends_on = $1, status = $2 where id = $3', [last, last < now ? 'ended' : 'active', ag.id]);
      const v = await account(db, ag.id);
      result = [{ ref: ag.ref, occupant: ag.guest, site: ag.site, last_night: last, status: last < now ? 'ended' : 'ending', balance: fmt(v.balance_cents, s.currency), billed_to: v.billed_to,
        next: v.balance_cents > 0 ? 'take the balance with pay-account, or record what is owed' : 'bill-residents bills the fees to the last night' }];
    } else if (cmd === 'give-notice') {
      const ag = await resolveAgreement(db, a);
      if (ag.status !== 'active') throw Error(`${ag.ref} has ended`);
      const on = isoDay(flags.on, '--on') || now;
      await db.query('update agreements set notice_given_on = $1, notice_reason = $2 where id = $3', [on, required(flags.reason, '--reason for the notice'), ag.id]);
      result = [{ ref: ag.ref, occupant: ag.guest, site: ag.site, notice_given_on: on, reason: flags.reason, law: ag.tenancy_law || 'not decided: check which law covers this agreement before relying on the notice' }];
    } else if (cmd === 'bill-residents') {
      // Post every site fee period that has started, up to --through (default today). Partial last periods are charged by the day.
      const through = isoDay(flags.through, '--through') || now;
      const list = a ? [await resolveAgreement(db, a)] : await db.query("select a.*, g.name guest, si.name site from agreements a join guests g on g.id = a.guest_id join sites si on si.id = a.site_id where a.status = 'active' order by si.name");
      result = [];
      for (const ag of list) {
        let from = ag.billed_to, periods = 0, cents = 0;
        while (from <= through && (!ag.ends_on || from <= ag.ends_on)) {
          let to = addDays(nextPeriod(from, ag.fee_period), -1);
          let amount = Number(ag.fee_cents);
          if (ag.ends_on && to > ag.ends_on) {
            amount = Math.round(amount * (daysBetween(from, ag.ends_on) + 1) / (daysBetween(from, to) + 1));
            to = ag.ends_on;
          }
          if (amount > 0) await db.query("insert into account_lines (agreement_id, posted_on, kind, description, period_from, period_to, amount_cents) values ($1, $2, 'site_fee', $3, $4, $5, $6)",
            [ag.id, from, `Site fee ${ag.site}, ${from} to ${to}`, from, to, amount]);
          periods++; cents += amount; from = addDays(to, 1);
        }
        await db.query("update agreements set billed_to = $1, status = case when ends_on is not null and ends_on < $2 then 'ended' else status end where id = $3", [from, now, ag.id]);
        if (periods || a) {
          const v = await account(db, ag.id);
          result.push({ ref: ag.ref, occupant: ag.guest, site: ag.site, periods_billed: periods, billed: fmt(cents, s.currency), billed_to: from, balance: fmt(v.balance_cents, s.currency) });
        }
      }
      if (!result.length) result = [{ result: `every agreement is billed past ${through}` }];
    } else if (cmd === 'read-meter') {
      const site = await resolve(db, 'site', a);
      if (!site.has_meter) throw Error(`${site.name} has no meter on record. Set it with set site "${site.name}" --has-meter=true`);
      const kwh = Number(required(b, 'meter reading in kWh'));
      if (!(kwh >= 0)) throw Error('The reading is a number of kWh, like 18412.5');
      const on = isoDay(flags.on, '--on') || now;
      const [prev] = await db.query('select read_on, kwh from meter_readings where site_id = $1 and read_on < $2 order by read_on desc limit 1', [site.id, on]);
      if (prev && kwh < Number(prev.kwh) && !flags.force) throw Error(`${kwh} is below the last reading (${prev.kwh} on ${prev.read_on}). Check the meter, or --force for a replaced meter`);
      await db.query('insert into meter_readings (site_id, read_on, kwh, read_by) values ($1, $2, $3, $4) on conflict (site_id, read_on) do update set kwh = excluded.kwh, read_by = excluded.read_by', [site.id, on, kwh, flags.by || '']);
      result = [{ site: site.name, read_on: on, kwh, previous: prev ? `${prev.kwh} on ${prev.read_on}` : 'first reading', used_kwh: prev ? Math.round((kwh - Number(prev.kwh)) * 10) / 10 : null }];
    } else if (cmd === 'bill-power') {
      // On-charge power used since the last bill, at the settings rate (or --rate in cents per kWh).
      const rate = flags.rate !== undefined ? Number(flags.rate) : Number(s.power_cents_per_kwh);
      if (!(rate >= 0)) throw Error('--rate is cents per kWh, like 34.5');
      const meters = await db.query('select * from v_meters');
      result = [];
      for (const m of meters) {
        if (m.last_kwh === null) continue;
        if (m.power_billed_kwh === null) {
          await db.query('update agreements set power_billed_kwh = $1, power_billed_on = $2 where ref = $3', [m.last_kwh, m.last_read_on, m.ref]);
          result.push({ ref: m.ref, site: m.site, used_kwh: 0, charged: fmt(0, s.currency), note: `opening reading ${m.last_kwh} recorded` });
          continue;
        }
        const used = Math.round((Number(m.last_kwh) - Number(m.power_billed_kwh)) * 10) / 10;
        if (!(used > 0)) continue;
        const cents = Math.round(used * rate);
        const [ag] = await db.query('select id from agreements where ref = $1', [m.ref]);
        await db.query("insert into account_lines (agreement_id, posted_on, kind, description, period_from, period_to, amount_cents) values ($1, $2, 'power', $3, $4, $5, $6)",
          [ag.id, now, `Power ${m.site}: ${m.power_billed_kwh} to ${m.last_kwh} kWh, ${used} kWh at ${rate} c`, m.power_billed_on, m.last_read_on, cents]);
        await db.query('update agreements set power_billed_kwh = $1, power_billed_on = $2 where id = $3', [m.last_kwh, m.last_read_on, ag.id]);
        result.push({ ref: m.ref, site: m.site, used_kwh: used, charged: fmt(cents, s.currency), note: `${m.power_billed_on} to ${m.last_read_on}` });
      }
      if (!result.length) result = [{ result: 'no new meter readings to bill' }];
    } else if (cmd === 'pay-account') {
      const ag = await resolveAgreement(db, a);
      const amount = toCents(b, 'amount');
      if (!(amount > 0)) throw Error('Amount must be more than zero');
      const method = flags.method || 'bank';
      await db.query("insert into account_lines (agreement_id, posted_on, kind, description, amount_cents, method, reference) values ($1, $2, 'payment', $3, $4, $5, $6)",
        [ag.id, isoDay(flags.on, '--on') || now, `Payment received (${method})`, -amount, method, flags.reference || '']);
      const v = await account(db, ag.id);
      result = [{ ref: ag.ref, occupant: ag.guest, paid: fmt(amount, s.currency), balance: fmt(v.balance_cents, s.currency), in_credit: v.balance_cents < 0 }];
    } else if (cmd === 'charge-account') {
      // Anything else on a long-stay account: water, a key, an opening balance brought across, or a credit.
      const ag = await resolveAgreement(db, a);
      const kind = flags.kind || 'other';
      if (!['other', 'water', 'site_fee', 'power', 'credit'].includes(kind)) throw Error('--kind must be other, water, site_fee, power or credit');
      const amount = toCents(b, 'amount');
      if (!(amount > 0)) throw Error('Amount must be more than zero');
      await db.query('insert into account_lines (agreement_id, posted_on, kind, description, amount_cents, reference) values ($1, $2, $3, $4, $5, $6)',
        [ag.id, isoDay(flags.on, '--on') || now, kind, required(c, 'description'), kind === 'credit' ? -amount : amount, flags.reference || '']);
      const v = await account(db, ag.id);
      result = [{ ref: ag.ref, occupant: ag.guest, [kind === 'credit' ? 'credited' : 'charged']: fmt(amount, s.currency), description: c, balance: fmt(v.balance_cents, s.currency) }];
    } else if (cmd === 'log') {
      const note = required(b, 'note');
      let target = null;
      for (const [kind, fn] of [['booking', () => resolveBooking(db, a)], ['agreement', () => resolveAgreement(db, a)], ['guest', () => resolve(db, 'guest', a)], ['site', () => resolve(db, 'site', a)]]) {
        try { target = { kind, rec: await fn() }; break; } catch (e) { if (/Ambiguous/.test(e.message)) throw e; }
      }
      if (!target) throw Error(`No booking, agreement, guest or site matches "${a}"`);
      result = await db.query(`insert into notes (${target.kind}_id, note) values ($1, $2) returning *`, [target.rec.id, note]);
    }
    await audit(db, cmd, result?.[0]?.id && /^[0-9a-f-]{36}$/.test(result[0].id) ? result[0].id : null, { args: pos.slice(1), flags });
    await db.exec(cmd === 'import' && !flags.apply ? 'ROLLBACK' : 'COMMIT');
    return result;
  } catch (e) {
    await db.exec('ROLLBACK');
    throw e;
  }
}

// Drafts to drafts/. Nothing here sends.
async function draft(db, cmd, who, flags) {
  const s = await settingsOf(db);
  const name = s.business_name.replace(/ \(demo\)$/, '');
  const sign = ['Nga mihi,', `[your name], ${name}`, ''];
  const head = (title, ref, g, subject) => [`# ${title}: ${ref}`, '', 'For review. Nothing has been sent.', '', `To: ${g.email ? `${g.name} <${g.email}>` : `${g.name} (no email on file)`}`, `Subject: ${subject}`, ''];
  if (cmd === 'draft-arrears-reminder') {
    const list = who ? [await resolveAgreement(db, who)] : await db.query(`select a.* from agreements a join v_arrears r on r.ref = a.ref where a.status = 'active' and r.days_behind > ${Number(flags.days || 7)} order by a.ref`);
    const out = [];
    for (const ag of list) {
      const v = await account(db, ag.id);
      if (v.balance_cents <= 0) throw Error(`${v.ref} is not behind on its account`);
      const [g] = await db.query('select * from guests where id = $1', [v.guest_id]);
      const lines = await db.query("select period_from, period_to, description, round(amount_cents / 100.0, 2) amount from account_lines where agreement_id = $1 and kind <> 'payment' order by posted_on desc limit 6", [v.id]);
      const body = [...head('Draft account reminder', v.ref, g, `Your site account at ${name}`), `Kia ora ${g.name.split(' ')[0]},`, '',
        `Our records show ${fmt(v.balance_cents, v.currency)} owing on your account for ${v.site}${v.last_paid_on ? `, with the last payment received on ${v.last_paid_on}` : ''}.`, '',
        'The most recent charges:', '', ...lines.reverse().map((l) => `- ${l.description}: ${v.currency} ${l.amount}`), '',
        `Your site fee is ${fmt(v.fee_cents, v.currency)} a ${v.fee_period}. You can pay by [bank account or payment link], quoting ${v.ref}.`, '',
        'If something has changed for you, come and see us at the office or reply here, and we will work out a plan together.', '', ...sign];
      out.push({ ref: v.ref, occupant: g.name, owing: fmt(v.balance_cents, v.currency), file: await writeDraft(`arrears-${v.ref}`, body.join('\n')), status: 'draft' });
    }
    return out;
  }
  const one = async (bk) => {
    const f = await folio(db, bk.id);
    const [g] = await db.query('select * from guests where id = $1', [bk.guest_id]);
    const first = g.name.split(' ')[0];
    const stay = `${f.site_type}${f.site ? ` (${f.site})` : ''}, ${f.arrive_on} to ${f.depart_on} (${f.nights} night${f.nights === 1 ? '' : 's'})`;
    let body;
    if (cmd === 'draft-confirmation') {
      body = [...head('Draft booking confirmation', bk.ref, g, `Your booking at ${name}, ${f.arrive_on}`), `Kia ora ${first},`, '', `Thanks for booking with us. Your stay is confirmed: ${stay}, for ${f.adults} adult${f.adults === 1 ? '' : 's'}${f.children ? ` and ${f.children} child${f.children === 1 ? '' : 'ren'}` : ''}.`, '',
        `Total: ${fmt(f.total_cents, s.currency)} including GST.`, f.deposit_cents > 0 && f.paid_cents < f.deposit_cents ? `A deposit of ${fmt(f.deposit_cents, s.currency)} is due by ${f.deposit_due_on}.` : `Paid so far: ${fmt(f.paid_cents, s.currency)}.`, '',
        f.site_kind === 'cabin' || f.site_kind === 'unit' ? 'Linen is [included or available to hire].' : `If you are bringing a van, caravan or motorhome, reply with its length${f.van_length_m ? ` (we have ${f.van_length_m} m)` : ''} and registration so we can hold the right site.`, '',
        `Your booking reference is ${bk.ref}. Reply to this email if anything changes.`, '', ...sign];
    } else if (cmd === 'draft-prearrival') {
      body = [...head('Draft pre-arrival note', bk.ref, g, `See you soon at ${name}`), `Kia ora ${first},`, '', `We are looking forward to having you on ${f.arrive_on}: ${stay}.`, '',
        `Check-in is from ${s.check_in_time} and check-out is by ${s.check_out_time}. If you will arrive after the office closes at [time], your site map and gate code will be at [place].`,
        f.balance_cents > 0 ? `The balance of ${fmt(f.balance_cents, s.currency)} is payable on arrival.` : 'Your stay is paid in full.', '',
        'Reply with your arrival time and anything you need for the stay.', '', ...sign];
    } else if (cmd === 'draft-deposit-reminder') {
      const owing = f.deposit_cents - Math.max(f.paid_cents, 0);
      if (owing <= 0) throw Error(`${bk.ref} has paid its deposit`);
      body = [...head('Draft deposit reminder', bk.ref, g, `Deposit for your stay at ${name}`), `Kia ora ${first},`, '', `Just a reminder that the deposit of ${fmt(owing, s.currency)} for your stay (${stay}) was due on ${f.deposit_due_on}.`, '',
        `You can pay by [payment link or bank account]. Please use your booking reference ${bk.ref}.`, '', 'If your plans have changed, reply and we will sort it out.', '', ...sign];
    } else if (cmd === 'draft-review-request') {
      if (f.status !== 'checked_out') throw Error(`${bk.ref} has not checked out`);
      body = [...head('Draft thank-you and review request', bk.ref, g, `Thanks for staying at ${name}`), `Kia ora ${first},`, '', `Thanks for staying with us${f.nights > 1 ? ` for ${f.nights} nights` : ''}. We hope you enjoyed the park.`, '',
        'If you have a minute, a short review helps other travellers find us: [review link].', '', 'Next time, book direct with us and quote this email for our returning-guest rate.', '', ...sign];
    }
    return { ref: bk.ref, guest: g.name, file: await writeDraft(`${cmd.slice(6)}-${bk.ref}`, body.join('\n')), status: 'draft' };
  };
  if (cmd === 'draft-prearrival' && !who) {
    const days = Number(flags.days || 2);
    const due = await db.query("select b.*, g.name guest from bookings b join guests g on g.id = b.guest_id where b.status = 'confirmed' and b.arrive_on between park_today() and park_today() + $1::int order by b.arrive_on", [days]);
    const out = [];
    for (const bk of due) out.push(await one(bk));
    return out;
  }
  if (!['draft-confirmation', 'draft-prearrival', 'draft-deposit-reminder', 'draft-review-request'].includes(cmd)) throw Error(`Unknown draft "${cmd}". Run help.`);
  return [await one(await resolveBooking(db, who))];
}

const HIDE = new Set(['source_data', 'created_at', 'updated_at', 'raw']);
export function format(value) {
  if (Array.isArray(value)) {
    if (!value.length) return '  (none)';
    const cols = Object.keys(value[0]).filter((k) => !HIDE.has(k));
    const rows = value.map((r) => Object.fromEntries(cols.map((k) => {
      const v = r[k];
      return [k, v instanceof Date ? v.toISOString().slice(0, 10) : v && typeof v === 'object' ? JSON.stringify(v) : v];
    })));
    return table(rows, cols.map((k) => ({ key: k, label: k.replaceAll('_', ' '), width: k === 'id' || k.endsWith('_id') ? 8 : 70 })));
  }
  return Object.entries(value).map(([k, v]) => `${k.toUpperCase()}\n${format(Array.isArray(v) ? v : [v])}`).join('\n\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  let db;
  try {
    db = await getDb();
    const result = await run(db, process.argv.slice(2));
    console.log(process.argv.includes('--json') ? JSON.stringify(result, null, 2) : format(result));
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  } finally {
    await db?.close();
  }
}
