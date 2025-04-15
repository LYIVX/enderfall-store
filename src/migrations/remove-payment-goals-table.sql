-- Remove policies first to avoid foreign key constraint issues
DROP POLICY IF EXISTS "Payment goals are viewable by everyone" ON payment_goals;

-- Drop any triggers associated with the table
DROP TRIGGER IF EXISTS update_payment_goals_updated_at ON payment_goals;

-- Drop the table
DROP TABLE IF EXISTS payment_goals; 