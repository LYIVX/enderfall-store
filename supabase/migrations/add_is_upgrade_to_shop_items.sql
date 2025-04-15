-- Add is_upgrade column to shop_items table
ALTER TABLE shop_items 
ADD COLUMN IF NOT EXISTS is_upgrade BOOLEAN DEFAULT FALSE;

-- Update any existing rows to have is_upgrade set to false
UPDATE shop_items 
SET is_upgrade = FALSE 
WHERE is_upgrade IS NULL;

-- Comment: This migration adds a new boolean field to track whether a shop item
-- is an upgrade rather than a full rank. This helps distinguish between 
-- complete ranks and upgrades to existing ranks in the shop interface. 