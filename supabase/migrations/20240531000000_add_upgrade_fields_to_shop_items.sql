-- Add is_upgrade, from_rank_id, and to_rank_id columns to shop_items table
ALTER TABLE shop_items 
ADD COLUMN is_upgrade BOOLEAN DEFAULT FALSE,
ADD COLUMN from_rank_id UUID REFERENCES shop_items(id) ON DELETE RESTRICT,
ADD COLUMN to_rank_id UUID REFERENCES shop_items(id) ON DELETE RESTRICT;

-- Create indexes for faster queries
CREATE INDEX idx_shop_items_is_upgrade ON shop_items(is_upgrade);
CREATE INDEX idx_shop_items_from_rank_id ON shop_items(from_rank_id);
CREATE INDEX idx_shop_items_to_rank_id ON shop_items(to_rank_id);

-- Add constraints to ensure logical relationships
-- Make sure both from_rank_id and to_rank_id are set when is_upgrade is true
ALTER TABLE shop_items 
ADD CONSTRAINT check_upgrade_rank_ids 
CHECK (
  (is_upgrade = FALSE) OR 
  (is_upgrade = TRUE AND from_rank_id IS NOT NULL AND to_rank_id IS NOT NULL)
);

-- Update any existing upgrade ranks based on name parsing
-- This is just a starting point and may need manual verification afterward
UPDATE shop_items
SET is_upgrade = TRUE
WHERE name LIKE '%to%' OR name LIKE '%→%';

-- Add comment explaining the new columns
COMMENT ON COLUMN shop_items.is_upgrade IS 'Flag indicating if this item is an upgrade from one rank to another';
COMMENT ON COLUMN shop_items.from_rank_id IS 'Reference to the source rank in an upgrade';
COMMENT ON COLUMN shop_items.to_rank_id IS 'Reference to the target rank in an upgrade'; 