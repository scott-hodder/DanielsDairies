-- Make module-referencing FKs cascade on delete so admins can delete modules
-- without needing RLS-permissive cleanup loops in client code.

DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT
      con.conname AS constraint_name,
      nsp.nspname AS table_schema,
      cls.relname AS table_name,
      att.attname AS column_name
    FROM pg_constraint con
    JOIN pg_class cls ON cls.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = cls.relnamespace
    JOIN pg_class fcls ON fcls.oid = con.confrelid
    JOIN pg_namespace fnsp ON fnsp.oid = fcls.relnamespace
    JOIN pg_attribute att
      ON att.attrelid = con.conrelid
     AND att.attnum = ANY(con.conkey)
    WHERE con.contype = 'f'
      AND fnsp.nspname = 'public'
      AND fcls.relname = 'modules'
      AND con.confdeltype <> 'c'   -- skip ones already CASCADE
  LOOP
    EXECUTE format(
      'ALTER TABLE %I.%I DROP CONSTRAINT %I',
      rec.table_schema, rec.table_name, rec.constraint_name
    );
    EXECUTE format(
      'ALTER TABLE %I.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES public.modules(id) ON DELETE CASCADE',
      rec.table_schema, rec.table_name, rec.constraint_name, rec.column_name
    );
  END LOOP;
END $$;
