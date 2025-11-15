# WaChat Database Setup (Supabase)

This file contains SQL you can run in the Supabase SQL Editor to create the database schema, indexes, RLS policies, helper functions, and views required by the application.

The content below includes only objects that are actually used by the codebase (no unused tables or functions).

> **Important:** Run this in a new project or a project where these tables do not already exist, or adjust as needed for your environment.

```sql
-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  custom_name TEXT DEFAULT NULL,
  whatsapp_name TEXT DEFAULT NULL,
  last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- MESSAGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  sender_id TEXT NOT NULL,
  receiver_id TEXT NOT NULL,
  content TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_sent_by_me BOOLEAN DEFAULT FALSE,
  message_type TEXT DEFAULT 'text',
  media_data JSONB,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  FOREIGN KEY (sender_id) REFERENCES users(id),
  FOREIGN KEY (receiver_id) REFERENCES users(id)
);

-- ============================================
-- BROADCAST GROUPS TABLES
-- ============================================
CREATE TABLE IF NOT EXISTS chat_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES chat_groups(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

-- ============================================
-- USER SETTINGS TABLE (Multi-Tenant Support)
-- ============================================
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT,
  phone_number_id TEXT,
  business_account_id TEXT,
  verify_token TEXT,
  webhook_token TEXT UNIQUE,
  api_version TEXT DEFAULT 'v23.0',
  webhook_verified BOOLEAN DEFAULT FALSE,
  access_token_added BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON messages(is_read);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(sender_id, receiver_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_messages_media_data ON messages USING GIN (media_data);
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_groups_owner_id ON chat_groups(owner_id);
CREATE INDEX IF NOT EXISTS idx_user_settings_phone_number_id ON user_settings(phone_number_id);
CREATE INDEX IF NOT EXISTS idx_user_settings_webhook_token ON user_settings(webhook_token);
CREATE INDEX IF NOT EXISTS idx_user_settings_business_account_id ON user_settings(business_account_id);

-- ============================================
-- ENABLE REAL-TIME REPLICATION
-- ============================================
ALTER TABLE users REPLICA IDENTITY FULL;
ALTER TABLE messages REPLICA IDENTITY FULL;
ALTER TABLE chat_groups REPLICA IDENTITY FULL;
ALTER TABLE group_members REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE users;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_groups;
ALTER PUBLICATION supabase_realtime ADD TABLE group_members;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Users can view all users" ON users
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert users" ON users
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update users" ON users
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Messages table policies
CREATE POLICY "Users can view all messages" ON messages
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can send messages" ON messages
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update messages" ON messages
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Broadcast groups policies
CREATE POLICY "Users can view their own groups" ON chat_groups
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can create groups" ON chat_groups
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own groups" ON chat_groups
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own groups" ON chat_groups
  FOR DELETE USING (auth.uid() = owner_id);

-- Group members policies
CREATE POLICY "Users can view members of their groups" ON group_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM chat_groups
      WHERE chat_groups.id = group_members.group_id
      AND chat_groups.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can add members to their groups" ON group_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_groups
      WHERE chat_groups.id = group_members.group_id
      AND chat_groups.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can remove members from their groups" ON group_members
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM chat_groups
      WHERE chat_groups.id = group_members.group_id
      AND chat_groups.owner_id = auth.uid()
    )
  );

-- User settings policies
CREATE POLICY "Users can view own settings" ON user_settings
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own settings" ON user_settings
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own settings" ON user_settings
  FOR UPDATE USING (auth.uid() = id);

-- ============================================
-- DATABASE FUNCTIONS (RPC) USED BY THE APP
-- ============================================

-- Function: Mark messages as read
CREATE OR REPLACE FUNCTION mark_messages_as_read(other_user_id TEXT)
RETURNS INTEGER AS $$
DECLARE
  affected_rows INTEGER;
BEGIN
  UPDATE messages
  SET is_read = TRUE, read_at = NOW()
  WHERE receiver_id = (SELECT id FROM auth.users() LIMIT 1)
    AND sender_id = other_user_id
    AND is_read = FALSE;
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  RETURN affected_rows;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get conversation messages
CREATE OR REPLACE FUNCTION get_conversation_messages(other_user_id TEXT)
RETURNS TABLE (
  id TEXT,
  sender_id TEXT,
  receiver_id TEXT,
  content TEXT,
  message_timestamp TIMESTAMP WITH TIME ZONE,
  is_sent_by_me BOOLEAN,
  message_type TEXT,
  media_data JSONB,
  is_read BOOLEAN,
  read_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.sender_id,
    m.receiver_id,
    m.content,
    m.timestamp as message_timestamp,
    (m.sender_id = (SELECT id FROM auth.users() LIMIT 1)) as is_sent_by_me,
    m.message_type,
    m.media_data,
    m.is_read,
    m.read_at
  FROM messages m
  WHERE (m.sender_id = other_user_id OR m.receiver_id = other_user_id)
  ORDER BY m.timestamp ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get unread conversations
CREATE OR REPLACE FUNCTION get_unread_conversations(limit_count INTEGER DEFAULT 10)
RETURNS TABLE(
  conversation_id TEXT,
  display_name TEXT,
  unread_count BIGINT,
  last_message_time TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.sender_id as conversation_id,
    COALESCE(u.custom_name, u.whatsapp_name, u.name, u.id) as display_name,
    COUNT(*) as unread_count,
    MAX(m.timestamp) as last_message_time
  FROM messages m
  LEFT JOIN users u ON u.id = m.sender_id
  WHERE m.is_read = FALSE
  GROUP BY m.sender_id, u.custom_name, u.whatsapp_name, u.name, u.id
  ORDER BY last_message_time DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Create or get user
CREATE OR REPLACE FUNCTION create_or_get_user(phone_number TEXT, user_name TEXT DEFAULT NULL)
RETURNS TABLE(
  id TEXT,
  name TEXT,
  custom_name TEXT,
  whatsapp_name TEXT,
  last_active TIMESTAMP WITH TIME ZONE,
  is_new BOOLEAN
) AS $$
DECLARE
  user_exists BOOLEAN;
BEGIN
  SELECT EXISTS(SELECT 1 FROM users WHERE users.id = phone_number) INTO user_exists;
  IF NOT user_exists THEN
    INSERT INTO users (id, name, whatsapp_name, last_active)
    VALUES (phone_number, COALESCE(user_name, phone_number), user_name, NOW());
    RETURN QUERY
    SELECT users.id, users.name, users.custom_name, users.whatsapp_name, users.last_active, TRUE as is_new
    FROM users
    WHERE users.id = phone_number;
  ELSE
    IF user_name IS NOT NULL THEN
      UPDATE users
      SET whatsapp_name = user_name, last_active = NOW()
      WHERE users.id = phone_number;
    END IF;
    RETURN QUERY
    SELECT users.id, users.name, users.custom_name, users.whatsapp_name, users.last_active, FALSE as is_new
    FROM users
    WHERE users.id = phone_number;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get user groups with counts
CREATE OR REPLACE FUNCTION get_user_groups_with_counts()
RETURNS TABLE (
  group_id UUID,
  group_name TEXT,
  group_description TEXT,
  member_count BIGINT,
  unread_count BIGINT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cg.id AS group_id,
    cg.name AS group_name,
    cg.description AS group_description,
    COUNT(DISTINCT gm.id) AS member_count,
    COALESCE(SUM(
      (SELECT COUNT(*) 
       FROM messages m 
       WHERE m.sender_id = gm.user_id 
       AND m.receiver_id = (SELECT id FROM auth.users() LIMIT 1)
       AND m.is_read = false
      )
    ), 0) AS unread_count,
    cg.created_at,
    cg.updated_at
  FROM chat_groups cg
  LEFT JOIN group_members gm ON gm.group_id = cg.id
  WHERE cg.owner_id = auth.uid()
  GROUP BY cg.id, cg.name, cg.description, cg.created_at, cg.updated_at
  ORDER BY cg.updated_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get group members with details
CREATE OR REPLACE FUNCTION get_group_members_with_details(p_group_id UUID)
RETURNS TABLE (
  member_id UUID,
  user_id VARCHAR(255),
  whatsapp_name TEXT,
  custom_name TEXT,
  added_at TIMESTAMP WITH TIME ZONE,
  unread_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gm.id AS member_id,
    gm.user_id,
    COALESCE(u.whatsapp_name, u.name) AS whatsapp_name,
    u.custom_name,
    gm.added_at,
    COALESCE(
      (SELECT COUNT(*) 
       FROM messages m 
       WHERE m.sender_id = gm.user_id 
       AND m.receiver_id = (SELECT owner_id FROM chat_groups WHERE id = p_group_id)
       AND m.is_read = false
      ), 0
    ) AS unread_count
  FROM group_members gm
  LEFT JOIN users u ON u.id = gm.user_id
  WHERE gm.group_id = p_group_id
  ORDER BY NULLIF(u.custom_name, '') NULLS LAST, COALESCE(u.whatsapp_name, u.name);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_chat_groups_updated_at
  BEFORE UPDATE ON chat_groups
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- USER CONVERSATIONS VIEW (USED BY CHAT UI)
-- ============================================
CREATE OR REPLACE VIEW user_conversations AS
WITH unread_counts AS (
  SELECT 
    sender_id,
    COUNT(*) as unread_count
  FROM messages
  WHERE is_read = FALSE
  GROUP BY sender_id
),
latest_messages AS (
  SELECT DISTINCT ON (
    CASE 
      WHEN sender_id < receiver_id THEN sender_id || '-' || receiver_id
      ELSE receiver_id || '-' || sender_id
    END
  )
    sender_id,
    receiver_id,
    content,
    message_type,
    timestamp as last_message_time,
    sender_id as last_message_sender
  FROM messages
  ORDER BY 
    CASE 
      WHEN sender_id < receiver_id THEN sender_id || '-' || receiver_id
      ELSE receiver_id || '-' || sender_id
    END,
    timestamp DESC
)
SELECT DISTINCT
  u.id,
  COALESCE(u.custom_name, u.whatsapp_name, u.name, u.id) as display_name,
  u.custom_name,
  u.whatsapp_name,
  u.name as original_name,
  u.last_active,
  COALESCE(unread_counts.unread_count, 0) as unread_count,
  lm.content as last_message,
  lm.message_type as last_message_type,
  lm.last_message_time,
  lm.last_message_sender,
  CASE WHEN unread_counts.unread_count > 0 THEN 1 ELSE 0 END as has_unread
FROM users u
LEFT JOIN unread_counts ON u.id = unread_counts.sender_id
LEFT JOIN latest_messages lm ON u.id = lm.sender_id OR u.id = lm.receiver_id
ORDER BY has_unread DESC, last_message_time DESC NULLS LAST;
```
