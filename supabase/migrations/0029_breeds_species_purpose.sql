-- Rellena species y purpose en el catálogo de razas que tengan esos campos vacíos.
-- Todas las razas conocidas en el catálogo son bovinas.

UPDATE breeds
SET species = 'bovine'
WHERE (species IS NULL OR species = '');

-- Propósito por nombre de raza (case-insensitive)
UPDATE breeds SET purpose = 'dairy'  WHERE lower(name) IN ('ayrshire','guernsey','gyr','girolando','holstein','jersey','pardo suizo','normando');
UPDATE breeds SET purpose = 'beef'   WHERE lower(name) IN ('angus','brahman','charolais','hereford','limousin','senepol','brangus','nelore','romagnola','chianina','marchigiana');
UPDATE breeds SET purpose = 'dual'   WHERE lower(name) IN ('criollo','simmental','fleckvieh','beefmaster','romosinuano','sanmartinero','blanco orejinegro');
UPDATE breeds SET purpose = 'beef'   WHERE lower(name) IN ('gyr') AND purpose IS NULL;  -- Gyr también puede ser lechero; ya cubierto arriba
