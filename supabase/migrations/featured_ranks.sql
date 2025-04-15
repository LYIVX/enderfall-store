-- Create the featured_ranks table to store admin-selected ranks
CREATE TABLE IF NOT EXISTS featured_ranks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rank_id UUID NOT NULL REFERENCES shop_items(id) ON DELETE CASCADE,
  display_order INT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically update the updated_at column
CREATE TRIGGER set_timestamp
BEFORE UPDATE ON featured_ranks
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

-- Create RLS policies
ALTER TABLE featured_ranks ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read featured ranks
CREATE POLICY "Featured ranks are viewable by everyone" 
ON featured_ranks FOR SELECT USING (true);

-- Only allow authenticated admins to insert/update/delete
CREATE POLICY "Admins can insert featured ranks" 
ON featured_ranks FOR INSERT 
TO authenticated 
WITH CHECK (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() AND profiles.is_admin = true
));

CREATE POLICY "Admins can update featured ranks" 
ON featured_ranks FOR UPDATE 
TO authenticated 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() AND profiles.is_admin = true
));

CREATE POLICY "Admins can delete featured ranks" 
ON featured_ranks FOR DELETE 
TO authenticated 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() AND profiles.is_admin = true
)); 