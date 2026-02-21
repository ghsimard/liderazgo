
CREATE OR REPLACE FUNCTION public.get_table_columns(table_names text[])
RETURNS TABLE(
  table_name text,
  column_name text,
  udt_name_full text,
  is_nullable text,
  column_default text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.table_name::text,
    c.column_name::text,
    CASE
      WHEN c.data_type = 'ARRAY' THEN c.udt_name || '[]'
      WHEN c.data_type = 'USER-DEFINED' THEN c.udt_name
      ELSE c.data_type
    END AS udt_name_full,
    c.is_nullable::text,
    c.column_default::text
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = ANY(table_names)
  ORDER BY c.table_name, c.ordinal_position;
$$;

CREATE OR REPLACE FUNCTION public.get_enum_types()
RETURNS TABLE(
  type_name text,
  enum_values text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    t.typname::text AS type_name,
    string_agg('''' || e.enumlabel || '''', ', ' ORDER BY e.enumsortorder) AS enum_values
  FROM pg_type t
  JOIN pg_enum e ON t.oid = e.enumtypid
  JOIN pg_namespace n ON t.typnamespace = n.oid
  WHERE n.nspname = 'public'
  GROUP BY t.typname;
$$;
