-- First, let's drop the existing constraint that's causing issues
ALTER TABLE "public"."shop_items" DROP CONSTRAINT IF EXISTS "check_upgrade_rank_ids";

-- Then add a new, more flexible constraint
ALTER TABLE "public"."shop_items" ADD CONSTRAINT "check_upgrade_rank_ids" 
CHECK (
  (
    -- If is_upgrade is true, both from_rank_id and to_rank_id must be non-null
    (is_upgrade = true AND from_rank_id IS NOT NULL AND to_rank_id IS NOT NULL)
    OR 
    -- If is_upgrade is false, both should be null (or we don't care)
    (is_upgrade = false)
  )
);

-- Add a comment explaining the constraint
COMMENT ON CONSTRAINT "check_upgrade_rank_ids" ON "public"."shop_items" 
IS 'Ensures that upgrade ranks have both source and target ranks specified'; 