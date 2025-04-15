-- Create a transactions table that doesn't require user_id
-- This will store all transaction information regardless of user association
CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  transaction_id TEXT NOT NULL,
  amount DECIMAL(10, 2),
  currency TEXT,
  email TEXT,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  payment_status TEXT,
  metadata JSONB,
  items JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transactions_transaction_id ON transactions(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transactions_email ON transactions(email);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);

-- Create RLS policies for the transactions table
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role can do anything with transactions" ON transactions
FOR ALL TO service_role USING (true);

-- Allow authenticated users to view their own transactions
CREATE POLICY "Users can view their own transactions" ON transactions
FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Make a column update trigger for audit purposes
CREATE TRIGGER update_transactions_updated_at
BEFORE UPDATE ON transactions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 