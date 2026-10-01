-- Holiday Park for Claude Code: sites and cabins, rates by the night and by the head, channels, guests,
-- casual bookings by the night, folios (charges and payments), tax invoices, outside calendar blocks,
-- cabin cleaning, long-stay agreements (permanent residents, annual vans, seasonal workers) with their
-- own accounts, power meter readings, and the views the office runs on every day.
-- Plain Postgres. Runs the same on hosted Postgres and embedded PGlite.

create table settings (
  id integer primary key default 1 check (id = 1),
  business_name text not null default 'Your park',
  timezone text not null default 'Pacific/Auckland',
  country text not null default 'NZ' check (country in ('NZ', 'AU')),
  state text not null default '' check (state in ('', 'NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT')),
  currency text not null default 'NZD' check (currency in ('NZD', 'AUD')),
  gst_rate numeric(5, 4) not null default 0.15 check (gst_rate >= 0 and gst_rate < 1),
  gst_number text not null default '',
  booking_prefix text not null default 'B-',
  invoice_prefix text not null default 'INV-',
  deposit_pct integer not null default 25 check (deposit_pct between 0 and 100),
  deposit_days integer not null default 7 check (deposit_days >= 0),
  long_stay_nights integer not null default 28 check (long_stay_nights > 0),
  au_long_stay_concession boolean not null default false,
  quiet_days integer not null default 3 check (quiet_days > 0),
  privacy_review_years integer not null default 7 check (privacy_review_years > 0),
  -- The camping-ground certificate of registration (NZ) or caravan park licence or registration (AU).
  registration_number text not null default '',
  registration_expires_on date,
  -- Tenancy-law thresholds, in days of continuous occupation. docs/compliance.md has the sources.
  nz_tenancy_days integer not null default 50 check (nz_tenancy_days > 0),
  vic_resident_days integer not null default 60 check (vic_resident_days > 0),
  power_cents_per_kwh numeric(8, 2) not null default 35 check (power_cents_per_kwh >= 0),
  meter_read_days integer not null default 35 check (meter_read_days > 0),
  check_in_time text not null default '14:00',
  check_out_time text not null default '10:00'
);
insert into settings (id) values (1);

-- The park's own calendar day, not the server's.
create function park_today() returns date language sql stable as $$
  select (now() at time zone coalesce((select timezone from settings where id = 1), 'Pacific/Auckland'))::date
$$;

-- A powered site, an unpowered tent site, an ensuite site, a cabin, a motel unit.
-- The base rate covers `included_guests`; each extra adult or child adds its own nightly charge.
create table site_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (trim(name) <> ''),
  code text not null default '',
  kind text not null default 'powered' check (kind in ('powered', 'unpowered', 'ensuite', 'cabin', 'unit')),
  base_rate_cents bigint not null default 0 check (base_rate_cents >= 0),
  included_guests integer not null default 2 check (included_guests >= 0),
  extra_adult_cents bigint not null default 0 check (extra_adult_cents >= 0),
  extra_child_cents bigint not null default 0 check (extra_child_cents >= 0),
  max_guests integer not null default 6 check (max_guests > 0),
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table sites (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (trim(name) <> ''),
  site_type_id uuid not null references site_types(id),
  area text not null default '',
  max_length_m numeric(4, 1),
  drive_through boolean not null default false,
  has_meter boolean not null default false,
  status text not null default 'clean' check (status in ('clean', 'dirty', 'inspected', 'out_of_order')),
  out_of_order_reason text not null default '',
  out_of_order_until date,
  active boolean not null default true,
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- A seasonal, holiday or event rate for a site type. The shortest plan covering a night wins; no plan means the base rate.
-- Extra adult and child charges stay as the site type sets them.
create table rate_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null check (trim(name) <> ''),
  site_type_id uuid not null references site_types(id),
  starts_on date not null,
  ends_on date not null,
  nightly_cents bigint not null check (nightly_cents >= 0),
  min_nights integer not null default 1 check (min_nights > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on >= starts_on)
);

create table channels (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (trim(name) <> ''),
  kind text not null default 'direct' check (kind in ('direct', 'ota', 'agent', 'walk-in', 'club')),
  commission_pct numeric(5, 2) not null default 0 check (commission_pct >= 0 and commission_pct < 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table guests (
  id uuid primary key default gen_random_uuid(),
  name text not null check (trim(name) <> ''),
  email text not null default '',
  phone text not null default '',
  address text not null default '',
  country text not null default '',
  company text not null default '',
  business_number text not null default '',
  member_number text not null default '',
  vip boolean not null default false,
  do_not_rebook boolean not null default false,
  marketing_ok boolean not null default false,
  notes text not null default '',
  external_id text unique,
  source_data jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index guests_email on guests (lower(email)) where email <> '';

-- A casual stay: a night or a few weeks on a site or in a cabin.
create table bookings (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique check (trim(ref) <> ''),
  guest_id uuid not null references guests(id),
  site_type_id uuid not null references site_types(id),
  site_id uuid references sites(id),
  channel_id uuid references channels(id),
  arrive_on date not null,
  depart_on date not null,
  adults integer not null default 2 check (adults >= 0),
  children integer not null default 0 check (children >= 0),
  status text not null default 'confirmed' check (status in ('enquiry', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show')),
  vehicle_rego text not null default '',
  van_length_m numeric(4, 1),
  long_stay_agreed boolean not null default false,
  deposit_cents bigint not null default 0 check (deposit_cents >= 0),
  deposit_due_on date,
  channel_ref text not null default '',
  eta text not null default '',
  requests text not null default '',
  booked_on date not null default park_today(),
  checked_in_at timestamptz,
  checked_out_at timestamptz,
  cancelled_on date,
  cancel_reason text not null default '',
  external_id text unique,
  source_data jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (depart_on > arrive_on)
);
create index bookings_dates on bookings (arrive_on, depart_on);

-- One row per night sold: the site rate plus the extra people that night. Occupancy and rate read from here.
create table booking_nights (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  night_on date not null,
  rate_cents bigint not null check (rate_cents >= 0),
  rate_plan text not null default '',
  created_at timestamptz not null default now(),
  unique (booking_id, night_on)
);
create index booking_nights_night on booking_nights (night_on);

create table charges (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id),
  posted_on date not null default park_today(),
  kind text not null default 'extra' check (kind in ('extra', 'linen', 'shop', 'laundry', 'gas', 'fee', 'cancellation', 'discount', 'other')),
  description text not null check (trim(description) <> ''),
  amount_cents bigint not null,
  gst_applies boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id),
  paid_on date not null default park_today(),
  kind text not null default 'payment' check (kind in ('deposit', 'payment', 'refund')),
  method text not null default 'card' check (method in ('card', 'eftpos', 'cash', 'bank', 'channel', 'voucher', 'other')),
  amount_cents bigint not null check (amount_cents <> 0),
  reference text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((kind = 'refund') = (amount_cents < 0))
);

create table invoices (
  id uuid primary key default gen_random_uuid(),
  number text not null unique,
  booking_id uuid not null unique references bookings(id),
  issued_on date not null default park_today(),
  total_cents bigint not null,
  gst_cents bigint not null,
  created_at timestamptz not null default now()
);

-- Nights a site or cabin is taken somewhere else: a Booking.com or Airbnb calendar (iCal), an event hold, works.
create table blocks (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id),
  starts_on date not null,
  ends_on date not null,
  source text not null default 'manual',
  uid text not null default '',
  summary text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on > starts_on)
);
create unique index blocks_feed_uid on blocks (site_id, source, uid) where uid <> '';

create table housekeeping (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id),
  done_on date not null default park_today(),
  kind text not null default 'clean' check (kind in ('clean', 'inspect', 'dirty', 'out_of_order', 'back_in_service')),
  done_by text not null default '',
  note text not null default '',
  created_at timestamptz not null default now()
);

-- A long-stay arrangement on one site: a permanent resident, an annual (long-term casual) van, a seasonal worker.
-- It holds the site from starts_on until it ends, and carries its own account (account_lines).
create table agreements (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique check (trim(ref) <> ''),
  guest_id uuid not null references guests(id),
  site_id uuid not null references sites(id),
  kind text not null check (kind in ('resident', 'annual', 'seasonal')),
  status text not null default 'active' check (status in ('active', 'ended')),
  starts_on date not null,
  ends_on date,
  fee_cents bigint not null check (fee_cents >= 0),
  fee_period text not null default 'week' check (fee_period in ('week', 'fortnight', 'month', 'year')),
  billed_to date not null,
  occupants integer not null default 1 check (occupants > 0),
  own_dwelling boolean not null default true,
  main_residence boolean not null default false,
  -- Which tenancy law the operator has decided covers it ('' until decided): tenancy, park, excluded.
  tenancy_law text not null default '' check (tenancy_law in ('', 'tenancy', 'park', 'excluded')),
  written_agreement boolean not null default false,
  signed_on date,
  disclosure_given_on date,
  rules_given_on date,
  bond_cents bigint not null default 0 check (bond_cents >= 0),
  power_billed_kwh numeric(10, 1),
  power_billed_on date,
  notice_given_on date,
  notice_reason text not null default '',
  vehicle_rego text not null default '',
  notes text not null default '',
  external_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on is null or ends_on >= starts_on)
);

-- The long-stay account: site fees, power and other charges in, payments out (as negative amounts).
create table account_lines (
  id uuid primary key default gen_random_uuid(),
  agreement_id uuid not null references agreements(id),
  posted_on date not null default park_today(),
  kind text not null check (kind in ('site_fee', 'power', 'water', 'other', 'payment', 'credit')),
  description text not null check (trim(description) <> ''),
  period_from date,
  period_to date,
  amount_cents bigint not null check (amount_cents <> 0),
  method text not null default '',
  reference text not null default '',
  created_at timestamptz not null default now(),
  check ((kind in ('payment', 'credit')) = (amount_cents < 0))
);

create table meter_readings (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id),
  read_on date not null default park_today(),
  kwh numeric(10, 1) not null check (kwh >= 0),
  read_by text not null default '',
  created_at timestamptz not null default now(),
  unique (site_id, read_on)
);

create table notes (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references bookings(id),
  guest_id uuid references guests(id),
  site_id uuid references sites(id),
  agreement_id uuid references agreements(id),
  note text not null check (trim(note) <> ''),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (num_nonnulls(booking_id, guest_id, site_id, agreement_id) >= 1)
);

create table audit (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  record_id uuid,
  detail jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table import_rows (
  entity text not null,
  source_id text not null,
  record_id uuid not null,
  raw jsonb not null,
  created_at timestamptz not null default now(),
  primary key (entity, source_id)
);

create function stamp() returns trigger language plpgsql as $$
begin if new.updated_at is not distinct from old.updated_at then new.updated_at = clock_timestamp(); end if; return new; end $$;

do $$ declare t text; begin
  foreach t in array array['site_types', 'sites', 'rate_plans', 'channels', 'guests', 'bookings', 'charges', 'payments', 'blocks', 'agreements', 'notes'] loop
    execute format('create trigger stamp before update on %I for each row execute function stamp()', t);
  end loop;
end $$;

-- ------------------------------------------------------------------ views

-- Bookings that hold a site: an enquiry does not, a cancellation or no-show no longer does.
create view v_live as
  select * from bookings where status in ('confirmed', 'checked_in', 'checked_out');

-- Agreements holding a site, with the last night they hold it (open-ended runs well into the future).
create view v_holding as
  select a.*, coalesce(case when a.status = 'ended' then coalesce(a.ends_on, a.billed_to) end, a.ends_on, date '9999-12-31') holds_to
  from agreements a;

-- Every booking with its folio: site nights, extras, payments, balance, and what the channel takes.
create view v_bookings as
  select b.id, b.ref, b.status, g.name guest, g.id guest_id, st.name site_type, st.kind site_kind, si.name site, si.area, c.name channel, c.kind channel_kind,
    b.arrive_on, b.depart_on, b.depart_on - b.arrive_on nights, b.adults, b.children, b.booked_on, b.arrive_on - b.booked_on lead_days,
    b.vehicle_rego, b.van_length_m, si.max_length_m, s.currency,
    case when b.status in ('confirmed', 'checked_in', 'checked_out') then coalesce(n.cents, 0) else 0 end accommodation_cents,
    coalesce(x.cents, 0) extras_cents,
    case when b.status in ('confirmed', 'checked_in', 'checked_out') then coalesce(n.cents, 0) else 0 end + coalesce(x.cents, 0) total_cents,
    coalesce(p.cents, 0) paid_cents,
    case when b.status in ('confirmed', 'checked_in', 'checked_out') then coalesce(n.cents, 0) else 0 end + coalesce(x.cents, 0) - coalesce(p.cents, 0) balance_cents,
    case when b.status in ('confirmed', 'checked_in', 'checked_out') then round(coalesce(n.cents, 0) * coalesce(c.commission_pct, 0) / 100.0)::bigint else 0 end commission_cents,
    b.deposit_cents, b.deposit_due_on, b.long_stay_agreed, b.site_id, b.site_type_id, b.channel_id, b.updated_at
  from bookings b
  join guests g on g.id = b.guest_id
  join site_types st on st.id = b.site_type_id
  left join sites si on si.id = b.site_id
  left join channels c on c.id = b.channel_id
  cross join settings s
  left join (select booking_id, sum(rate_cents) cents from booking_nights group by booking_id) n on n.booking_id = b.id
  left join (select booking_id, sum(amount_cents) cents from charges group by booking_id) x on x.booking_id = b.id
  left join (select booking_id, sum(amount_cents) cents from payments group by booking_id) p on p.booking_id = b.id;

-- GST inside each night's price. A camping ground is a commercial dwelling in New Zealand: from the 29th night
-- (or the first, when a long stay was agreed up front) GST is on 60% of the value for a stay over four weeks,
-- unless booked through an online marketplace. AU: when the operator elects the long-term concession, from the
-- 28th day GST is worked out on 50% of the GST-inclusive price. docs/compliance.md has the sources.
create view v_night_gst as
  select n.booking_id, n.night_on, n.rate_cents,
    row_number() over (partition by n.booking_id order by n.night_on) night_no,
    b.depart_on - b.arrive_on nights,
    case
      when s.country = 'NZ' and b.depart_on - b.arrive_on > s.long_stay_nights and coalesce(c.kind, 'direct') <> 'ota' then 'reduced'
      when s.country = 'AU' and s.au_long_stay_concession and b.depart_on - b.arrive_on >= s.long_stay_nights then 'concession'
      else 'standard' end regime,
    s.gst_rate, s.country, s.long_stay_nights, b.long_stay_agreed
  from booking_nights n join bookings b on b.id = n.booking_id left join channels c on c.id = b.channel_id cross join settings s;

create view v_booking_gst as
  select booking_id,
    sum(round(case
      when regime = 'reduced' and (long_stay_agreed or night_no > long_stay_nights) then rate_cents * (0.6 * gst_rate) / (1 + 0.6 * gst_rate)
      when regime = 'concession' and night_no >= long_stay_nights then rate_cents * (0.5 * gst_rate * (1 + gst_rate)) / (1 + 0.5 * gst_rate * (1 + gst_rate))
      else rate_cents * gst_rate / (1 + gst_rate) end))::bigint gst_cents,
    count(*) filter (where (regime = 'reduced' and (long_stay_agreed or night_no > long_stay_nights)) or (regime = 'concession' and night_no >= long_stay_nights)) reduced_nights
  from v_night_gst group by booking_id;

create view v_folio as
  select b.*, coalesce(g.gst_cents, 0) * (case when b.status in ('confirmed', 'checked_in', 'checked_out') then 1 else 0 end)
      + coalesce((select round(sum(x.amount_cents * s.gst_rate / (1 + s.gst_rate))) from charges x cross join settings s where x.booking_id = b.id and x.gst_applies), 0)::bigint gst_cents,
    coalesce(g.reduced_nights, 0) reduced_nights
  from v_bookings b left join v_booking_gst g on g.booking_id = b.id;

-- Each long-stay agreement with its account: what has been charged, paid, and how far behind it is.
create view v_agreements as
  select a.id, a.ref, a.kind, a.status, g.name guest, g.id guest_id, si.name site, si.id site_id, si.area, si.has_meter,
    a.starts_on, a.ends_on, park_today() - a.starts_on + 1 days_on_site, a.fee_cents, a.fee_period,
    round(a.fee_cents / case a.fee_period when 'week' then 7.0 when 'fortnight' then 14.0 when 'month' then 365.0 / 12 else 365.0 end, 2) fee_per_day_cents,
    a.billed_to, a.occupants, a.own_dwelling, a.main_residence, a.tenancy_law, a.written_agreement, a.signed_on, a.disclosure_given_on, a.rules_given_on,
    a.bond_cents, a.power_billed_kwh, a.power_billed_on, a.notice_given_on, a.notice_reason, s.currency,
    coalesce(l.charged, 0) charged_cents, -coalesce(l.paid, 0) paid_cents, coalesce(l.charged, 0) + coalesce(l.paid, 0) balance_cents,
    l.last_paid_on, a.updated_at
  from agreements a
  join guests g on g.id = a.guest_id
  join sites si on si.id = a.site_id
  cross join settings s
  left join (select agreement_id, sum(amount_cents) filter (where amount_cents > 0) charged, sum(amount_cents) filter (where amount_cents < 0) paid,
      max(posted_on) filter (where kind = 'payment') last_paid_on from account_lines group by agreement_id) l on l.agreement_id = a.id;

-- Long-stay accounts in arrears: the balance owing, and roughly how many days of fees that is.
create view v_arrears as
  select a.ref, a.kind, a.guest, a.site, a.currency, a.balance_cents, a.fee_cents, a.fee_period,
    ceil(a.balance_cents / nullif(a.fee_per_day_cents, 0))::int days_behind, a.last_paid_on, a.billed_to, a.status
  from v_agreements a where a.balance_cents > 0;

-- Every site tonight: the casual guest, the long-stay occupant, the arrival, and what cleaning a cabin needs.
create view v_site_status as
  select si.id site_id, si.name site, st.name site_type, st.kind site_kind, si.area, si.status, si.out_of_order_reason, si.out_of_order_until, si.sort,
    si.max_length_m, si.has_meter,
    ih.ref in_house_ref, ih.guest in_house, ih.depart_on departs,
    lt.ref agreement_ref, lt.guest long_stay, lt.kind long_stay_kind,
    ar.ref arriving_ref, ar.guest arriving, ar.eta,
    case
      when si.status = 'out_of_order' then 'out of order'
      when lt.ref is not null then 'long stay'
      when st.kind not in ('cabin', 'unit') then case when ih.ref is not null then 'occupied' when ar.ref is not null then 'arriving' else 'vacant' end
      when ih.depart_on = park_today() and ar.ref is not null then 'check-out, then clean for arrival'
      when ih.depart_on = park_today() then 'check-out clean'
      when ih.ref is not null then 'stayover tidy'
      when ar.ref is not null and si.status = 'dirty' then 'clean now: guest arriving'
      when ar.ref is not null then 'ready for arrival'
      when si.status = 'dirty' then 'clean when you can'
      else 'vacant' end job
  from sites si
  join site_types st on st.id = si.site_type_id
  left join lateral (select v.ref, v.guest, v.depart_on from v_bookings v where v.site_id = si.id and v.status = 'checked_in' order by v.arrive_on limit 1) ih on true
  left join lateral (select a.ref, g.name guest, a.kind from agreements a join guests g on g.id = a.guest_id where a.site_id = si.id and a.status = 'active' and a.starts_on <= park_today() and (a.ends_on is null or a.ends_on >= park_today()) limit 1) lt on true
  left join lateral (select v.ref, v.guest, b.eta from v_bookings v join bookings b on b.id = v.id where v.site_id = si.id and v.status = 'confirmed' and v.arrive_on = park_today() limit 1) ar on true
  where si.active;

-- Two things on one site on one night: two bookings, a booking and a long-stay agreement, or a booking and an outside calendar block.
create view v_conflicts as
  select si.name site, a.ref, b.ref clashes_with, 'booking' kind, greatest(a.arrive_on, b.arrive_on) from_on, least(a.depart_on, b.depart_on) to_on
  from v_live a join v_live b on a.site_id = b.site_id and a.id < b.id and a.arrive_on < b.depart_on and b.arrive_on < a.depart_on
  join sites si on si.id = a.site_id
  where a.status <> 'checked_out' or b.status <> 'checked_out'
  union all
  select si.name, a.ref, h.ref || ' (' || h.kind || ' agreement)', 'long stay', greatest(a.arrive_on, h.starts_on), least(a.depart_on, h.holds_to + 1)
  from v_live a join v_holding h on h.site_id = a.site_id and h.status = 'active' and a.arrive_on <= h.holds_to and h.starts_on < a.depart_on
  join sites si on si.id = a.site_id
  where a.status <> 'checked_out'
  union all
  select si.name, a.ref, coalesce(nullif(k.summary, ''), k.source) || ' (' || k.source || ')', 'calendar block', greatest(a.arrive_on, k.starts_on), least(a.depart_on, k.ends_on)
  from v_live a join blocks k on k.site_id = a.site_id and a.arrive_on < k.ends_on and k.starts_on < a.depart_on
  join sites si on si.id = a.site_id
  where a.status <> 'checked_out';

-- Site nights by month: what was there (every active site, every night), what casual guests took, what long stays held, and what it earned.
create view v_occupancy as
  with months as (
    select generate_series(date_trunc('month', park_today()) - interval '11 months', date_trunc('month', park_today()) + interval '2 months', interval '1 month')::date m
  ), nights as (
    select m.m, d::date night from months m cross join lateral generate_series(m.m, (m.m + interval '1 month' - interval '1 day')::date, interval '1 day') d
  ), avail as (
    select n.m, count(*) site_nights from nights n cross join (select id from sites where active) s group by n.m
  ), held as (
    select n.m, count(*) nights from nights n join v_holding h on n.night between h.starts_on and h.holds_to group by n.m
  ), sold as (
    select date_trunc('month', n.night_on)::date m, count(*) nights, sum(n.rate_cents) cents
    from booking_nights n join v_live b on b.id = n.booking_id group by 1
  )
  select to_char(a.m, 'YYYY-MM') as month, a.m >= date_trunc('month', park_today())::date on_books, a.site_nights,
    coalesce(s.nights, 0) casual_nights, coalesce(h.nights, 0) held_nights,
    round(100.0 * (coalesce(s.nights, 0) + coalesce(h.nights, 0)) / nullif(a.site_nights, 0), 1) occupancy_pct,
    round(100.0 * coalesce(s.nights, 0) / nullif(a.site_nights - coalesce(h.nights, 0), 0), 1) casual_occupancy_pct,
    coalesce(s.cents, 0) casual_revenue_cents,
    round(coalesce(s.cents, 0) / nullif(s.nights, 0))::bigint average_rate_cents
  from avail a left join sold s on s.m = a.m left join held h on h.m = a.m order by a.m;

-- Which channel earns what, once its commission is taken off. Twelve months of arrivals.
create view v_channel_mix as
  select coalesce(b.channel, 'No channel') channel, coalesce(b.channel_kind, '') kind,
    count(*) filter (where b.status in ('confirmed', 'checked_in', 'checked_out')) bookings,
    sum(b.nights) filter (where b.status in ('confirmed', 'checked_in', 'checked_out')) nights,
    sum(b.accommodation_cents) revenue_cents, sum(b.commission_cents) commission_cents,
    sum(b.accommodation_cents) - sum(b.commission_cents) net_cents,
    round(avg(b.lead_days) filter (where b.status in ('confirmed', 'checked_in', 'checked_out')), 1) avg_lead_days,
    count(*) filter (where b.status = 'cancelled') cancelled, count(*) filter (where b.status = 'no_show') no_shows
  from v_bookings b
  where b.arrive_on > park_today() - 365 and b.status <> 'enquiry'
  group by 1, 2;

-- Power meters on long-stay sites: the last reading, the last one billed, and whether a reading is due.
create view v_meters as
  select a.ref, a.guest, a.site, a.site_id, m.read_on last_read_on, m.kwh last_kwh, a.power_billed_on, a.power_billed_kwh,
    greatest(coalesce(m.kwh, 0) - coalesce(a.power_billed_kwh, m.kwh, 0), 0) unbilled_kwh,
    round(greatest(coalesce(m.kwh, 0) - coalesce(a.power_billed_kwh, m.kwh, 0), 0) * s.power_cents_per_kwh)::bigint unbilled_cents,
    case when m.read_on is null then 'never read' when m.read_on <= park_today() - s.meter_read_days then 'reading overdue' else 'ok' end state, s.currency
  from v_agreements a cross join settings s
  left join lateral (select read_on, kwh from meter_readings r where r.site_id = a.site_id order by read_on desc limit 1) m on true
  where a.status = 'active' and a.has_meter;

create view v_attention as
  select v.ref, v.guest, 'arriving with no site' reason, 'arrives ' || v.arrive_on || ', ' || v.site_type detail
  from v_bookings v where v.status = 'confirmed' and v.site_id is null and v.arrive_on <= park_today() + 1
  union all
  select c.ref, c.site, 'double booked', c.clashes_with || ', ' || c.from_on || ' to ' || c.to_on from v_conflicts c
  union all
  select v.ref, v.guest, 'van too long for the site', v.van_length_m || ' m van on ' || v.site || ' (takes ' || v.max_length_m || ' m), arrives ' || v.arrive_on
  from v_bookings v where v.status in ('confirmed', 'checked_in') and v.van_length_m > v.max_length_m and v.depart_on > park_today()
  union all
  select v.ref, v.guest, 'no-show?', 'due ' || v.arrive_on || ', not checked in' from v_bookings v where v.status = 'confirmed' and v.arrive_on < park_today()
  union all
  select v.ref, v.guest, 'overstay', 'was due out ' || v.depart_on from v_bookings v where v.status = 'checked_in' and v.depart_on < park_today()
  union all
  select v.ref, v.guest, 'balance owing at departure', v.currency || ' ' || round(v.balance_cents / 100.0, 2) || ' owing, departs ' || v.depart_on
  from v_bookings v where v.status = 'checked_in' and v.depart_on <= park_today() and v.balance_cents > 0
  union all
  select v.ref, v.guest, 'departed owing', v.currency || ' ' || round(v.balance_cents / 100.0, 2) || ' owing since ' || v.depart_on
  from v_bookings v where v.status in ('checked_out', 'cancelled', 'no_show') and v.balance_cents > 0
  union all
  select v.ref, v.guest, 'deposit overdue', v.currency || ' ' || round((v.deposit_cents - greatest(v.paid_cents, 0)) / 100.0, 2) || ' was due ' || v.deposit_due_on
  from v_bookings v where v.status = 'confirmed' and v.deposit_due_on < park_today() and v.paid_cents < v.deposit_cents
  union all
  select v.ref, v.guest, 'no tax invoice', 'checked out ' || v.depart_on from v_bookings v
  where v.status = 'checked_out' and not exists (select 1 from invoices i where i.booking_id = v.id)
  union all
  select v.ref, v.guest, 'enquiry gone quiet', 'no reply for ' || (park_today() - v.updated_at::date) || ' days'
  from v_bookings v cross join settings s where v.status = 'enquiry' and v.updated_at::date <= park_today() - s.quiet_days
  union all
  select r.arriving_ref, r.site, 'cabin not ready', r.arriving || ' arriving today, cabin is ' || r.status
  from v_site_status r where r.arriving_ref is not null and r.status in ('dirty', 'out_of_order')
  union all
  select r.name, '', 'out of order past its date', r.out_of_order_reason || ', was due back ' || r.out_of_order_until
  from sites r where r.active and r.status = 'out_of_order' and r.out_of_order_until < park_today()
  union all
  select a.ref, a.guest, 'long stay in arrears', a.currency || ' ' || round(a.balance_cents / 100.0, 2) || ', about ' || a.days_behind || ' days of fees'
  from v_arrears a where a.status = 'active' and a.days_behind > 7
  union all
  select a.ref, a.guest, 'site fees not billed', 'billed to ' || a.billed_to || ': run bill-residents'
  from v_agreements a where a.status = 'active' and a.billed_to <= park_today() and (a.ends_on is null or a.billed_to <= a.ends_on)
  union all
  select m.ref, m.guest, 'meter reading due', m.site || ': ' || m.state || coalesce(', last read ' || m.last_read_on, '') from v_meters m where m.state <> 'ok'
  union all
  select a.ref, a.guest, 'agreement ending', 'ends ' || a.ends_on || ' on ' || a.site from v_agreements a
  where a.status = 'active' and a.ends_on between park_today() and park_today() + 30
  union all
  select a.ref, a.guest, 'notice period running', 'notice given ' || a.notice_given_on || ': ' || a.notice_reason from v_agreements a
  where a.status = 'active' and a.notice_given_on is not null;

-- Record checks. Each rule and its source is in docs/compliance.md.
create view v_compliance as
  select 'PARK-REGISTRATION' rule, s.registration_number ref, '' guest,
    case when s.registration_expires_on is null then 'No registration or licence expiry date in settings: record it so renewal is never missed'
         when s.registration_expires_on < park_today() then 'Registration expired ' || s.registration_expires_on || ': renew with the council before taking more guests'
         else 'Registration expires ' || s.registration_expires_on || ': apply to renew now' end finding
  from settings s where s.registration_expires_on is null or s.registration_expires_on <= park_today() + 45
  union all
  select 'NZ-TENANCY-50-DAYS', a.ref, a.guest, a.days_on_site || ' days on ' || a.site || ' (' || a.kind || case when a.own_dwelling then ', own dwelling' else ', park-owned dwelling' end ||
    '): the tenancy law exclusion for camping grounds covers stays up to ' || s.nz_tenancy_days || ' days. Decide which law covers it and record it (tenancy, park or excluded)'
  from v_agreements a cross join settings s
  where s.country = 'NZ' and a.status = 'active' and a.tenancy_law = '' and (a.days_on_site > s.nz_tenancy_days or a.kind = 'resident')
  union all
  select 'NZ-TENANCY-50-DAYS', v.ref, v.guest, v.nights || ' nights in ' || coalesce(v.site, v.site_type) || ': a casual stay past ' || s.nz_tenancy_days || ' days. Move it to a long-stay agreement and record which law covers it'
  from v_bookings v cross join settings s
  where s.country = 'NZ' and v.status in ('confirmed', 'checked_in') and v.nights > s.nz_tenancy_days
  union all
  select 'VIC-RESIDENT-60-DAYS', a.ref, a.guest, a.days_on_site || ' days, main residence: a resident under the Residential Tenancies Act. ' ||
    concat_ws(', ', case when a.disclosure_given_on is null then 'no disclosure statement recorded' end, case when a.rules_given_on is null then 'no park rules given recorded' end)
  from v_agreements a cross join settings s
  where s.country = 'AU' and s.state = 'VIC' and a.status = 'active' and a.main_residence and a.days_on_site >= s.vic_resident_days and (a.disclosure_given_on is null or a.rules_given_on is null)
  union all
  select 'NSW-OCCUPATION-AGREEMENT', a.ref, a.guest, 'Long-term casual occupation on ' || a.site || ': ' ||
    concat_ws(', ', case when not a.written_agreement then 'no written occupation agreement' end, case when a.disclosure_given_on is null then 'no disclosure statement recorded' end,
      case when a.rules_given_on is null then 'no park rules given recorded' end, case when a.rules_given_on > a.signed_on then 'park rules given after signing' end)
  from v_agreements a cross join settings s
  where s.country = 'AU' and s.state = 'NSW' and a.status = 'active' and a.kind = 'annual'
    and (not a.written_agreement or a.disclosure_given_on is null or a.rules_given_on is null or a.rules_given_on > a.signed_on)
  union all
  select 'WRITTEN-AGREEMENT', a.ref, a.guest, a.kind || ' on ' || a.site || ' since ' || a.starts_on || ' with no signed agreement on file'
  from v_agreements a where a.status = 'active' and (not a.written_agreement or a.signed_on is null)
  union all
  select 'NZ-LONG-STAY-GST', v.ref, v.guest, v.nights || ' nights through ' || coalesce(v.channel, 'no channel') || ': ' ||
    case when v.channel_kind = 'ota' then 'booked through an online marketplace, so the reduced value does not apply. Check with your accountant'
         when v.long_stay_agreed then 'agreed up front as a long stay: GST on 60% of the value from the first night'
         else 'GST on 60% of the value from night ' || (s.long_stay_nights + 1) || '. If it was agreed up front, record it and the reduced value runs from night 1' end
  from v_bookings v cross join settings s
  where s.country = 'NZ' and v.status in ('confirmed', 'checked_in', 'checked_out') and v.nights > s.long_stay_nights and v.depart_on > park_today() - 90
  union all
  select 'AU-LONG-STAY-GST', v.ref, v.guest, v.nights || ' nights: ' ||
    case when s.au_long_stay_concession then 'concession applied from day ' || s.long_stay_nights else 'full GST charged. The long-term concession is off in settings; decide with your accountant' end
  from v_bookings v cross join settings s
  where s.country = 'AU' and v.status in ('confirmed', 'checked_in', 'checked_out') and v.nights >= s.long_stay_nights and v.depart_on > park_today() - 90
  union all
  select 'GST-NUMBER', '', '', 'Invoices are being issued with no ' || case when s.country = 'NZ' then 'GST number' else 'ABN' end || ' in settings'
  from settings s where s.gst_number = '' and exists (select 1 from invoices)
  union all
  select case when s.country = 'NZ' then 'NZ-INVOICE-OVER-1000' else 'AU-INVOICE-1000-PLUS' end, v.ref, v.guest,
    i.number || ' for ' || s.currency || ' ' || round(i.total_cents / 100.0, 2) || ' has ' ||
    case when s.country = 'NZ' then 'the guest name but no address, phone, email or business number on the guest record'
         else 'no buyer identity or ABN on the guest record' end
  from invoices i join v_bookings v on v.id = i.booking_id join guests g on g.id = v.guest_id cross join settings s
  where ((s.country = 'NZ' and i.total_cents > 100000 and g.address = '' and g.phone = '' and g.email = '' and g.business_number = '')
      or (s.country = 'AU' and i.total_cents >= 100000 and g.business_number = '' and g.company = '' and g.address = ''))
  union all
  select 'PRIVACY-RETENTION', '', g.name, 'Last stay ended ' || coalesce(max(b.depart_on)::text, 'never') || ', over ' || s.privacy_review_years || ' years ago: review whether to keep, anonymise or delete'
  from guests g left join bookings b on b.guest_id = g.id cross join settings s
  where not exists (select 1 from agreements a where a.guest_id = g.id and a.status = 'active')
  group by g.id, g.name, s.privacy_review_years
  having coalesce(max(b.depart_on), min(g.created_at)::date) < park_today() - (s.privacy_review_years * 365)
  union all
  select 'CARD-DATA', '', g.name, 'A card number may be written in the guest notes: remove it'
  from guests g where g.notes ~ '[0-9]{4}[ -]?[0-9]{4}[ -]?[0-9]{4}[ -]?[0-9]{1,4}'
  union all
  select 'DOUBLE-BOOKING', c.ref, c.site, 'Also ' || c.clashes_with || ' (' || c.kind || '), ' || c.from_on || ' to ' || c.to_on from v_conflicts c;
