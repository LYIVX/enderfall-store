-- First get the list of tables that need realtime functionality
-- This script restores realtime functionality by updating the existing publication
-- or creating it if it doesn't exist

-- Drop and recreate the publication
DO $$
DECLARE
  table_exists BOOLEAN;
  table_in_publication BOOLEAN;
  table_name TEXT;
  required_tables TEXT[] := ARRAY['user_status', 'messages', 'conversations', 'conversation_participants', 'typing_status'];
  i INTEGER;
BEGIN
  -- First check if publication exists, create it if it doesn't
  IF NOT EXISTS (SELECT FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    EXECUTE 'CREATE PUBLICATION supabase_realtime';
    RAISE NOTICE 'Created new supabase_realtime publication';
  END IF;

  -- For each required table
  FOR i IN 1..array_length(required_tables, 1) LOOP
    table_name := required_tables[i];
    
    -- Check if the table exists
    EXECUTE format('SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = ''public'' AND table_name = ''%s'')', table_name)
    INTO table_exists;
    
    IF table_exists THEN
      -- Check if the table is already in the publication
      EXECUTE format('SELECT EXISTS (SELECT FROM pg_publication_tables WHERE pubname = ''supabase_realtime'' AND tablename = ''%s'')', table_name)
      INTO table_in_publication;
      
      IF NOT table_in_publication THEN
        -- Add table to publication if it exists but isn't in the publication
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', table_name);
        RAISE NOTICE 'Added table % to publication', table_name;
      ELSE
        RAISE NOTICE 'Table % is already in publication', table_name;
      END IF;
    ELSE
      RAISE NOTICE 'Table % does not exist, skipping', table_name;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Realtime publication updated successfully';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error updating publication: %', SQLERRM;
END $$; 