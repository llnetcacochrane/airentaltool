-- Fix user deletion issue by updating foreign key constraint
-- The businesses.created_by field should allow user deletion by setting to NULL

-- Drop the existing constraint
ALTER TABLE businesses
  DROP CONSTRAINT IF EXISTS businesses_created_by_fkey;

-- Re-add with ON DELETE SET NULL
ALTER TABLE businesses
  ADD CONSTRAINT businesses_created_by_fkey
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
WHERE conname = 'businesses_created_by_fkey';
