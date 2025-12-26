-- Fix properties.created_by foreign key to allow user deletion
-- Currently it has NO ON DELETE action which prevents deleting users who created properties

-- Drop the existing constraint
ALTER TABLE properties
  DROP CONSTRAINT IF EXISTS properties_created_by_fkey;

-- Re-add with ON DELETE SET NULL
ALTER TABLE properties
  ADD CONSTRAINT properties_created_by_fkey
  FOREIGN KEY (created_by)
  REFERENCES auth.users(id)
  ON DELETE SET NULL;

-- Verify the constraint
SELECT
  conname AS constraint_name,
  conrelid::regclass AS table_name,
  confrelid::regclass AS referenced_table,
  confupdtype AS on_update,
  confdeltype AS on_delete
FROM pg_constraint
WHERE conname = 'properties_created_by_fkey';
