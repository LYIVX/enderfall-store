-- Migration to update the color storage in shop_items table
-- to store gradient information in the color column as JSON

-- First, let's ensure any existing shop items have valid color data
-- by converting simple color strings to JSON format
UPDATE shop_items
SET color = json_build_object(
  'colors', json_build_array(json_build_object('color', color, 'position', 0)),
  'gradientType', 'none'
)::text
WHERE color IS NOT NULL AND NOT color ~ '^[\s]*[{]';

-- For items with color2 set, add that as a second color in the gradient
-- and set gradient type to linear
UPDATE shop_items
SET color = json_build_object(
  'colors', json_build_array(
    json_build_object('color', color, 'position', 0),
    json_build_object('color', color2, 'position', 100)
  ),
  'gradientType', 'linear'
)::text
WHERE color2 IS NOT NULL AND color2 != '';

-- Add comment to explain the new color format
COMMENT ON COLUMN shop_items.color IS 'JSON formatted color data with gradient support: {"colors": [{"color": "#hex", "position": 0-100}, ...], "gradientType": "linear|radial|none"}';

-- Mark color2 as deprecated first (for documentation purposes)
COMMENT ON COLUMN shop_items.color2 IS 'DEPRECATED: Now using color column with JSON format for gradient support';

-- After ensuring all color2 data is migrated to the color column, drop the color2 column
ALTER TABLE shop_items DROP COLUMN color2; 