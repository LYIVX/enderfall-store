-- Create the trigger_set_updated_at function if it doesn't exist
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a categories table for rank categories
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  icon TEXT,
  display_order INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add comment to the table
COMMENT ON TABLE categories IS 'Stores categories for shop items like ranks';

-- Create a trigger to automatically update the updated_at column
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON categories
FOR EACH ROW
EXECUTE FUNCTION trigger_set_updated_at();

-- Seed with default categories
INSERT INTO categories (name, icon, display_order) VALUES
('Serverwide Ranks', 'FaCrown', 0),
('Serverwide Upgrades', 'FaUser', 1),
('Towny Ranks', 'FaCity', 2),
('Towny Upgrades', 'FaUser', 3),
('Beta Access', 'FaCode', 4),
('Cosmetics', 'FaMagic', 5),
('Perks', 'FaStar', 6),
('Bundles', 'FaBox', 7);

-- Create RLS policies
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Allow authenticated admins to read, insert, update and delete
CREATE POLICY "Allow admins full access to categories" ON categories
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- Allow all authenticated users to read categories
CREATE POLICY "Allow authenticated users to read categories" ON categories
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow anonymous users to read categories
CREATE POLICY "Allow anonymous to read categories" ON categories
  FOR SELECT
  TO anon
  USING (true); 