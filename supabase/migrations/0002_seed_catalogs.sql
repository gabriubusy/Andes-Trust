-- Seed de catálogos globales. Idempotente.

insert into breeds (name, species, purpose) values
  ('Holstein',       'bovine', 'dairy'),
  ('Jersey',         'bovine', 'dairy'),
  ('Pardo Suizo',    'bovine', 'dual'),
  ('Ayrshire',       'bovine', 'dairy'),
  ('Guernsey',       'bovine', 'dairy'),
  ('Brahman',        'bovine', 'beef'),
  ('Gyr',            'bovine', 'dual'),
  ('Girolando',      'bovine', 'dual'),
  ('Angus',          'bovine', 'beef'),
  ('Hereford',       'bovine', 'beef'),
  ('Charolais',      'bovine', 'beef'),
  ('Simmental',      'bovine', 'dual'),
  ('Nelore',         'bovine', 'beef'),
  ('Criollo',        'bovine', 'dual')
on conflict (name) do nothing;

insert into diseases_catalog (name, icd) values
  ('Fiebre Aftosa',           'A27'),
  ('Brucelosis bovina',       'A23.1'),
  ('Tuberculosis bovina',     'A15'),
  ('Rabia bovina',            'A82'),
  ('Carbón sintomático',      null),
  ('Ántrax',                  'A22'),
  ('Leptospirosis',           'A27'),
  ('IBR (Rinotraqueítis)',    null),
  ('DVB (Diarrea Viral)',     null),
  ('Mastitis',                null),
  ('Neumonía',                null),
  ('Parásitos gastrointestinales', null),
  ('Garrapatosis',            null),
  ('Anaplasmosis',            null),
  ('Babesiosis',              null),
  ('Clostridiosis',           null)
on conflict (name) do nothing;

insert into vaccines_catalog (name, disease, route, booster_days, withdrawal_days) values
  ('Aftogán Oleosa',          'Fiebre Aftosa',              'IM', 180, 0),
  ('Brucella RB51',           'Brucelosis bovina',          'SC', null, 0),
  ('Brucella Cepa 19',        'Brucelosis bovina',          'SC', null, 0),
  ('Rabia bovina',            'Rabia bovina',               'IM', 365, 0),
  ('Carbón sintomático',      'Carbón sintomático',         'SC', 180, 0),
  ('Triple Clostridial',      'Clostridiosis',              'SC', 180, 0),
  ('Bacterina mixta 8 vías',  'Clostridiosis',              'SC', 180, 0),
  ('IBR-DVB-PI3-BRSV',        'IBR (Rinotraqueítis)',       'IM', 365, 0),
  ('Leptospira pentavalente', 'Leptospirosis',              'IM', 180, 0),
  ('Ántrax',                  'Ántrax',                     'SC', 365, 0)
on conflict (name) do nothing;

insert into treatments_catalog (name, active_ingredient, kind, route, withdrawal_meat_days, withdrawal_milk_days) values
  ('Ivermectina 1%',           'Ivermectina',          'antiparasitario', 'SC',  35, 28),
  ('Ivermectina + Clorsulón',  'Ivermectina/Clorsulón','antiparasitario', 'SC',  42, 28),
  ('Albendazol 10%',           'Albendazol',           'antiparasitario', 'oral',14, 5),
  ('Fenbendazol',              'Fenbendazol',          'antiparasitario', 'oral', 8, 0),
  ('Oxitetraciclina LA',       'Oxitetraciclina',      'antibiótico',     'IM',  28, 7),
  ('Penicilina G + Estrepto',  'Penicilina/Estrepto',  'antibiótico',     'IM',  14, 4),
  ('Enrofloxacina 10%',        'Enrofloxacina',        'antibiótico',     'IM',  14, 3),
  ('Florfenicol',              'Florfenicol',          'antibiótico',     'IM',  30, 0),
  ('Flunixín meglumine',       'Flunixín',             'antiinflamatorio','IM',   7, 2),
  ('Meloxicam',                'Meloxicam',            'antiinflamatorio','SC',  15, 5),
  ('Vitamina AD3E',            'Vit. AD3E',            'vitamínico',      'IM',   0, 0),
  ('Complejo B',               'Vit. B',               'vitamínico',      'IM',   0, 0),
  ('Calcio + Magnesio',        'Ca/Mg',                'mineral',         'IV',   0, 0),
  ('Oxitocina',                'Oxitocina',            'hormonal',        'IM',   0, 0),
  ('Prostaglandina F2α',       'Cloprostenol',         'hormonal',        'IM',   0, 0)
on conflict (name) do nothing;
