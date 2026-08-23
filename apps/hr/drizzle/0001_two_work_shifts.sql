UPDATE `staff`
SET `shift` = CASE
  WHEN `shift` LIKE '%13:00%' OR `shift` LIKE '%14:00%' THEN 'Turno 2 · 14:00–20:00'
  ELSE 'Turno 1 · 10:00–18:00'
END
WHERE `is_admin` = false;
