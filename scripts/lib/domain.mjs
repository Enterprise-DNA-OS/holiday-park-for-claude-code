// The park's records in one place: which tables a command may write, how names resolve,
// and every read report as one query over the views in supabase/migrations.

// entity -> [table, label column, fields that add/set may write]
export const entities = {
  'site-type': ['site_types', 'name', ['name', 'code', 'kind', 'base_rate', 'included_guests', 'extra_adult', 'extra_child', 'max_guests', 'description']],
  site: ['sites', 'name', ['name', 'site_type', 'area', 'max_length_m', 'drive_through', 'has_meter', 'sort', 'active']],
  rate: ['rate_plans', 'name', ['name', 'site_type', 'starts_on', 'ends_on', 'nightly', 'min_nights']],
  channel: ['channels', 'name', ['name', 'kind', 'commission_pct']],
  guest: ['guests', 'name', ['name', 'email', 'phone', 'address', 'country', 'company', 'business_number', 'member_number', 'vip', 'do_not_rebook', 'marketing_ok', 'notes']],
  booking: ['bookings', 'ref', ['adults', 'children', 'channel', 'channel_ref', 'eta', 'requests', 'vehicle_rego', 'van_length_m', 'deposit', 'deposit_due_on', 'long_stay_agreed']],
  agreement: ['agreements', 'ref', ['fee', 'fee_period', 'ends_on', 'occupants', 'own_dwelling', 'main_residence', 'tenancy_law', 'written_agreement', 'signed_on',
    'disclosure_given_on', 'rules_given_on', 'bond', 'vehicle_rego', 'notes']],
  setting: ['settings', 'business_name', ['business_name', 'timezone', 'country', 'state', 'currency', 'gst_rate', 'gst_number', 'booking_prefix', 'invoice_prefix',
    'deposit_pct', 'deposit_days', 'long_stay_nights', 'au_long_stay_concession', 'quiet_days', 'privacy_review_years', 'registration_number', 'registration_expires_on',
    'nz_tenancy_days', 'vic_resident_days', 'power_cents_per_kwh', 'meter_read_days', 'check_in_time', 'check_out_time']],
};

// flag -> [column, entity it points at]
export const refs = { site_type: ['site_type_id', 'site-type'], channel: ['channel_id', 'channel'], site: ['site_id', 'site'] };
// flag -> column, amount entered in dollars and stored in cents
export const money = { base_rate: 'base_rate_cents', extra_adult: 'extra_adult_cents', extra_child: 'extra_child_cents', nightly: 'nightly_cents', deposit: 'deposit_cents', fee: 'fee_cents', bond: 'bond_cents' };

// Match an exact id or name first, then a partial id or a name fragment. Ambiguous lists the candidates.
export async function resolve(db, entity, value) {
  const def = entities[entity];
  if (!def) throw Error(`Unknown record type ${entity}. Use ${Object.keys(entities).join(', ')}`);
  if (entity === 'booking') return resolveBooking(db, value);
  if (entity === 'agreement') return resolveAgreement(db, value);
  const [table, label] = def;
  const s = String(value ?? '').trim();
  if (!s) throw Error(`Name or id of the ${entity} is required`);
  let rows = await db.query(`select * from ${table} where id::text = $1 or lower(${label}) = lower($1)`, [s]);
  if (!rows.length) rows = await db.query(`select * from ${table} where starts_with(id::text, lower($1)) or strpos(lower(${label}), lower($1)) > 0 order by ${label}, id`, [s]);
  if (rows.length === 1) return rows[0];
  if (!rows.length) throw Error(`No ${entity} matches "${s}"`);
  throw Error(`Ambiguous ${entity} "${s}". Candidates:\n${rows.map((r) => `  ${r.id.slice(0, 8)}  ${r[label]}`).join('\n')}`);
}

// A booking by its ref, part of its ref, or the guest's name. Among several, the one still open wins.
export async function resolveBooking(db, value) {
  const s = String(value ?? '').trim();
  if (!s) throw Error('Booking ref or guest name is required');
  let rows = await db.query('select b.*, g.name guest from bookings b join guests g on g.id = b.guest_id where lower(b.ref) = lower($1) or b.id::text = $1', [s]);
  if (!rows.length) {
    rows = await db.query(`select b.*, g.name guest from bookings b join guests g on g.id = b.guest_id
      where strpos(lower(b.ref), lower($1)) > 0 or strpos(lower(g.name), lower($1)) > 0 or starts_with(b.id::text, lower($1)) order by b.arrive_on desc`, [s]);
    const open = rows.filter((r) => ['enquiry', 'confirmed', 'checked_in'].includes(r.status));
    if (rows.length > 1 && open.length === 1) rows = open;
  }
  if (rows.length === 1) return rows[0];
  if (!rows.length) throw Error(`No booking matches "${s}"`);
  throw Error(`Ambiguous booking "${s}". Candidates:\n${rows.slice(0, 12).map((r) => `  ${r.ref}  ${r.guest}  ${r.arrive_on} to ${r.depart_on}  ${r.status}`).join('\n')}`);
}

// A long-stay agreement by its ref, the occupant's name, or the site. Among several, the active one wins.
export async function resolveAgreement(db, value) {
  const s = String(value ?? '').trim();
  if (!s) throw Error('Agreement ref, occupant name or site is required');
  const base = 'select a.*, g.name guest, si.name site from agreements a join guests g on g.id = a.guest_id join sites si on si.id = a.site_id';
  let rows = await db.query(`${base} where lower(a.ref) = lower($1) or a.id::text = $1`, [s]);
  if (!rows.length) rows = await db.query(`${base} where lower(si.name) = lower($1) and a.status = 'active'`, [s]);
  if (!rows.length) {
    rows = await db.query(`${base} where strpos(lower(a.ref), lower($1)) > 0 or strpos(lower(g.name), lower($1)) > 0 or starts_with(a.id::text, lower($1)) order by a.starts_on desc`, [s]);
    const open = rows.filter((r) => r.status === 'active');
    if (rows.length > 1 && open.length === 1) rows = open;
  }
  if (rows.length === 1) return rows[0];
  if (!rows.length) throw Error(`No agreement matches "${s}"`);
  throw Error(`Ambiguous agreement "${s}". Candidates:\n${rows.slice(0, 12).map((r) => `  ${r.ref}  ${r.guest}  ${r.site}  ${r.kind}  ${r.status}`).join('\n')}`);
}

const dollars = (c) => `round(${c} / 100.0, 2)`;
const LIVE = "('confirmed', 'checked_in', 'checked_out')";
const JOB_ORDER = `case when job like 'clean now%' then 0 when job like 'check-out%' then 1 when job = 'stayover tidy' then 2 when job = 'clean when you can' then 3 else 4 end`;

export const reports = {
  sites: `select s.name site, t.name site_type, t.kind, s.area, s.max_length_m, s.drive_through, s.has_meter, s.status, s.out_of_order_reason, s.active
    from sites s join site_types t on t.id = s.site_type_id order by s.sort, s.name`,
  'site-types': `select t.name, t.code, t.kind, s.currency, ${dollars('t.base_rate_cents')} base_rate, t.included_guests, ${dollars('t.extra_adult_cents')} extra_adult,
    ${dollars('t.extra_child_cents')} extra_child, t.max_guests, (select count(*) from sites x where x.site_type_id = t.id and x.active) sites, t.description
    from site_types t cross join settings s order by t.base_rate_cents`,
  rates: `select p.name, t.name site_type, p.starts_on, p.ends_on, s.currency, ${dollars('p.nightly_cents')} nightly, p.min_nights,
    ${dollars('t.base_rate_cents')} base_rate from rate_plans p join site_types t on t.id = p.site_type_id cross join settings s
    where p.ends_on >= park_today() - 30 order by p.starts_on, t.base_rate_cents`,
  channels: `select name, kind, commission_pct from channels order by kind, name`,
  guests: `select g.name, g.email, g.phone, g.country, g.member_number, g.vip, g.do_not_rebook,
    (select count(*) from bookings b where b.guest_id = g.id and b.status in ('checked_in', 'checked_out')) stays,
    (select max(b.depart_on) from bookings b where b.guest_id = g.id and b.status in ('checked_in', 'checked_out')) last_stay
    from guests g order by last_stay desc nulls last, g.name limit 60`,
  arrivals: `select case when v.arrive_on = park_today() then 'today' else 'tomorrow' end as day, v.ref, v.guest, v.site_type, coalesce(v.site, 'not assigned') site,
    v.nights, v.adults, v.children, v.vehicle_rego rego, v.van_length_m van_m, b.eta, v.channel, v.currency, ${dollars('v.balance_cents')} balance, b.requests
    from v_bookings v join bookings b on b.id = v.id where v.status = 'confirmed' and v.arrive_on between park_today() and park_today() + 1
    order by v.arrive_on, v.site nulls first`,
  departures: `select v.ref, v.guest, v.site, v.nights, v.currency, ${dollars('v.total_cents')} total, ${dollars('v.paid_cents')} paid, ${dollars('v.balance_cents')} balance
    from v_bookings v where v.status = 'checked_in' and v.depart_on <= park_today() order by v.site`,
  'in-house': `select v.site, v.ref, v.guest, v.adults, v.children, v.vehicle_rego rego, v.arrive_on, v.depart_on, v.depart_on - park_today() nights_left, v.currency, ${dollars('v.balance_cents')} balance
    from v_bookings v where v.status = 'checked_in' order by v.site`,
  'site-board': `select site, site_type, area, case when job in ('occupied', 'long stay', 'stayover tidy') or in_house is not null then 'taken' when job = 'out of order' then 'out of order' when arriving is not null then 'arriving' else 'free' end tonight,
    coalesce(in_house, long_stay, '') who, coalesce(in_house_ref, agreement_ref, '') ref, departs, arriving, eta
    from v_site_status order by sort`,
  bookings: `select v.ref, v.status, v.guest, v.site_type, v.site, v.arrive_on, v.nights, v.channel, v.currency, ${dollars('v.total_cents')} total, ${dollars('v.balance_cents')} balance
    from v_bookings v where v.status in ('enquiry', 'confirmed', 'checked_in') and v.arrive_on <= park_today() + 60 order by v.arrive_on, v.ref`,
  housekeeping: `select site, site_type, status, job, in_house, departs, arriving, eta from v_site_status where site_kind in ('cabin', 'unit') order by ${JOB_ORDER}, sort`,
  attention: `select reason, ref, guest, detail from v_attention order by reason, ref`,
  compliance: `select rule, ref, guest, finding from v_compliance order by rule, ref`,
  agreements: `select a.ref, a.kind, a.guest, a.site, a.starts_on, a.ends_on, a.days_on_site, a.currency, ${dollars('a.fee_cents')} fee, a.fee_period, a.billed_to,
    ${dollars('a.balance_cents')} balance, case when a.written_agreement and a.signed_on is not null then 'signed ' || a.signed_on else 'not signed' end paperwork,
    coalesce(nullif(a.tenancy_law, ''), 'not decided') law from v_agreements a where a.status = 'active' order by a.site`,
  arrears: `select ref, kind, guest, site, currency, ${dollars('balance_cents')} owing, ${dollars('fee_cents')} fee, fee_period, days_behind, last_paid_on, billed_to
    from v_arrears where status = 'active' or balance_cents > 0 order by days_behind desc nulls last`,
  meters: `select ref, guest, site, last_read_on, last_kwh, power_billed_on, power_billed_kwh, unbilled_kwh, currency, ${dollars('unbilled_cents')} unbilled, state
    from v_meters order by state <> 'ok' desc, site`,
  occupancy: `select month, on_books, site_nights, casual_nights, held_nights long_stay_nights, occupancy_pct, casual_occupancy_pct, s.currency, ${dollars('casual_revenue_cents')} casual_revenue,
    ${dollars('average_rate_cents')} average_rate from v_occupancy cross join settings s where casual_nights > 0 or on_books order by month`,
  'channel-mix': `select channel, kind, bookings, nights, s.currency, ${dollars('revenue_cents')} revenue, ${dollars('commission_cents')} commission, ${dollars('net_cents')} net,
    round(100.0 * net_cents / nullif(sum(net_cents) over (), 0), 1) share_of_net_pct, avg_lead_days, cancelled, no_shows
    from v_channel_mix cross join settings s order by net_cents desc`,
  balances: `select v.ref, v.status, v.guest, v.depart_on, v.currency, ${dollars('v.total_cents')} total, ${dollars('v.paid_cents')} paid, ${dollars('v.balance_cents')} balance
    from v_bookings v where v.status <> 'enquiry' and v.balance_cents <> 0 and (v.status <> 'confirmed' or v.balance_cents < 0)
    order by v.status = 'checked_in', v.depart_on`,
  deposits: `select v.ref, v.guest, v.arrive_on, v.deposit_due_on, v.currency, ${dollars('v.deposit_cents')} deposit, ${dollars('greatest(v.paid_cents, 0)')} paid,
    case when v.paid_cents >= v.deposit_cents then 'paid' when v.deposit_due_on < park_today() then 'overdue' else 'due' end state
    from v_bookings v where v.status = 'confirmed' and v.deposit_cents > 0 order by v.paid_cents >= v.deposit_cents, v.deposit_due_on`,
  conflicts: `select site, ref, clashes_with, kind, from_on, to_on from v_conflicts order by from_on`,
  pickup: `select to_char(v.arrive_on, 'YYYY-MM') arrival_month, count(*) filter (where v.status in ${LIVE}) new_bookings,
    sum(v.nights) filter (where v.status in ${LIVE}) nights, v.currency, ${dollars(`sum(v.accommodation_cents)`)} revenue,
    count(*) filter (where v.status = 'cancelled' and b.cancelled_on > park_today() - 7) cancelled_this_week
    from v_bookings v join bookings b on b.id = v.id where (v.booked_on > park_today() - 7 or b.cancelled_on > park_today() - 7) and v.status <> 'enquiry'
    group by 1, v.currency order by 1`,
  forecast: `select w::date week_of, t.name site_type, t.sites * 7 site_nights, count(n.id) nights_on_books,
    round(100.0 * count(n.id) / nullif(t.sites * 7, 0), 1) occupancy_pct, s.currency, ${dollars('coalesce(sum(n.rate_cents), 0)')} revenue_on_books
    from generate_series(date_trunc('week', park_today()), date_trunc('week', park_today()) + interval '11 weeks', interval '1 week') w
    cross join (select st.id, st.name, st.base_rate_cents, (select count(*) from sites x where x.site_type_id = st.id and x.active
      and not exists (select 1 from agreements a where a.site_id = x.id and a.status = 'active')) sites from site_types st) t
    cross join settings s
    left join (select n.*, b.site_type_id from booking_nights n join v_live b on b.id = n.booking_id) n on n.site_type_id = t.id and n.night_on >= w::date and n.night_on < w::date + 7
    where t.sites > 0 group by w, t.name, t.base_rate_cents, t.sites, s.currency order by w, t.base_rate_cents`,
  'repeat-guests': `select g.name guest, count(*) stays, sum(v.nights) nights, v.currency, ${dollars('sum(v.total_cents)')} spent, max(v.depart_on) last_stay,
    count(*) filter (where v.channel_kind in ('direct', 'walk-in', 'club')) direct_stays, string_agg(distinct v.channel, ', ') channels, g.email
    from v_bookings v join guests g on g.id = v.guest_id where v.status in ('checked_in', 'checked_out')
    group by g.id, g.name, g.email, v.currency having count(*) > 1 order by stays desc, spent desc`,
  cancellations: `select v.ref, v.guest, v.status, v.channel, v.arrive_on, b.cancelled_on, b.cancel_reason, v.currency, ${dollars('v.extras_cents')} fee_charged, ${dollars('v.balance_cents')} balance
    from v_bookings v join bookings b on b.id = v.id where v.status in ('cancelled', 'no_show') and v.arrive_on > park_today() - 90 order by v.arrive_on desc`,
  invoices: `select i.number, i.issued_on, v.ref, v.guest, v.currency, ${dollars('i.total_cents')} total, ${dollars('i.gst_cents')} gst
    from invoices i join v_bookings v on v.id = i.booking_id order by i.issued_on desc, i.number desc limit 30`,
  blocks: `select si.name site, k.starts_on, k.ends_on, k.source, k.summary from blocks k join sites si on si.id = k.site_id where k.ends_on >= park_today() order by k.starts_on, si.name`,
  activity: `select * from (select coalesce(b.ref, a.ref, g.name, si.name) about, 'note' kind, n.note detail, n.created_at at_time from notes n
      left join bookings b on b.id = n.booking_id left join agreements a on a.id = n.agreement_id left join guests g on g.id = n.guest_id left join sites si on si.id = n.site_id
    union all select '', x.action, left(x.detail::text, 90), x.created_at from audit x) y order by at_time desc limit 30`,
};
