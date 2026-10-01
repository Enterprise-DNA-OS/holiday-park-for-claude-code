-- Demo park: Riverbend Holiday Park, a fictional holiday park beside the Motueka River with powered and
-- tent sites, ensuite sites, cabins, two self-contained units and a long-stay lane of four permanent and
-- annual sites. Dates are relative to today, so there is always someone arriving, someone owing, a cabin not
-- ready, a van too long for its site, a double booking and a long-stay account behind. About six months of
-- past stays give the occupancy and channel reports something to say. Safe to run twice.

update settings set business_name = 'Riverbend Holiday Park (demo)', gst_number = '123-456-789', booking_prefix = 'H-',
  registration_number = 'CG-0417', registration_expires_on = park_today() + 20
where id = 1 and business_name = 'Your park';

insert into site_types (id, name, code, kind, base_rate_cents, included_guests, extra_adult_cents, extra_child_cents, max_guests, description) values
 ('11111111-0000-4000-8000-000000000001', 'Powered site', 'PWR', 'powered', 5400, 2, 2000, 1200, 6, '10 amp power, grass or gravel pad, for caravans, campervans and motorhomes'),
 ('11111111-0000-4000-8000-000000000002', 'Tent site', 'TNT', 'unpowered', 4000, 2, 1800, 1000, 6, 'Unpowered grass site in the tent paddock'),
 ('11111111-0000-4000-8000-000000000003', 'Ensuite site', 'ENS', 'ensuite', 7500, 2, 2200, 1400, 6, 'Powered site with its own toilet and shower'),
 ('11111111-0000-4000-8000-000000000004', 'Standard cabin', 'CAB', 'cabin', 9500, 2, 2500, 1500, 4, 'Double and bunks, use of the kitchen and amenities block, linen for hire'),
 ('11111111-0000-4000-8000-000000000005', 'Self-contained unit', 'UNT', 'unit', 16500, 2, 3000, 1800, 5, 'Queen and two singles, kitchen, bathroom, deck')
on conflict do nothing;

insert into sites (id, name, site_type_id, area, max_length_m, drive_through, has_meter, status, sort, out_of_order_reason, out_of_order_until) values
 ('22222222-0000-4000-8000-000000000001', 'P1', '11111111-0000-4000-8000-000000000001', 'Riverside', 8.5, false, false, 'clean', 1, '', null),
 ('22222222-0000-4000-8000-000000000002', 'P2', '11111111-0000-4000-8000-000000000001', 'Riverside', 8.0, false, false, 'clean', 2, '', null),
 ('22222222-0000-4000-8000-000000000003', 'P3', '11111111-0000-4000-8000-000000000001', 'Riverside', 10.0, false, false, 'clean', 3, '', null),
 ('22222222-0000-4000-8000-000000000004', 'P4', '11111111-0000-4000-8000-000000000001', 'Riverside', 12.0, true, false, 'clean', 4, '', null),
 ('22222222-0000-4000-8000-000000000005', 'P5', '11111111-0000-4000-8000-000000000001', 'Riverside', 12.0, true, false, 'clean', 5, '', null),
 ('22222222-0000-4000-8000-000000000006', 'P6', '11111111-0000-4000-8000-000000000001', 'Orchard', 9.0, false, false, 'clean', 6, '', null),
 ('22222222-0000-4000-8000-000000000007', 'P7', '11111111-0000-4000-8000-000000000001', 'Orchard', 9.0, false, false, 'clean', 7, '', null),
 ('22222222-0000-4000-8000-000000000008', 'P8', '11111111-0000-4000-8000-000000000001', 'Orchard', 10.0, false, false, 'clean', 8, '', null),
 ('22222222-0000-4000-8000-000000000009', 'T1', '11111111-0000-4000-8000-000000000002', 'Tent paddock', null, false, false, 'clean', 9, '', null),
 ('22222222-0000-4000-8000-000000000010', 'T2', '11111111-0000-4000-8000-000000000002', 'Tent paddock', null, false, false, 'clean', 10, '', null),
 ('22222222-0000-4000-8000-000000000011', 'T3', '11111111-0000-4000-8000-000000000002', 'Tent paddock', null, false, false, 'clean', 11, '', null),
 ('22222222-0000-4000-8000-000000000012', 'E1', '11111111-0000-4000-8000-000000000003', 'Riverside', 10.0, false, false, 'clean', 12, '', null),
 ('22222222-0000-4000-8000-000000000013', 'E2', '11111111-0000-4000-8000-000000000003', 'Riverside', 10.0, false, false, 'clean', 13, '', null),
 ('22222222-0000-4000-8000-000000000014', 'Cabin 1', '11111111-0000-4000-8000-000000000004', 'Cabin row', null, false, false, 'clean', 14, '', null),
 ('22222222-0000-4000-8000-000000000015', 'Cabin 2', '11111111-0000-4000-8000-000000000004', 'Cabin row', null, false, false, 'dirty', 15, '', null),
 ('22222222-0000-4000-8000-000000000016', 'Cabin 3', '11111111-0000-4000-8000-000000000004', 'Cabin row', null, false, false, 'out_of_order', 16, 'Hot water cylinder failed, plumber booked', park_today() - 1),
 ('22222222-0000-4000-8000-000000000017', 'Cabin 4', '11111111-0000-4000-8000-000000000004', 'Cabin row', null, false, false, 'clean', 17, '', null),
 ('22222222-0000-4000-8000-000000000018', 'Unit 1', '11111111-0000-4000-8000-000000000005', 'Cabin row', null, false, false, 'clean', 18, '', null),
 ('22222222-0000-4000-8000-000000000019', 'Unit 2', '11111111-0000-4000-8000-000000000005', 'Cabin row', null, false, false, 'inspected', 19, '', null),
 ('22222222-0000-4000-8000-000000000020', 'L1', '11111111-0000-4000-8000-000000000001', 'Long-stay lane', 12.0, false, true, 'clean', 20, '', null),
 ('22222222-0000-4000-8000-000000000021', 'L2', '11111111-0000-4000-8000-000000000001', 'Long-stay lane', 10.0, false, false, 'clean', 21, '', null),
 ('22222222-0000-4000-8000-000000000022', 'L3', '11111111-0000-4000-8000-000000000001', 'Long-stay lane', 10.0, false, true, 'clean', 22, '', null),
 ('22222222-0000-4000-8000-000000000023', 'L4', '11111111-0000-4000-8000-000000000001', 'Long-stay lane', 12.0, false, true, 'clean', 23, '', null)
on conflict do nothing;

insert into rate_plans (id, name, site_type_id, starts_on, ends_on, nightly_cents, min_nights) values
 ('66666666-0000-4000-8000-000000000001', 'Summer peak', '11111111-0000-4000-8000-000000000001', park_today() + 70, park_today() + 125, 6900, 3),
 ('66666666-0000-4000-8000-000000000002', 'Summer peak', '11111111-0000-4000-8000-000000000003', park_today() + 70, park_today() + 125, 9200, 3),
 ('66666666-0000-4000-8000-000000000003', 'Summer peak', '11111111-0000-4000-8000-000000000004', park_today() + 70, park_today() + 125, 12500, 3),
 ('66666666-0000-4000-8000-000000000004', 'Summer peak', '11111111-0000-4000-8000-000000000005', park_today() + 70, park_today() + 125, 21500, 3),
 ('66666666-0000-4000-8000-000000000005', 'School holidays', '11111111-0000-4000-8000-000000000004', park_today() + 13, park_today() + 26, 11000, 2)
on conflict do nothing;

insert into channels (id, name, kind, commission_pct) values
 ('33333333-0000-4000-8000-000000000001', 'Direct website', 'direct', 0),
 ('33333333-0000-4000-8000-000000000002', 'Booking.com', 'ota', 15),
 ('33333333-0000-4000-8000-000000000003', 'Expedia', 'ota', 18),
 ('33333333-0000-4000-8000-000000000004', 'Walk-in', 'walk-in', 0),
 ('33333333-0000-4000-8000-000000000005', 'Phone', 'direct', 0),
 ('33333333-0000-4000-8000-000000000006', 'Park club members', 'club', 0)
on conflict do nothing;

insert into guests (id, name, email, phone, address, country, company, business_number, member_number, vip, notes, created_at) values
 ('44444444-0000-4000-8000-000000000001', 'Emma Clarke', 'emma.clarke@example.com', '021 555 0301', '14 Rata Street, Christchurch', 'NZ', '', '', 'RB-2201', false, 'Likes a river site', now() - interval '400 days'),
 ('44444444-0000-4000-8000-000000000002', 'Hamish Grant', 'hamish.g@example.com', '027 555 0302', '', 'NZ', '', '', '', false, 'Card on file 4111 1111 1111 1111 exp 09/28', now() - interval '30 days'),
 ('44444444-0000-4000-8000-000000000003', 'Ruth Adams', 'accounts@tasmanorchards.example', '03 555 0303', '8 High Street, Motueka', 'NZ', 'Tasman Orchard Services', '9429041234567', '', false, 'Picking crew supervisor, invoice the company weekly', now() - interval '60 days'),
 ('44444444-0000-4000-8000-000000000004', 'Sophie Martin', 'sophie.m@example.com', '', '', 'AU', '', '', '', false, '', now() - interval '20 days'),
 ('44444444-0000-4000-8000-000000000005', 'Daniel Wu', 'daniel.wu@example.com', '022 555 0305', '', 'NZ', '', '', '', false, 'Motorhome with a trailer', now() - interval '12 days'),
 ('44444444-0000-4000-8000-000000000006', 'Aroha Ngata', 'aroha.ngata@example.com', '021 555 0306', '22 Kahikatea Drive, Dunedin', 'NZ', '', '', 'RB-1140', true, 'Comes every spring, likes Cabin 4', now() - interval '700 days'),
 ('44444444-0000-4000-8000-000000000007', 'Mark Jensen', 'mark.jensen@example.com', '', '', 'DK', '', '', '', false, '', now() - interval '40 days'),
 ('44444444-0000-4000-8000-000000000008', 'Olivia Brown', 'olivia.b@example.com', '021 555 0308', '', 'NZ', '', '', '', false, 'Family of five', now() - interval '10 days'),
 ('44444444-0000-4000-8000-000000000009', 'Peter Hall', 'peter.hall@example.com', '', '', 'NZ', '', '', '', false, '', now() - interval '8 days'),
 ('44444444-0000-4000-8000-000000000010', 'Grace Lee', '', '', '', 'NZ', '', '', '', false, 'Walk-in, paid by card', now() - interval '14 days'),
 ('44444444-0000-4000-8000-000000000011', 'James Taylor', 'james.t@example.com', '', '', 'AU', '', '', '', false, '', now() - interval '6 days'),
 ('44444444-0000-4000-8000-000000000012', 'Chloe Evans', 'chloe.evans@example.com', '', '', 'GB', '', '', '', false, '', now() - interval '9 days'),
 ('44444444-0000-4000-8000-000000000013', 'Ben Walker', 'ben.walker@example.com', '021 555 0313', '', 'NZ', '', '', '', false, '', now() - interval '3 days'),
 ('44444444-0000-4000-8000-000000000014', 'Anna Smith', 'anna.smith@example.com', '', '', 'US', '', '', '', false, '', now() - interval '15 days'),
 ('44444444-0000-4000-8000-000000000015', 'Margaret Reid', 'm.reid@example.com', '03 555 0315', '3 Hill Street, Oamaru', 'NZ', '', '', '', false, '', '2017-02-01'),
 ('44444444-0000-4000-8000-000000000016', 'Chris Doyle', 'chris.doyle@example.com', '027 555 0316', '', 'NZ', '', '', '', false, 'Fifth-wheeler', now() - interval '5 days'),
 ('44444444-0000-4000-8000-000000000017', 'Lisa Novak', 'lisa.novak@example.com', '', '', 'NZ', '', '', '', false, '', now() - interval '4 days'),
 ('44444444-0000-4000-8000-000000000021', 'Bev Thompson', 'bev.thompson@example.com', '021 555 0321', 'Site L1, Riverbend Holiday Park, Motueka', 'NZ', '', '', '', false, 'Permanent since the 2024 winter, own caravan and annex', now() - interval '800 days'),
 ('44444444-0000-4000-8000-000000000022', 'Graham Pike', 'graham.pike@example.com', '027 555 0322', '41 Bridge Street, Nelson', 'NZ', '', '', '', false, 'Annual holiday van, here most weekends and all of January', now() - interval '760 days'),
 ('44444444-0000-4000-8000-000000000023', 'Tama Rewi', 'tama.rewi@example.com', '022 555 0323', '', 'NZ', '', '', '', false, 'Seasonal orchard work, in the park on-site caravan', now() - interval '70 days'),
 ('44444444-0000-4000-8000-000000000024', 'Joan Mackie', 'joan.mackie@example.com', '03 555 0324', 'Site L4, Riverbend Holiday Park, Motueka', 'NZ', '', '', '', false, 'Permanent resident, own park home', now() - interval '1500 days')
on conflict do nothing;

-- Past and future guests for the generated stays below: mostly one-off travellers, a few regulars.
insert into guests (id, name, email, country, created_at)
select ('44444444-0000-4000-8000-0000000' || lpad(i::text, 5, '0'))::uuid,
  (array['Tom', 'Mia', 'Sam', 'Isla', 'Noah', 'Lucy', 'Jack', 'Ella', 'Leo', 'Zoe', 'Oliver', 'Ruby', 'Hugo', 'Aria', 'Finn', 'Maia', 'Nikau', 'Ivy', 'Kai', 'Freya'])[1 + i % 20] || ' ' ||
  (array['Fletcher', 'Robinson', 'Patel', 'Morgan', 'Kim', 'Harris', 'Wilson', 'Thompson', 'Martin', 'Campbell', 'Scott', 'Young', 'Tane', 'Nguyen', 'Muller', 'Brown', 'Singh'])[1 + (i * 7 + i / 20) % 17],
  'guest' || i || '@example.com', (array['NZ', 'NZ', 'NZ', 'AU', 'AU', 'GB', 'US', 'DE', 'NL', 'NZ'])[1 + i % 10], now() - interval '200 days'
from generate_series(1001, 2400) i
on conflict do nothing;

insert into bookings (id, ref, guest_id, site_type_id, site_id, channel_id, arrive_on, depart_on, adults, children, status, vehicle_rego, van_length_m, deposit_cents, deposit_due_on, channel_ref, eta, requests, booked_on, checked_in_at, checked_out_at) values
 ('55555555-0000-4000-8000-000000000001', 'H-1001', '44444444-0000-4000-8000-000000000001', '11111111-0000-4000-8000-000000000001', '22222222-0000-4000-8000-000000000001', '33333333-0000-4000-8000-000000000001', park_today() - 2, park_today(), 2, 0, 'checked_in', 'MKB412', 6.5, 0, null, '', '', 'River view if possible', park_today() - 20, now() - interval '2 days', null),
 ('55555555-0000-4000-8000-000000000002', 'H-1002', '44444444-0000-4000-8000-000000000002', '11111111-0000-4000-8000-000000000004', '22222222-0000-4000-8000-000000000014', '33333333-0000-4000-8000-000000000002', park_today() - 1, park_today() + 2, 2, 1, 'checked_in', 'QZR871', null, 0, null, 'BDC-4471203', '', '', park_today() - 30, now() - interval '1 day', null),
 ('55555555-0000-4000-8000-000000000003', 'H-1003', '44444444-0000-4000-8000-000000000003', '11111111-0000-4000-8000-000000000005', '22222222-0000-4000-8000-000000000018', '33333333-0000-4000-8000-000000000005', park_today() - 40, park_today() + 16, 2, 0, 'checked_in', 'TOS201', null, 0, null, 'PO 7781', '', 'Picking supervisors, weekly invoice to accounts', park_today() - 50, now() - interval '40 days', null),
 ('55555555-0000-4000-8000-000000000004', 'H-1004', '44444444-0000-4000-8000-000000000004', '11111111-0000-4000-8000-000000000004', '22222222-0000-4000-8000-000000000015', '33333333-0000-4000-8000-000000000003', park_today(), park_today() + 2, 2, 0, 'confirmed', '', null, 0, null, 'EXP-99120034', '15:00', '', park_today() - 20, null, null),
 ('55555555-0000-4000-8000-000000000005', 'H-1005', '44444444-0000-4000-8000-000000000005', '11111111-0000-4000-8000-000000000001', null, '33333333-0000-4000-8000-000000000002', park_today(), park_today() + 3, 2, 0, 'confirmed', 'HWY88', 11.5, 0, null, 'BDC-4480911', '17:30', 'Motorhome 9 m plus a 2.5 m trailer', park_today() - 12, null, null),
 ('55555555-0000-4000-8000-000000000006', 'H-1006', '44444444-0000-4000-8000-000000000006', '11111111-0000-4000-8000-000000000004', null, '33333333-0000-4000-8000-000000000005', park_today() + 1, park_today() + 3, 2, 0, 'confirmed', '', null, 0, null, '', '', 'Cabin 4 if free', park_today() - 5, null, null),
 ('55555555-0000-4000-8000-000000000007', 'H-1007', '44444444-0000-4000-8000-000000000007', '11111111-0000-4000-8000-000000000002', '22222222-0000-4000-8000-000000000009', '33333333-0000-4000-8000-000000000003', park_today() - 1, park_today() + 1, 1, 0, 'confirmed', '', null, 0, null, 'EXP-99118820', '', '', park_today() - 40, null, null),
 ('55555555-0000-4000-8000-000000000008', 'H-1008', '44444444-0000-4000-8000-000000000008', '11111111-0000-4000-8000-000000000005', '22222222-0000-4000-8000-000000000019', '33333333-0000-4000-8000-000000000001', park_today() + 20, park_today() + 24, 2, 3, 'confirmed', '', null, 21900, park_today() - 3, '', '', 'Portacot please', park_today() - 10, null, null),
 ('55555555-0000-4000-8000-000000000009', 'H-1009', '44444444-0000-4000-8000-000000000009', '11111111-0000-4000-8000-000000000001', '22222222-0000-4000-8000-000000000003', '33333333-0000-4000-8000-000000000004', park_today() - 1, park_today(), 1, 0, 'checked_out', 'BPL55', 5.9, 0, null, '', '', '', park_today() - 1, now() - interval '1 day', now() - interval '2 hours'),
 ('55555555-0000-4000-8000-000000000010', 'H-1010', '44444444-0000-4000-8000-000000000010', '11111111-0000-4000-8000-000000000005', '22222222-0000-4000-8000-000000000019', '33333333-0000-4000-8000-000000000004', park_today() - 12, park_today() - 5, 1, 0, 'checked_out', '', null, 0, null, '', '', '', park_today() - 12, now() - interval '12 days', now() - interval '5 days'),
 ('55555555-0000-4000-8000-000000000011', 'H-1011', '44444444-0000-4000-8000-000000000011', '11111111-0000-4000-8000-000000000004', null, '33333333-0000-4000-8000-000000000001', park_today() + 30, park_today() + 33, 2, 2, 'enquiry', '', null, 0, null, '', '', 'Asked about kayak hire', park_today() - 6, null, null),
 ('55555555-0000-4000-8000-000000000012', 'H-1012', '44444444-0000-4000-8000-000000000012', '11111111-0000-4000-8000-000000000001', '22222222-0000-4000-8000-000000000006', '33333333-0000-4000-8000-000000000002', park_today() + 7, park_today() + 10, 2, 0, 'confirmed', '', 7.0, 0, null, 'BDC-4490155', '', '', park_today() - 9, null, null),
 ('55555555-0000-4000-8000-000000000013', 'H-1013', '44444444-0000-4000-8000-000000000013', '11111111-0000-4000-8000-000000000001', '22222222-0000-4000-8000-000000000006', '33333333-0000-4000-8000-000000000001', park_today() + 8, park_today() + 10, 2, 0, 'confirmed', '', 6.0, 0, null, '', '', '', park_today() - 3, null, null),
 ('55555555-0000-4000-8000-000000000014', 'H-1014', '44444444-0000-4000-8000-000000000014', '11111111-0000-4000-8000-000000000004', '22222222-0000-4000-8000-000000000017', '33333333-0000-4000-8000-000000000001', park_today() + 5, park_today() + 7, 2, 0, 'confirmed', '', null, 0, null, '', '', '', park_today() - 15, null, null),
 ('55555555-0000-4000-8000-000000000015', 'H-1015', '44444444-0000-4000-8000-000000000016', '11111111-0000-4000-8000-000000000001', '22222222-0000-4000-8000-000000000002', '33333333-0000-4000-8000-000000000001', park_today() + 3, park_today() + 5, 2, 0, 'confirmed', 'FWL777', 9.5, 0, null, '', '', '', park_today() - 5, null, null),
 ('55555555-0000-4000-8000-000000000016', 'H-1016', '44444444-0000-4000-8000-000000000017', '11111111-0000-4000-8000-000000000001', '22222222-0000-4000-8000-000000000021', '33333333-0000-4000-8000-000000000001', park_today() + 10, park_today() + 12, 2, 0, 'confirmed', '', 6.0, 0, null, '', '', '', park_today() - 4, null, null),
 ('55555555-0000-4000-8000-000000000017', 'H-0901', '44444444-0000-4000-8000-000000000015', '11111111-0000-4000-8000-000000000004', '22222222-0000-4000-8000-000000000014', '33333333-0000-4000-8000-000000000005', '2017-03-02', '2017-03-04', 2, 0, 'checked_out', '', null, 0, null, '', '', '', '2017-02-01', '2017-03-02', '2017-03-04')
on conflict do nothing;

-- The enquiry has had no reply for six days.
update bookings set updated_at = now() - interval '6 days' where ref = 'H-1011' and updated_at > now() - interval '1 hour';

-- Long-stay agreements on the long-stay lane: two permanents, an annual holiday van, a seasonal worker.
insert into agreements (id, ref, guest_id, site_id, kind, starts_on, ends_on, fee_cents, fee_period, billed_to, occupants, own_dwelling, main_residence, tenancy_law,
  written_agreement, signed_on, disclosure_given_on, rules_given_on, bond_cents, power_billed_kwh, power_billed_on, vehicle_rego, notes) values
 ('bbbbbbbb-0000-4000-8000-000000000001', 'LS-101', '44444444-0000-4000-8000-000000000021', '22222222-0000-4000-8000-000000000020', 'resident', park_today() - 800, null, 21000, 'week', park_today() - 3, 1, true, true, '',
   true, park_today() - 800, park_today() - 805, park_today() - 805, 84000, 18288.4, park_today() - 31, 'BEV21', 'Pays by automatic payment every Thursday'),
 ('bbbbbbbb-0000-4000-8000-000000000002', 'LS-102', '44444444-0000-4000-8000-000000000022', '22222222-0000-4000-8000-000000000021', 'annual', park_today() - 400, null, 390000, 'year', park_today() + 330, 2, true, false, 'excluded',
   true, park_today() - 400, park_today() - 402, park_today() - 400, 0, null, null, 'GPV16', 'Holiday van stays on site all year; here most weekends'),
 ('bbbbbbbb-0000-4000-8000-000000000003', 'LS-103', '44444444-0000-4000-8000-000000000023', '22222222-0000-4000-8000-000000000022', 'seasonal', park_today() - 70, park_today() + 40, 17500, 'week', park_today(), 1, false, false, '',
   false, null, null, null, 0, 4410.0, park_today() - 30, 'TRW90', 'Park on-site caravan, orchard season'),
 ('bbbbbbbb-0000-4000-8000-000000000004', 'LS-104', '44444444-0000-4000-8000-000000000024', '22222222-0000-4000-8000-000000000023', 'resident', park_today() - 1500, null, 22000, 'week', park_today() + 4, 1, true, true, 'park',
   true, park_today() - 1500, park_today() - 1502, park_today() - 1502, 88000, 30120.0, park_today() - 50, '', 'Own park home on the site')
on conflict do nothing;

-- Twelve weeks of Bev's fees, all paid; eight of Joan's, all paid; ten of Tama's, seven paid; two years of Graham's annual fee, paid.
insert into account_lines (agreement_id, posted_on, kind, description, period_from, period_to, amount_cents)
select a.id, a.billed_to - 7 * (w.n + 1), 'site_fee', 'Site fee ' || si.name || ', ' || (a.billed_to - 7 * (w.n + 1)) || ' to ' || (a.billed_to - 7 * w.n - 1),
  a.billed_to - 7 * (w.n + 1), a.billed_to - 7 * w.n - 1, a.fee_cents
from agreements a join sites si on si.id = a.site_id
cross join generate_series(0, 11) w(n)
where (a.ref = 'LS-101' or (a.ref = 'LS-104' and w.n < 8) or (a.ref = 'LS-103' and w.n < 10))
  and not exists (select 1 from account_lines x where x.agreement_id = a.id);
insert into account_lines (agreement_id, posted_on, kind, description, period_from, period_to, amount_cents)
select a.id, a.starts_on + 365 * y.n, 'site_fee', 'Annual site fee ' || si.name || ', year ' || (y.n + 1), a.starts_on + 365 * y.n, a.starts_on + 365 * (y.n + 1) - 1, a.fee_cents
from agreements a join sites si on si.id = a.site_id cross join generate_series(0, 1) y(n)
where a.ref = 'LS-102' and not exists (select 1 from account_lines x where x.agreement_id = a.id);
insert into account_lines (agreement_id, posted_on, kind, description, amount_cents, method, reference)
select l.agreement_id, l.period_from + 1, 'payment', 'Payment received (bank)', -l.amount_cents, 'bank', 'AP ' || to_char(l.period_from, 'DD Mon')
from account_lines l join agreements a on a.id = l.agreement_id
where l.kind = 'site_fee' and (a.ref <> 'LS-103' or l.period_from < a.billed_to - 21)
  and not exists (select 1 from account_lines x where x.agreement_id = l.agreement_id and x.kind = 'payment');
-- Last month's power for Bev and Tama is already on their accounts.
insert into account_lines (agreement_id, posted_on, kind, description, period_from, period_to, amount_cents)
select a.id, park_today() - 30, 'power', 'Power ' || si.name || ': ' || p.f || ' to ' || a.power_billed_kwh || ' kWh, ' || (a.power_billed_kwh - p.f) || ' kWh at 35 c', park_today() - 61, park_today() - 31,
  round((a.power_billed_kwh - p.f) * 35)::bigint
from agreements a join sites si on si.id = a.site_id
cross join lateral (select case a.ref when 'LS-101' then 18000.0 else 4120.0 end f) p
where a.ref in ('LS-101', 'LS-103') and not exists (select 1 from account_lines x where x.agreement_id = a.id and x.kind = 'power');
insert into account_lines (agreement_id, posted_on, kind, description, amount_cents, method, reference)
select l.agreement_id, l.posted_on + 3, 'payment', 'Payment received (bank)', -l.amount_cents, 'bank', 'Power'
from account_lines l join agreements a on a.id = l.agreement_id
where l.kind = 'power' and a.ref = 'LS-101' and not exists (select 1 from account_lines x where x.agreement_id = l.agreement_id and x.reference = 'Power');

insert into meter_readings (site_id, read_on, kwh, read_by) values
 ('22222222-0000-4000-8000-000000000020', park_today() - 62, 18000.0, 'Mere'),
 ('22222222-0000-4000-8000-000000000020', park_today() - 31, 18288.4, 'Mere'),
 ('22222222-0000-4000-8000-000000000020', park_today() - 1, 18560.9, 'Mere'),
 ('22222222-0000-4000-8000-000000000022', park_today() - 70, 4120.0, 'start of agreement'),
 ('22222222-0000-4000-8000-000000000022', park_today() - 30, 4410.0, 'Mere'),
 ('22222222-0000-4000-8000-000000000022', park_today() - 2, 4705.5, 'Mere'),
 ('22222222-0000-4000-8000-000000000023', park_today() - 50, 30120.0, 'Mere')
on conflict do nothing;

-- Nights at the rate each carries: the rate plan covering that night (else the base rate), plus extra people.
-- The orchard supervisors in Unit 1 are on an agreed weekly rate.
insert into booking_nights (booking_id, night_on, rate_cents, rate_plan)
select b.id, d::date,
  case when b.ref = 'H-1003' then 14000 else coalesce(p.nightly_cents, t.base_rate_cents)
    + greatest(b.adults - t.included_guests, 0) * t.extra_adult_cents + greatest(b.children - greatest(t.included_guests - b.adults, 0), 0) * t.extra_child_cents end,
  case when b.ref = 'H-1003' then 'Contract rate' else coalesce(p.name, 'Base rate') end
from bookings b join site_types t on t.id = b.site_type_id
cross join lateral generate_series(b.arrive_on, b.depart_on - 1, interval '1 day') d
left join lateral (select name, nightly_cents from rate_plans r where r.site_type_id = b.site_type_id and d::date between r.starts_on and r.ends_on order by r.ends_on - r.starts_on limit 1) p on true
where b.ref like 'H-%'
on conflict do nothing;

insert into charges (id, booking_id, posted_on, kind, description, amount_cents) values
 ('77777777-0000-4000-8000-000000000001', '55555555-0000-4000-8000-000000000001', park_today() - 1, 'gas', 'LPG bottle swap, 9 kg', 2000),
 ('77777777-0000-4000-8000-000000000002', '55555555-0000-4000-8000-000000000009', park_today() - 1, 'shop', 'Shop: milk, bread, firewood', 1850),
 ('77777777-0000-4000-8000-000000000003', '55555555-0000-4000-8000-000000000002', park_today() - 1, 'linen', 'Linen hire, one double and one single', 2500),
 ('77777777-0000-4000-8000-000000000004', '55555555-0000-4000-8000-000000000003', park_today() - 7, 'laundry', 'Laundry tokens, week 5', 1200)
on conflict do nothing;

insert into payments (id, booking_id, paid_on, kind, method, amount_cents, reference) values
 ('88888888-0000-4000-8000-000000000001', '55555555-0000-4000-8000-000000000001', park_today() - 2, 'payment', 'card', 10800, 'Stripe ch_demo_1001'),
 ('88888888-0000-4000-8000-000000000002', '55555555-0000-4000-8000-000000000002', park_today() - 1, 'payment', 'channel', 33000, 'Booking.com virtual card'),
 ('88888888-0000-4000-8000-000000000011', '55555555-0000-4000-8000-000000000002', park_today() - 1, 'payment', 'eftpos', 2500, 'Linen'),
 ('88888888-0000-4000-8000-000000000003', '55555555-0000-4000-8000-000000000003', park_today() - 33, 'payment', 'bank', 98000, 'Tasman Orchard Services week 1'),
 ('88888888-0000-4000-8000-000000000004', '55555555-0000-4000-8000-000000000003', park_today() - 26, 'payment', 'bank', 98000, 'Tasman Orchard Services week 2'),
 ('88888888-0000-4000-8000-000000000005', '55555555-0000-4000-8000-000000000003', park_today() - 19, 'payment', 'bank', 98000, 'Tasman Orchard Services week 3'),
 ('88888888-0000-4000-8000-000000000006', '55555555-0000-4000-8000-000000000003', park_today() - 12, 'payment', 'bank', 98000, 'Tasman Orchard Services week 4'),
 ('88888888-0000-4000-8000-000000000012', '55555555-0000-4000-8000-000000000003', park_today() - 5, 'payment', 'bank', 99200, 'Tasman Orchard Services week 5'),
 ('88888888-0000-4000-8000-000000000007', '55555555-0000-4000-8000-000000000004', park_today() - 20, 'payment', 'channel', 19000, 'Expedia collect'),
 ('88888888-0000-4000-8000-000000000008', '55555555-0000-4000-8000-000000000009', park_today() - 1, 'payment', 'eftpos', 5400, ''),
 ('88888888-0000-4000-8000-000000000009', '55555555-0000-4000-8000-000000000010', park_today() - 5, 'payment', 'card', 115500, ''),
 ('88888888-0000-4000-8000-000000000010', '55555555-0000-4000-8000-000000000017', '2017-03-04', 'payment', 'cash', 19000, '')
on conflict do nothing;

insert into invoices (id, number, booking_id, issued_on, total_cents, gst_cents) values
 ('99999999-0000-4000-8000-000000000001', 'INV-1001', '55555555-0000-4000-8000-000000000010', park_today() - 5, 115500, 15064),
 ('99999999-0000-4000-8000-000000000002', 'INV-0901', '55555555-0000-4000-8000-000000000017', '2017-03-04', 19000, 2478)
on conflict do nothing;

-- Cabin 4 is also listed on Booking.com; its calendar says it is taken for three nights.
insert into blocks (id, site_id, starts_on, ends_on, source, uid, summary) values
 ('aaaaaaaa-0000-4000-8000-000000000001', '22222222-0000-4000-8000-000000000017', park_today() + 4, park_today() + 7, 'bookingcom', 'demo-bdc-cabin4-7731', 'CLOSED - Not available')
on conflict do nothing;

-- About six months of past stays on the casual sites and cabins: one to four nights each, some gaps, a few cancellations.
insert into bookings (id, ref, guest_id, site_type_id, site_id, channel_id, arrive_on, depart_on, adults, children, status, booked_on, checked_in_at, checked_out_at, cancelled_on)
select gen_random_uuid(), 'R-' || lpad(s.sort::text, 2, '0') || lpad(g.n::text, 3, '0'),
  ('44444444-0000-4000-8000-0000000' || lpad((case when (g.n * 3 + s.sort) % 23 = 0 then 1001 + (g.n + s.sort) % 6 else 1010 + g.n * 24 + s.sort end)::text, 5, '0'))::uuid,
  s.site_type_id, s.id,
  case (g.n * 7 + s.sort) % 10 when 0 then '33333333-0000-4000-8000-000000000002'::uuid when 1 then '33333333-0000-4000-8000-000000000002'::uuid
    when 2 then '33333333-0000-4000-8000-000000000002'::uuid when 3 then '33333333-0000-4000-8000-000000000003'::uuid
    when 4 then '33333333-0000-4000-8000-000000000006'::uuid when 5 then '33333333-0000-4000-8000-000000000004'::uuid
    when 9 then '33333333-0000-4000-8000-000000000005'::uuid else '33333333-0000-4000-8000-000000000001'::uuid end,
  a.arrive, a.arrive + a.nights, 2, (g.n + s.sort) % 3,
  case when (g.n + s.sort) % 17 = 0 then 'cancelled' else 'checked_out' end,
  a.arrive - (2 + (g.n * 13 + s.sort) % 40),
  case when (g.n + s.sort) % 17 = 0 then null else a.arrive::timestamptz + interval '15 hours' end,
  case when (g.n + s.sort) % 17 = 0 then null else (a.arrive + a.nights)::timestamptz + interval '10 hours' end,
  case when (g.n + s.sort) % 17 = 0 then a.arrive - 2 end
from sites s cross join generate_series(0, 45) g(n)
cross join lateral (select park_today() - 184 + g.n * 4 + s.sort % 4 arrive, 1 + (g.n + s.sort) % 4 nights) a
where s.area <> 'Long-stay lane' and (g.n + s.sort) % 4 <> 0 and a.arrive + a.nights <= park_today() - 3
  and not exists (select 1 from bookings x where x.site_id = s.id and x.ref like 'H-%' and x.arrive_on < a.arrive + a.nights and a.arrive < x.depart_on)
on conflict (ref) do nothing;

-- What is already on the books for the next two months, thinning out the further ahead it gets.
insert into bookings (id, ref, guest_id, site_type_id, site_id, channel_id, arrive_on, depart_on, adults, status, booked_on)
select gen_random_uuid(), 'F-' || lpad(s.sort::text, 2, '0') || lpad(g.n::text, 3, '0'),
  ('44444444-0000-4000-8000-0000000' || lpad((2200 + g.n * 2 + s.sort % 2)::text, 5, '0'))::uuid,
  s.site_type_id, s.id,
  case (g.n * 3 + s.sort) % 6 when 0 then '33333333-0000-4000-8000-000000000002'::uuid when 1 then '33333333-0000-4000-8000-000000000002'::uuid
    when 2 then '33333333-0000-4000-8000-000000000003'::uuid when 3 then '33333333-0000-4000-8000-000000000005'::uuid else '33333333-0000-4000-8000-000000000001'::uuid end,
  a.arrive, a.arrive + a.nights, 2, 'confirmed', greatest(park_today() - 40, a.arrive - (4 + (g.n * 11 + s.sort) % 50))
from sites s cross join generate_series(0, 20) g(n)
cross join lateral (select park_today() + 3 + g.n * 3 + s.sort % 3 arrive, 1 + (g.n + s.sort) % 3 nights) a
where s.area <> 'Long-stay lane' and s.status <> 'out_of_order' and (g.n * 7 + s.sort * 3) % 10 < 6 - g.n / 3
  and not exists (select 1 from bookings x where x.site_id = s.id and x.ref like 'H-%' and x.arrive_on < a.arrive + a.nights + 1 and a.arrive - 1 < x.depart_on)
  and not exists (select 1 from blocks k where k.site_id = s.id and k.starts_on < a.arrive + a.nights and a.arrive < k.ends_on)
on conflict (ref) do nothing;

insert into booking_nights (booking_id, night_on, rate_cents, rate_plan)
select b.id, d::date, coalesce(p.nightly_cents, t.base_rate_cents)
    + greatest(b.adults - t.included_guests, 0) * t.extra_adult_cents + greatest(b.children - greatest(t.included_guests - b.adults, 0), 0) * t.extra_child_cents,
  coalesce(p.name, 'Base rate')
from bookings b join site_types t on t.id = b.site_type_id
cross join lateral generate_series(b.arrive_on, b.depart_on - 1, interval '1 day') d
left join lateral (select name, nightly_cents from rate_plans r where r.site_type_id = b.site_type_id and d::date between r.starts_on and r.ends_on order by r.ends_on - r.starts_on limit 1) p on true
where b.ref ~ '^[RF]-'
on conflict do nothing;

insert into payments (booking_id, paid_on, kind, method, amount_cents, reference)
select v.id, v.depart_on - 1, 'payment', case when v.channel_kind = 'ota' then 'channel' else 'card' end, v.total_cents, 'demo'
from v_bookings v where v.ref like 'R-%' and v.status = 'checked_out' and v.total_cents > 0
  and not exists (select 1 from payments p where p.booking_id = v.id);

insert into invoices (number, booking_id, issued_on, total_cents, gst_cents)
select 'INV-R' || substr(f.ref, 3), f.id, f.depart_on - 1, f.total_cents, f.gst_cents
from v_folio f where f.ref like 'R-%' and f.status = 'checked_out'
on conflict do nothing;
