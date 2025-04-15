-- Add display_order column to shop_items table
ALTER TABLE shop_items 
ADD COLUMN display_order INTEGER DEFAULT 0;

-- Update existing shop items to have sequential display_order values within their categories
WITH indexed_items AS (
    SELECT 
        id,
        category_id,
        ROW_NUMBER() OVER (PARTITION BY category_id ORDER BY name) AS row_num
    FROM 
        shop_items
)
UPDATE shop_items
SET display_order = indexed_items.row_num
FROM indexed_items
WHERE shop_items.id = indexed_items.id;

-- Create an index on display_order for better performance when ordering
CREATE INDEX idx_shop_items_display_order ON shop_items(category_id, display_order); 