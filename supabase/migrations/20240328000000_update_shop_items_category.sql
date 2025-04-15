-- Create a temporary mapping table to store the old category names and their corresponding new category IDs
CREATE TEMP TABLE category_mapping AS
SELECT 
    name as old_category,
    id as new_category_id
FROM categories;

-- Add a new category_id column that references the categories table
ALTER TABLE shop_items 
ADD COLUMN category_id UUID REFERENCES categories(id) ON DELETE RESTRICT;

-- Update existing shop items with their new category IDs
UPDATE shop_items si
SET category_id = cm.new_category_id
FROM category_mapping cm
WHERE si.category::text = cm.old_category;

-- Drop the temporary mapping table
DROP TABLE category_mapping;

-- Make category_id NOT NULL after the migration
ALTER TABLE shop_items ALTER COLUMN category_id SET NOT NULL;

-- Drop the existing enum type and category column
ALTER TABLE shop_items DROP COLUMN category;
DROP TYPE shop_item_category;

-- Create an index on category_id for better performance
CREATE INDEX idx_shop_items_category_id ON shop_items(category_id);

-- Drop existing policies
DROP POLICY IF EXISTS "Shop items are viewable by everyone" ON shop_items;
DROP POLICY IF EXISTS "Admins can insert shop items" ON shop_items;
DROP POLICY IF EXISTS "Admins can update shop items" ON shop_items;
DROP POLICY IF EXISTS "Admins can delete shop items" ON shop_items;

-- Create new RLS policies
CREATE POLICY "Shop items are viewable by everyone" 
ON shop_items FOR SELECT 
USING (true);

-- Only allow authenticated admins to insert/update/delete
CREATE POLICY "Admins can insert shop items" 
ON shop_items FOR INSERT 
TO authenticated 
WITH CHECK (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
));

CREATE POLICY "Admins can update shop items" 
ON shop_items FOR UPDATE 
TO authenticated 
USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
));

CREATE POLICY "Admins can delete shop items" 
ON shop_items FOR DELETE 
TO authenticated 
USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
)); 