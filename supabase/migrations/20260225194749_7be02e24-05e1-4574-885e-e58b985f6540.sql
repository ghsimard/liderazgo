
CREATE OR REPLACE FUNCTION public.get_table_constraints(table_names text[])
RETURNS TABLE(
  table_name text,
  constraint_name text,
  constraint_type text,
  column_names text,
  foreign_table text,
  foreign_columns text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    tc.table_name::text,
    tc.constraint_name::text,
    tc.constraint_type::text,
    string_agg(DISTINCT kcu.column_name, ', ' ORDER BY kcu.column_name)::text AS column_names,
    ccu.table_name::text AS foreign_table,
    string_agg(DISTINCT ccu.column_name, ', ' ORDER BY ccu.column_name)::text AS foreign_columns
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
  LEFT JOIN information_schema.constraint_column_usage ccu
    ON tc.constraint_name = ccu.constraint_name
    AND tc.table_schema = ccu.table_schema
    AND tc.constraint_type = 'FOREIGN KEY'
  WHERE tc.table_schema = 'public'
    AND tc.table_name = ANY(table_names)
    AND tc.constraint_type IN ('PRIMARY KEY', 'UNIQUE', 'FOREIGN KEY')
  GROUP BY tc.table_name, tc.constraint_name, tc.constraint_type, ccu.table_name
  ORDER BY tc.table_name, tc.constraint_type, tc.constraint_name;
$$;
