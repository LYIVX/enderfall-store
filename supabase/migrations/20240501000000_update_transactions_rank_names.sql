-- Add rank_names column as an array type to transactions table
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS rank_names TEXT[] DEFAULT '{}'::TEXT[];

-- Create an index for efficient searching of rank names
CREATE INDEX IF NOT EXISTS idx_transactions_rank_names 
ON transactions USING GIN (rank_names);

-- Add a comment to describe the column
COMMENT ON COLUMN transactions.rank_names IS 'Array of purchased rank names for easier querying and display';

-- Create a function to automatically extract rank names from items JSONB and store them in the new array
CREATE OR REPLACE FUNCTION extract_rank_names_from_items()
RETURNS TRIGGER AS $$
DECLARE
  item_record JSONB;
  extracted_names TEXT[] := '{}'::TEXT[];
BEGIN
  -- Loop through each item in the items JSONB array
  IF NEW.items IS NOT NULL AND jsonb_array_length(NEW.items) > 0 THEN
    FOR item_record IN SELECT jsonb_array_elements(NEW.items)
    LOOP
      -- Extract the rank_name from each item and add it to the array if not null
      IF item_record->>'rank_name' IS NOT NULL THEN
        extracted_names := array_append(extracted_names, item_record->>'rank_name');
      END IF;
    END LOOP;
  END IF;

  -- Set the extracted names to the rank_names column
  NEW.rank_names := extracted_names;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically populate rank_names from items
CREATE TRIGGER transactions_extract_rank_names
BEFORE INSERT OR UPDATE ON transactions
FOR EACH ROW EXECUTE FUNCTION extract_rank_names_from_items();

-- Update existing records to fill in the rank_names array
WITH updated_transactions AS (
  SELECT 
    id,
    (
      SELECT array_agg(item->>'rank_name')
      FROM jsonb_array_elements(items) AS item
      WHERE item->>'rank_name' IS NOT NULL
    ) AS extracted_names
  FROM transactions
)
UPDATE transactions t
SET rank_names = COALESCE(u.extracted_names, '{}'::TEXT[])
FROM updated_transactions u
WHERE t.id = u.id
AND u.extracted_names IS NOT NULL; 