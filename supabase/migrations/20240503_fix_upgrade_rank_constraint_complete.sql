-- Completely remove the existing constraint
ALTER TABLE "public"."shop_items" DROP CONSTRAINT IF EXISTS "check_upgrade_rank_ids";

-- Allow null values in from_rank_id and to_rank_id 
ALTER TABLE "public"."shop_items" ALTER COLUMN from_rank_id DROP NOT NULL;
ALTER TABLE "public"."shop_items" ALTER COLUMN to_rank_id DROP NOT NULL;

-- First add a proper foreign key constraint for self-referencing
ALTER TABLE "public"."shop_items" DROP CONSTRAINT IF EXISTS "shop_items_from_rank_id_fkey";
ALTER TABLE "public"."shop_items" DROP CONSTRAINT IF EXISTS "shop_items_to_rank_id_fkey";

-- Re-add the foreign key constraints with proper deletion behavior
ALTER TABLE "public"."shop_items" ADD CONSTRAINT "shop_items_from_rank_id_fkey" 
FOREIGN KEY (from_rank_id) REFERENCES "public"."shop_items"(id) ON DELETE SET NULL;

ALTER TABLE "public"."shop_items" ADD CONSTRAINT "shop_items_to_rank_id_fkey" 
FOREIGN KEY (to_rank_id) REFERENCES "public"."shop_items"(id) ON DELETE SET NULL;

-- Add a simpler constraint that only enforces the basic logic
ALTER TABLE "public"."shop_items" ADD CONSTRAINT "check_upgrade_rank_ids" 
CHECK (
  NOT (is_upgrade = true AND (from_rank_id IS NULL OR to_rank_id IS NULL))
);

-- Add a comment explaining the constraint
COMMENT ON CONSTRAINT "check_upgrade_rank_ids" ON "public"."shop_items" 
IS 'Ensures that upgrade ranks have both source and target ranks specified';

-- Update all existing records to ensure consistency
UPDATE "public"."shop_items" 
SET from_rank_id = NULL, to_rank_id = NULL 
WHERE is_upgrade = false; 