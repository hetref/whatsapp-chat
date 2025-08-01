-- RLS Policy Fix for WhatsApp Chat Application
-- Run these commands in your Supabase SQL Editor

-- First, drop the existing restrictive policies
DROP POLICY IF EXISTS "Users can insert themselves" ON users;
DROP POLICY IF EXISTS "Users can update their own data" ON users;

-- Create more permissive policies that work with WhatsApp integration
-- Allow authenticated users to insert any user (needed for webhook to create WhatsApp contacts)
CREATE POLICY "Authenticated users can insert users" ON users
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to update any user (needed for last_active updates)
CREATE POLICY "Authenticated users can update users" ON users
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Alternative: If you want more security, you can create policies that allow
-- updates only for specific scenarios:

-- Option 2: More restrictive but functional policies
-- Uncomment these if you prefer more security:

/*
-- Allow users to update their own records OR allow system updates
CREATE POLICY "Users can update themselves or system updates" ON users
  FOR UPDATE USING (
    auth.uid()::text = id OR 
    auth.role() = 'authenticated'
  );

-- Allow users to insert themselves OR allow system to insert WhatsApp contacts
CREATE POLICY "Users can insert themselves or system inserts" ON users
  FOR INSERT WITH CHECK (
    auth.uid()::text = id OR 
    auth.role() = 'authenticated'
  );
*/

-- Verify the policies are working
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'users'; 