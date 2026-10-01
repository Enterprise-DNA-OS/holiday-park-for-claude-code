#!/usr/bin/env node
// npm test: a throwaway database, the migration, the demo park, then every report and action
// with assertions on the rules that matter. Needs no secrets. Runs on Windows and Linux.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { getDb, REPO_ROOT } from './lib/db.mjs';
import { migrate } from './migrate.mjs';
import { seed } from './seed.mjs';
import { run, actions } from './park.mjs';
import { reports } from './lib/domain.mjs';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'park-test-'));
process.env.DATA_DIR = path.join(dir, 'db');
process.env.DATABASE_URL = '';
process.env.OUTPUT_DIR = dir;

let db, checks = 0;
const seen = new Set();
const eq = (a, b, msg) => { assert.deepEqual(a, b, msg); checks++; };
const ok = (v, msg) => { assert.ok(v, msg); checks++; };
const call = async (...args) => { seen.add(args[0]); return run(db, args); };
const reject = async (args, re) => { seen.add(args[0]); await assert.rejects(() => run(db, args), re); checks++; };
const find = (rows, key, value) => rows.find((r) => r[key] === value);
const one = async (sql, params = []) => (await db.query(sql, params))[0];
const cli = (...args) => spawnSync(process.execPath, ['scripts/park.mjs', ...args], { cwd: REPO_ROOT, env: process.env, encoding: 'utf8' });
const balanceOf = async (ref) => Number((await one('select balance_cents from v_agreements where ref = $1', [ref])).balance_cents);

try {
  db = await getDb();
  eq((await migrate(db)).ran, ['0001_holiday_park.sql']);
  eq((await migrate(db)).ran.length, 0);
  await seed(db);
  const count = (await one('select (select count(*) from bookings) + (select count(*) from account_lines) n')).n;
  await seed(db);
  eq((await one('select (select count(*) from bookings) + (select count(*) from account_lines) n')).n, count, 'seed is idempotent');
  ok(Number(count) > 500, 'six months of history loaded');
  const today = (await one('select park_today()::text d')).d;
  const day = (n) => new Date(Date.parse(`${today}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);
  for (const name of Object.keys(reports)) ok(Array.isArray(await call(name)), `${name} returns rows`);
  ok((await call('help'))[0].actions.includes('bill-residents'));

  // The office's morning: what needs a decision, which cabins to clean first, who arrives, what is on every site.
  const reasons = (await call('attention')).map((r) => r.reason);
  for (const r of ['arriving with no site', 'double booked', 'van too long for the site', 'no-show?', 'balance owing at departure', 'departed owing', 'deposit overdue',
    'no tax invoice', 'enquiry gone quiet', 'cabin not ready', 'out of order past its date', 'long stay in arrears', 'site fees not billed', 'meter reading due']) ok(reasons.includes(r), `attention shows ${r}`);
  eq((await call('housekeeping'))[0].site, 'Cabin 2', 'the dirty cabin with an arrival comes first');
  ok(!(await call('housekeeping')).some((r) => r.site === 'P1'), 'powered sites are not on the cleaning list');
  eq((await call('arrivals')).map((r) => r.ref), ['H-1005', 'H-1004', 'H-1006']);
  const conflicts = await call('conflicts');
  eq(conflicts.map((c) => c.kind).sort(), ['booking', 'calendar block', 'long stay'], 'a double booking, a Booking.com clash and a casual booking on an annual site');
  const board = await call('site-board');
  eq(find(board, 'site', 'L2').who, 'Graham Pike', 'the annual van holds its site');
  eq(find(board, 'site', 'Cabin 3').tonight, 'out of order');

  // Compliance: registration, tenancy thresholds, paperwork, long-stay GST, invoices, privacy, card numbers.
  const rules = (await call('compliance')).map((r) => r.rule);
  for (const rule of ['PARK-REGISTRATION', 'NZ-TENANCY-50-DAYS', 'WRITTEN-AGREEMENT', 'NZ-LONG-STAY-GST', 'NZ-INVOICE-OVER-1000', 'PRIVACY-RETENTION', 'CARD-DATA', 'DOUBLE-BOOKING']) ok(rules.includes(rule), `compliance finds ${rule}`);
  ok(!rules.includes('GST-NUMBER'), 'the demo has a GST number');
  ok(!(await call('compliance')).some((r) => r.rule === 'NZ-TENANCY-50-DAYS' && r.ref === 'LS-102'), 'the annual van has its law recorded');
  const crew = await one("select gst_cents, reduced_nights from v_folio where ref = 'H-1003'");
  eq([Number(crew.reduced_nights), Number(crew.gst_cents)], [28, 83653], 'nights 29 to 56 carry GST on 60% of the value');
  eq(Number((await one("select gst_cents from v_folio where ref = 'H-1010'")).gst_cents), 15064, 'a short stay carries the full 15%');

  // Occupancy, channels and the books ahead.
  const occ = await call('occupancy');
  ok(occ.filter((m) => !m.on_books && Number(m.occupancy_pct) > 40).length >= 5, 'five past months with real occupancy');
  ok(occ.every((m) => Number(m.long_stay_nights) > 0), 'long-stay sites count as occupied');
  const mix = await call('channel-mix');
  const bdc = find(mix, 'channel', 'Booking.com');
  eq(Number(bdc.commission), Math.round(Number(bdc.revenue) * 15) / 100, 'commission at the channel rate');
  eq(Number(find(mix, 'channel', 'Direct website').commission), 0);
  eq((await call('forecast')).length, 60, 'twelve weeks for each of five site types');
  ok((await call('pickup')).length > 0);
  ok((await call('repeat-guests')).every((g) => Number(g.stays) > 1));
  const grid = await call('availability', `--from=${day(0)}`, '--nights=7');
  eq(grid.length, 5);
  eq(Object.keys(grid[0]).length, 8, 'site type and seven nights');

  // Names: exact, fragment, ambiguous, missing.
  await reject(['booking', 'nobody at all'], /No booking matches/);
  await reject(['site-status', 'Cabin 1', 'clean', '--by=x', '--until'], /needs a value/);
  await reject(['site-status', 'Cabin', 'clean'], /Ambiguous site "Cabin"\. Candidates:/);
  eq((await call('booking', 'grace')).booking[0].ref, 'H-1010');
  eq((await call('guest', 'ruth')).stays[0].ref, 'H-1003');
  eq((await call('guest', 'bev')).agreements[0].ref, 'LS-101');
  eq((await call('agreement', 'L3')).agreement[0].ref, 'LS-103', 'an agreement by its site');

  // Quote and book: base rate for two, extra people on top.
  await reject(['quote', 'Standard cabin', day(14), '1'], /at least 2 nights/);
  eq((await call('quote', 'Powered site', day(20), '2')).quote[0].total, 'NZD 108.00', 'two nights at 54 for two people');
  eq((await call('quote', 'Powered site', day(20), '2', '--adults=3', '--children=1')).quote[0].total, 'NZD 172.00', 'an extra adult at 20 and a child at 12, each night');
  const booked = (await call('book', 'Kiri Walker', 'Powered site', day(40), '3', '--email=kiri@example.com', '--van-length=7.2', '--rego=KW123'))[0];
  eq([booked.ref, booked.status, booked.total], ['H-1017', 'confirmed', 'NZD 162.00']);
  eq(booked.deposit, `NZD 40.50 due ${day(7)}`, '25% deposit, due in seven days');
  eq((await one("select vehicle_rego, van_length_m from bookings where ref = 'H-1017'")).vehicle_rego, 'KW123');
  const ota = (await call('book', 'Kiri Walker', 'Tent site', day(50), day(52), '--channel=Booking.com', '--channel-ref=BDC-1'))[0];
  eq(ota.deposit, 'none', 'the channel collects on an OTA booking');
  eq((await one("select count(*)::int n from guests where name = 'Kiri Walker'")).n, 1, 'the second booking reuses the guest');
  await reject(['book', 'Late Guest', 'Powered site', day(-3), '2'], /in the past/);
  await reject(['book', 'Chloe Twin', 'Powered site', day(7), '3', '--site=P6'], /not free/);
  await reject(['book', 'Big Van', 'Powered site', day(60), '2', '--site=P2', '--van-length=9'], /takes up to 8\.0 m/);
  await reject(['book', 'Big Family', 'Standard cabin', day(60), '2', '--adults=3', '--children=2'], /takes 4/);
  await reject(['book', 'Long Stay Crasher', 'Powered site', day(60), '2', '--site=L1'], /not free/);
  await call('set', 'guest', 'Kiri Walker', '--do-not-rebook=true', '--notes=Left rubbish on the site');
  await reject(['book', 'Kiri Walker', 'Powered site', day(70), '2'], /do not rebook/);
  eq((await call('book', 'Pat Lee', 'Standard cabin', day(30), '2', '--enquiry'))[0].status, 'enquiry');

  // Sites: assign the unassigned (the van to a site it fits), move a double booking, take a cabin out and bring it back.
  eq((await call('assign', 'H-1005'))[0].to_site, 'P4', 'the 11.5 m motorhome goes to the shortest site that takes it');
  eq((await call('assign', 'H-1006'))[0].to_site, 'Cabin 4', 'Aroha gets a clean cabin');
  ok((await call('move', 'H-1013'))[0].to_site !== 'P6', 'the double booking moves to a free site');
  await reject(['move', 'H-1015', 'P1'], /takes up to 8\.5 m/);
  eq((await call('move', 'H-1015'))[0].to_site, 'P3', 'the fifth-wheeler moves to the shortest free site that takes 9.5 m');
  ok(!(await call('attention')).some((r) => r.reason === 'van too long for the site'));
  await reject(['site-status', 'Cabin 4', 'out_of_order'], /--reason/);
  await reject(['site-status', 'Cabin 1', 'out_of_order', '--reason=Leak'], /has a guest/);
  await reject(['site-status', 'L1', 'out_of_order', '--reason=Pad works'], /long-stay agreement/);
  await call('site-status', 'Cabin 3', 'clean', '--by=Mere');
  ok(!(await call('attention')).some((r) => r.reason === 'out of order past its date'), 'Cabin 3 back in service');
  eq((await one("select kind from housekeeping where site_id = '22222222-0000-4000-8000-000000000016' order by created_at desc limit 1")).kind, 'back_in_service');

  // Arrive, charge, pay, leave.
  await reject(['check-in', 'H-1004'], /not been cleaned/);
  await call('site-status', 'Cabin 2', 'inspected', '--by=Mere');
  eq((await call('check-in', 'H-1004'))[0].site, 'Cabin 2');
  await reject(['check-in', 'H-1004'], /checked_in, not confirmed/);
  await reject(['check-in', 'H-1017'], /arrives/);
  eq((await call('check-in', 'H-1005', '--rego=HWY88A'))[0].site, 'P4');
  eq((await one("select vehicle_rego from bookings where ref = 'H-1005'")).vehicle_rego, 'HWY88A');
  await call('charge', 'H-1004', '25', 'Linen hire', '--kind=linen');
  await call('charge', 'H-1004', '5', 'Returning guest', '--kind=discount');
  eq(Number((await one("select extras_cents from v_bookings where ref = 'H-1004'")).extras_cents), 2000);
  await reject(['check-out', 'H-1001'], /NZD 20.00 is owing/);
  eq((await call('pay', 'H-1001', '20', '--method=eftpos'))[0].balance, 'NZD 0.00');
  const out = (await call('check-out', 'H-1001'))[0];
  eq([out.invoice, out.balance, out.total], ['INV-1002', 'NZD 0.00', 'NZD 128.00']);
  eq((await one("select status from sites where name = 'P1'")).status, 'clean', 'a powered site does not go on the cleaning list');
  await reject(['check-out', 'H-1001'], /checked_out/);
  // Leaving the cabin two nights early takes the nights left off the bill.
  const early = (await call('check-out', 'H-1002', '--owing'))[0];
  eq(early.nights, 1, 'Hamish leaves after one of three nights');
  eq(early.balance, 'NZD -220.00', 'paid for three by the channel: the difference shows as owed back');
  eq((await one("select status from sites where name = 'Cabin 1'")).status, 'dirty', 'a cabin departure leaves it to clean');
  ok((await call('balances')).some((r) => r.ref === 'H-1002'));
  await call('refund', 'H-1002', '220', '--method=channel', '--reference=BDC adjustment');
  eq(Number((await one("select balance_cents from v_bookings where ref = 'H-1002'")).balance_cents), 0);
  await reject(['refund', 'H-1002', '5000'], /refunds more than was paid/);

  // Dates change; nights already slept keep their rate.
  eq((await call('change-dates', 'H-1003', day(17)))[0].nights, 57);
  eq(Number((await one("select rate_cents from booking_nights where night_on = $1 and booking_id = '55555555-0000-4000-8000-000000000003'", [day(-10)])).rate_cents), 14000, 'the contract rate stays on slept nights');
  await reject(['change-dates', 'H-1003', day(0)], /check-out/);
  const shifted = (await call('change-dates', 'H-1017', day(41), '2'))[0];
  eq([shifted.arrive_on, shifted.nights], [day(41), 2]);

  // Cancellations, no-shows and deposits.
  const ns = (await call('no-show', 'H-1007', '--fee=40'))[0];
  eq([ns.status, ns.balance], ['no_show', 'NZD 40.00']);
  await reject(['no-show', 'H-1017'], /not due/);
  eq((await call('cancel', 'Pat Lee', '--reason=Booked elsewhere'))[0].status, 'cancelled');
  await reject(['cancel', 'H-1001'], /checked_out/);
  eq((await call('pay', 'H-1008', '219', '--deposit', '--method=bank'))[0].balance, 'NZD 657.00');
  eq(find(await call('deposits'), 'ref', 'H-1008').state, 'paid');
  ok(!(await call('attention')).some((r) => r.reason === 'deposit overdue'));
  ok((await call('cancellations')).some((r) => r.ref === 'H-1007'));

  // Long stays: site fees, power, payments, arrears.
  const arrearsDraft = (await call('draft-arrears-reminder'))[0];
  eq(arrearsDraft.ref, 'LS-103', 'the account more than a week behind gets a reminder');
  const reminder = fs.readFileSync(arrearsDraft.file, 'utf8');
  ok(reminder.includes('Nothing has been sent') && reminder.includes('NZD 626.50') && reminder.includes('Tama Rewi <tama.rewi@example.com>'));
  await reject(['draft-arrears-reminder', 'LS-102'], /not behind/);
  const billed = await call('bill-residents');
  eq(billed.map((b) => [b.ref, b.periods_billed]), [['LS-101', 1], ['LS-103', 1]], 'Bev and Tama each owe this week');
  eq(await balanceOf('LS-101'), 21000);
  ok(!(await call('attention')).some((r) => r.reason === 'site fees not billed'));
  eq((await call('bill-residents'))[0].result, `every agreement is billed past ${today}`, 'billing twice adds nothing');
  await reject(['read-meter', 'P1', '100'], /no meter/);
  await reject(['read-meter', 'L4', '30000'], /below the last reading/);
  eq((await call('read-meter', 'L4', '30410.5', '--by=Mere'))[0].used_kwh, 290.5);
  ok(!(await call('attention')).some((r) => r.reason === 'meter reading due'), 'the overdue meter is read');
  const power = await call('bill-power');
  eq(power.map((p) => [p.ref, p.used_kwh, p.charged]), [['LS-101', 272.5, 'NZD 95.38'], ['LS-103', 295.5, 'NZD 103.43'], ['LS-104', 290.5, 'NZD 101.68']], 'power used since the last bill at 35 c a kWh');
  eq((await call('bill-power'))[0].result, 'no new meter readings to bill');
  eq((await call('pay-account', 'LS-103', String((await balanceOf('LS-103')) / 100), '--reference=Cash at office', '--method=cash'))[0].balance, 'NZD 0.00');
  ok(!(await call('arrears')).some((r) => r.ref === 'LS-103'));
  eq((await call('charge-account', 'LS-104', '420', 'Opening balance from RMS'))[0].balance, 'NZD 521.68', 'on top of the power just billed');
  eq((await call('charge-account', 'LS-104', '420', 'Opening balance reversed', '--kind=credit'))[0].balance, 'NZD 101.68');
  await reject(['charge-account', 'LS-104', '10', 'Bad', '--kind=payment'], /--kind/);
  eq((await call('agreement', 'tama')).balance[0].balance, '0.00');

  // A new permanent on a new site; the site is then not for casual sale.
  await call('add', 'site', '--name=L5', '--site-type=Powered site', '--area=Long-stay lane', '--has-meter=true', '--max-length-m=10', '--sort=24');
  await reject(['agree', 'Wiremu Hart', 'L1', 'resident', day(1), '--fee=200'], /taken/);
  await reject(['agree', 'Wiremu Hart', 'L5', 'tenant', day(1), '--fee=200'], /resident, annual or seasonal/);
  await reject(['agree', 'Wiremu Hart', 'L5', 'resident', day(1)], /--fee/);
  const ag = (await call('agree', 'Wiremu Hart', 'L5', 'resident', day(1), '--fee=200', '--kwh=100', '--signed-on=' + day(0), '--main-residence', '--rego=WH1'))[0];
  eq([ag.ref, ag.fee], ['LS-105', 'NZD 200.00 a week']);
  await reject(['book', 'Sea Guest', 'Powered site', day(30), '2', '--site=L5'], /not free/);
  eq((await one("select kwh from meter_readings where site_id = (select id from sites where name = 'L5')")).kwh, '100.0');
  // Tama's season ends early; the last part-week is charged by the day.
  eq((await call('end-agreement', 'LS-103', day(10)))[0].status, 'ending');
  const last = await call('bill-residents', 'LS-103', `--through=${day(30)}`);
  eq([last[0].billed, last[0].billed_to], ['NZD 100.00', day(11)], 'the last part-week: four nights at 25 a night');
  eq((await one("select status from agreements where ref = 'LS-103'")).status, 'active', 'still on site until the last night');
  await call('give-notice', 'LS-101', '--reason=Site needed for park redevelopment');
  ok((await call('attention')).some((r) => r.reason === 'notice period running' && r.ref === 'LS-101'));
  await call('set', 'agreement', 'LS-101', '--tenancy-law=tenancy');
  ok(!(await call('compliance')).some((r) => r.rule === 'NZ-TENANCY-50-DAYS' && r.ref === 'LS-101'), 'the law is recorded for Bev');
  await reject(['set', 'agreement', 'LS-101', '--tenancy-law=maybe'], /check/);

  // The same records under Australian state rules.
  await call('set', 'settings', '--country=AU', '--state=NSW', '--currency=AUD', '--gst-rate=0.10');
  await call('set', 'agreement', 'LS-102', `--rules-given-on=${day(-399)}`);
  ok((await call('compliance')).some((r) => r.rule === 'NSW-OCCUPATION-AGREEMENT' && r.ref === 'LS-102' && /after signing/.test(r.finding)), 'NSW: park rules given after the agreement was signed');
  await call('set', 'settings', '--state=VIC');
  await call('set', 'agreement', 'LS-104', '--disclosure-given-on=null');
  ok((await call('compliance')).some((r) => r.rule === 'VIC-RESIDENT-60-DAYS' && r.ref === 'LS-104'), 'VIC: a resident past 60 days with no disclosure statement on record');
  ok(!(await call('compliance')).some((r) => r.rule.startsWith('NZ-TENANCY')), 'the NZ rule does not run in Australia');
  await call('set', 'settings', '--country=NZ', '--state=', '--currency=NZD', '--gst-rate=0.15');

  // Drafts only. Nothing sends.
  const conf = (await call('draft-confirmation', 'H-1017'))[0];
  const text = fs.readFileSync(conf.file, 'utf8');
  ok(text.includes('Nothing has been sent') && text.includes('Kiri Walker <kiri@example.com>') && text.includes('H-1017') && text.includes('7.2 m'));
  ok(fs.readFileSync((await call('draft-review-request', 'H-1001'))[0].file, 'utf8').includes('Emma'));
  await reject(['draft-review-request', 'H-1003'], /not checked out/);
  await reject(['draft-deposit-reminder', 'H-1008'], /paid its deposit/);
  ok((await call('draft-prearrival')).some((d) => d.ref === 'H-1006'), 'pre-arrival notes for the next two days');

  // Night audit.
  const audit = (await call('night-audit'))[0];
  ok(audit.casual_sites >= 3 && audit.long_stay_sites === 4 && audit.not_arrived === 'none');
  ok(audit.people_on_site > audit.casual_sites);
  eq((await one("select status from sites where name = 'Cabin 2'")).status, 'dirty', 'stayover cabins need a tidy tomorrow');
  eq((await one("select status from sites where name = 'P4'")).status, 'clean', 'sites are not cleaned');

  // Records, settings and notes.
  await call('add', 'site-type', '--name=Bell tent', '--kind=cabin', '--base-rate=149', '--max-guests=2');
  await call('add', 'rate', '--name=New Year', '--site-type=Bell tent', '--starts-on=2028-12-28', '--ends-on=2029-01-03', '--nightly=219', '--min-nights=3');
  await reject(['add', 'site', '--name=G1'], /--site-type/);
  await call('add', 'channel', '--name=Agoda', '--kind=ota', '--commission-pct=17');
  await call('set', 'channel', 'Booking.com', '--commission-pct=16');
  eq(Number((await one("select commission_pct from channels where name = 'Booking.com'")).commission_pct), 16);
  await call('set', 'settings', '--deposit-pct=30', `--registration-expires-on=${day(365)}`);
  eq((await one('select deposit_pct from settings')).deposit_pct, 30);
  ok(!(await call('compliance')).some((r) => r.rule === 'PARK-REGISTRATION'), 'the renewed registration clears');
  await reject(['add', 'site', '--name=Bad', '--site-type=Powered site', '--colour=red'], /Unknown site field --colour/);
  await reject(['add', 'site-type', '--name=Bad', '--base-rate=lots'], /amount/);
  await call('log', 'H-1003', 'Crew staying on for the late apples, PO to follow');
  await call('log', 'LS-104', 'Asked about moving to a river site next year');
  ok((await call('activity')).some((r) => r.kind === 'note' && r.about === 'LS-104'));

  // Import from RMS Cloud: the date order is asked, a dry run first, then apply, then nothing new.
  const csv = path.join(REPO_ROOT, 'fixtures', 'rms', 'reservations.csv');
  await reject(['import', 'rms', csv], /--date-order/);
  const dry = (await call('import', 'rms', csv, '--date-order=dmy'))[0];
  eq([dry.mode, dry.inserted], ['dry-run', 5]);
  eq((await one("select count(*)::int n from bookings where ref like '3000%'")).n, 0, 'dry run saves nothing');
  const rms = (await call('import', 'rms', csv, '--date-order=dmy', '--apply'))[0];
  eq([rms.inserted, rms.site_types_created, rms.channels_created, rms.unassigned, rms.long_term], [5, 1, 2, 3, 1]);
  eq(rms.guests_created, 4, 'Emma Clarke matched by email');
  ok(rms.notes.some((n) => /30005 marked Long Term/.test(n)));
  eq((await call('import', 'rms', csv, '--date-order=dmy', '--apply'))[0].existing, 5, 'second run adds nothing');
  const anna = await one("select * from v_bookings where ref = '30001'");
  eq([anna.site, anna.arrive_on, anna.nights, Number(anna.accommodation_cents), anna.vehicle_rego], ['P3', '2028-03-12', 3, 16200, 'KLR1']);
  eq((await one("select status from bookings where ref = '30004'")).status, 'cancelled');
  eq((await one("select status from bookings where ref = '30003'")).status, 'checked_out');
  eq((await one("select kind from site_types where name = 'Glamping Tent'")).kind, 'cabin');
  eq((await one("select kind from channels where name = 'Booking Engine'")).kind, 'direct');
  eq(Number((await one("select paid_cents from v_bookings where ref = '30002'")).paid_cents), 5500);
  const bad = path.join(dir, 'bad.csv');
  fs.writeFileSync(bad, 'Res No,Arrive,Depart,Surname,Accommodation\n1,2028-05-02,2028-05-01,Guest,100\n');
  await reject(['import', 'rms', bad, '--apply'], /not after arrive/);
  fs.writeFileSync(bad, 'Surname,Arrive\nA,2028-05-01\n');
  await reject(['import', 'rms', bad], /no reservation number/);
  fs.writeFileSync(bad, 'name\n"unterminated\n');
  await reject(['import', 'rms', bad], /Malformed CSV/);
  await reject(['import', 'newbook', bad], /Supported imports/);

  // Outside calendars: Booking.com's feed replaces its own future blocks; ours goes out with no guest names.
  const ics = path.join(REPO_ROOT, 'fixtures', 'ical', 'bookingcom-cabin-4.ics');
  eq((await call('import', 'ical', 'Cabin 4', ics, '--source=bookingcom'))[0].mode, 'dry-run');
  const cal = (await call('import', 'ical', 'Cabin 4', ics, '--source=bookingcom', '--apply'))[0];
  eq([cal.inserted, cal.removed], [2, 1], 'the old demo block is gone from the feed');
  eq((await call('import', 'ical', 'Cabin 4', ics, '--source=bookingcom', '--apply'))[0].unchanged, 2);
  ok(!(await call('conflicts')).some((c) => c.kind === 'calendar block'), 'the Booking.com clash cleared');
  eq((await one("select summary from blocks where uid = 'bdc-8841-2@booking.com'")).summary, 'CLOSED - Not available', 'folded lines unfold');
  await reject(['book', 'Sea Guest', 'Standard cabin', '2028-06-06', '2', '--site=Cabin 4'], /not free/);
  fs.writeFileSync(bad, 'not a calendar');
  await reject(['import', 'ical', 'Cabin 4', bad, '--source=bookingcom'], /Not an iCal file/);
  const feeds = await call('ical-export', 'feeds', '--exclude-source=bookingcom');
  eq(feeds.length, 24);
  const feedL1 = fs.readFileSync(find(feeds, 'site', 'L1').file, 'utf8');
  ok(feedL1.includes('BEGIN:VCALENDAR') && feedL1.includes('SUMMARY:Not available') && !feedL1.includes('Bev'), 'the long-stay site is busy, with no name');
  ok(!fs.readFileSync(find(feeds, 'site', 'Cabin 4').file, 'utf8').includes('booking.com'), 'Booking.com blocks are not sent back to Booking.com');

  // Export, then the rest of the reports on the changed data.
  const snapshot = path.join(dir, 'backup', 'park.json');
  ok((await call('export', snapshot))[0].records > 1000);
  await reject(['export', snapshot], /EEXIST|exist/);
  const weekly = await call('weekly-review');
  eq(Object.keys(weekly), ['attention', 'next twelve weeks', 'picked up this week', 'long-stay arrears', 'channels']);
  for (const name of Object.keys(reports)) ok(Array.isArray(await call(name)));
  ok((await call('activity')).some((r) => r.kind === 'bill-residents'), 'actions are audited');
  for (const cmd of ['help', 'availability', 'booking', 'guest', 'agreement', 'weekly-review', ...Object.keys(reports), ...actions]) ok(seen.has(cmd), `smoke exercised ${cmd}`);
  await db.close();
  db = null;

  // The CLI as a process: tables, --json, and exit 1 with candidates when a name is ambiguous.
  const json = cli('sites', '--json');
  eq(json.status, 0, json.stderr);
  eq(JSON.parse(json.stdout).length, 24);
  const amb = cli('booking', 'Kiri');
  eq(amb.status, 1);
  ok(amb.stderr.includes('Candidates:'));
  ok(cli('attention').stdout.includes('reason'));

  // Documents and views in the park's brand.
  for (const script of ['docs', 'view']) {
    const res = spawnSync(process.execPath, [`scripts/${script}.mjs`], { cwd: REPO_ROOT, env: process.env, encoding: 'utf8' });
    eq(res.status, 0, res.stderr);
  }
  ok(fs.readFileSync(path.join(dir, 'views', 'today.html'), 'utf8').includes('Riverbend Holiday Park (demo)'));
  ok(fs.readFileSync(path.join(dir, 'views', 'long-stays.html'), 'utf8').includes('Joan Mackie'));
  ok(fs.readFileSync(path.join(dir, 'views', 'performance.html'), 'utf8').includes('Casual occupancy'));
  const inv = fs.readdirSync(path.join(dir, 'docs-out', 'tax-invoice')).find((f) => f.startsWith('inv-1002'));
  const invoice = fs.readFileSync(path.join(dir, 'docs-out', 'tax-invoice', inv), 'utf8');
  ok(invoice.includes('GST number 123-456-789') && invoice.includes('Emma Clarke') && invoice.includes('128.00'), 'the invoice carries the GST number, the guest and the total');
  const statements = fs.readdirSync(path.join(dir, 'docs-out', 'site-account-statement'));
  eq(statements.length, 5, 'one statement for each active agreement');
  ok(fs.readFileSync(path.join(dir, 'docs-out', 'site-account-statement', statements.find((f) => f.startsWith('ls-101'))), 'utf8').includes('Bev Thompson'));
  ok(fs.readdirSync(path.join(dir, 'docs-out', 'arrival-card')).length >= 1);
  const register = fs.readFileSync(path.join(dir, 'docs-out', 'on-site-register', fs.readdirSync(path.join(dir, 'docs-out', 'on-site-register'))[0]), 'utf8');
  ok(register.includes('Ruth Adams') && register.includes('Joan Mackie'), 'casual guests and long-stay occupants on the register');
  ok(fs.readdirSync(path.join(dir, 'docs-out', 'cabin-cleaning-sheet')).length === 1);
  ok(fs.readdirSync(path.join(dir, 'docs-out', 'meter-sheet')).length === 1);

  const recipes = fs.readdirSync(path.join(REPO_ROOT, '.claude', 'commands')).filter((f) => f.endsWith('.md') && f !== 'README.md');
  console.log(`PASS: ${checks} checks; ${seen.size} CLI commands exercised; ${recipes.length} slash commands; documents and views rendered.`);
} finally {
  await db?.close();
  fs.rmSync(dir, { recursive: true, force: true });
}
