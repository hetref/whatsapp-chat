# WaChat - Enterprise WhatsApp Business Platform

<div align="center">

**A fully functional, production-ready WhatsApp Business integration platform built with Next.js 15, Supabase, WhatsApp Cloud API, and AWS S3.**

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react)](https://reactjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?style=flat-square&logo=typescript)](https://www.typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-3ecf8e?style=flat-square&logo=supabase)](https://supabase.com)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

[Features](#-complete-feature-list) • [Quick Start](#-quick-start) • [Documentation](#-documentation) • [Deployment](#-deployment)

</div>

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Complete Feature List](#-complete-feature-list)
- [Technology Stack](#-technology-stack)
- [Quick Start](#-quick-start)
- [Setup Guide](#-complete-setup-guide)
- [Features Documentation](#-features-documentation)
- [API Reference](#-api-reference)
- [Deployment](#-deployment)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)

---

## 🎯 Overview

**WaChat** is an enterprise-grade WhatsApp Business integration platform that enables businesses to manage customer conversations through a modern, intuitive web interface. It provides everything you need for professional WhatsApp messaging: real-time chat, media handling, template management, broadcast groups, and more.

### Why WaChat?

✨ **Production Ready** - Built for scale with enterprise-grade architecture  
🚀 **Real-time Everything** - Instant message delivery using WebSockets  
📱 **Full WhatsApp Integration** - Complete WhatsApp Cloud API support  
🎨 **Beautiful UI** - WhatsApp-like interface with dark mode  
🔒 **Secure by Default** - Row-level security and encrypted storage  
⚡ **Lightning Fast** - Optimized for performance  

---

## ✨ Complete Feature List

### 💬 **Core Messaging**

#### Real-time Messaging
- ✅ **Bidirectional Chat** - Send and receive messages instantly
- ✅ **Text Messages** - Full support with emoji and formatting
- ✅ **Message Status** - Read/unread status with timestamps
- ✅ **Unread Indicators** - Visual badges and separators
- ✅ **Auto-scroll** - Jump to unread messages automatically
- ✅ **Optimistic UI** - Instant message display before server confirmation
- ✅ **Real-time Sync** - WebSocket-based instant updates

#### Media Messages
- ✅ **Image Messages** - JPG, PNG, WebP, GIF support with captions
- ✅ **Video Messages** - MP4, MOV, AVI with native HTML5 player
- ✅ **Audio Messages** - MP3, AAC, voice messages with waveform
- ✅ **Document Messages** - PDF, DOC, XLS, PPT with download
- ✅ **Drag & Drop Upload** - Intuitive file upload
- ✅ **Multi-file Upload** - Send multiple files simultaneously
- ✅ **Media Preview** - Preview before sending
- ✅ **Download Support** - Download any media file

---

### 📢 **Broadcast Groups** 🆕

#### Group Management
- ✅ **Create Broadcast Groups** - Organize contacts into groups
- ✅ **Group Naming** - Custom names for easy identification
- ✅ **Member Management** - Add/remove members easily
- ✅ **Member Count** - See group size at a glance
- ✅ **Edit Groups** - Update group details anytime
- ✅ **Delete Groups** - Remove groups when no longer needed
- ✅ **Group Search** - Filter contacts by group names

#### Broadcasting Features
- ✅ **Text Broadcasts** - Send text to all members simultaneously
- ✅ **Template Broadcasts** - Send template messages to groups
- ✅ **Personal Delivery** - Each member receives as individual message
- ✅ **Broadcast History** - View all broadcast messages in chat window
- ✅ **Real-time Broadcast** - Messages appear instantly in broadcast window
- ✅ **Individual Tracking** - See messages in each member's chat
- ✅ **Unread Counts** - Per-member unread message tracking
- ✅ **Broadcast Status** - Success/failure tracking for each recipient

#### Smart Notifications
- ✅ **Group Unread Badge** - Shows total unread from all members
- ✅ **Member Unread Count** - Individual unread count per member
- ✅ **Quick Navigation** - Click member to open their individual chat
- ✅ **Latest Message Preview** - See last broadcast in user list

---

### 📋 **Template Management System**

#### Template Creation
- ✅ **Visual Builder** - Create templates with real-time preview
- ✅ **Multi-language** - 14+ languages (English, Spanish, French, German, Arabic, Hindi, Chinese, etc.)
- ✅ **Template Components** - Header, Body, Footer, Buttons
- ✅ **Dynamic Variables** - Use {{1}}, {{2}}, etc. for personalization
- ✅ **Button Types** - Quick Reply, URL, Phone Number, Catalog
- ✅ **Media Headers** - Image, video, document headers
- ✅ **Rich Formatting** - Bold, italic, emojis support

#### Template Features
- ✅ **Template Library** - Browse and search all templates
- ✅ **Template Categories** - Marketing, Utility, Authentication
- ✅ **Status Tracking** - Monitor approval status (Pending, Approved, Rejected)
- ✅ **Template Sending** - Send from chat with variable filling
- ✅ **Broadcast Templates** - Send templates to broadcast groups
- ✅ **Template Preview** - See how it looks before sending
- ✅ **Template Deletion** - Remove unwanted templates
- ✅ **Variable Validation** - Ensure all variables are filled

---

### 🗄️ **Media & Cloud Storage**

#### AWS S3 Integration
- ✅ **Persistent Storage** - All media stored permanently in S3
- ✅ **Pre-signed URLs** - Secure, time-limited access (24-hour expiry)
- ✅ **Automatic Refresh** - Expired URLs refresh automatically
- ✅ **Organized Structure** - Media organized by sender
- ✅ **Encryption** - Data encrypted at rest
- ✅ **HTTPS Only** - Secure access only

#### Media Handling
- ✅ **Smart Caching** - Efficient media loading
- ✅ **Image Optimization** - Next.js automatic optimization
- ✅ **Lazy Loading** - Load media on demand
- ✅ **Thumbnail Generation** - Smaller previews for lists
- ✅ **Video Preload** - Metadata only until play
- ✅ **Audio Management** - Single audio plays at a time
- ✅ **Download Manager** - Efficient file downloads

---

### 👤 **User Management**

#### Contact Management
- ✅ **Custom Names** - Set custom names for contacts
- ✅ **Name Hierarchy** - Custom Name → WhatsApp Name → Phone Number
- ✅ **Inline Editing** - Quick name editing with hover controls
- ✅ **User Info Dialog** - Comprehensive contact information
- ✅ **New Chat Creation** - Create chats with phone number validation
- ✅ **Last Active Tracking** - Monitor user activity
- ✅ **Smart Sorting** - Sort by unread and recent activity

#### Search & Filter
- ✅ **Contact Search** - Search names and phone numbers
- ✅ **Group Filtering** - Filter contacts by broadcast groups
- ✅ **Real-time Filter** - Instant search results
- ✅ **Fuzzy Search** - Find contacts even with typos

---

### 🎨 **UI/UX Excellence**

#### Design Features
- ✅ **WhatsApp-like Interface** - Familiar chat bubble design
- ✅ **Theme Switcher** - Light, Dark, System themes
- ✅ **Responsive Design** - Mobile-first with desktop optimization
- ✅ **Smooth Animations** - Fade-in, slide-up, scale effects
- ✅ **Loading States** - Professional loading indicators
- ✅ **Error Handling** - Graceful error messages
- ✅ **Touch Gestures** - Mobile-optimized interactions
- ✅ **Keyboard Shortcuts** - ESC to close dialogs

#### User Experience
- ✅ **Auto-scroll** - Smart scroll to unread or latest
- ✅ **Message Grouping** - Group by date with separators
- ✅ **Typing Indicators** - Show when typing (future)
- ✅ **Read Receipts** - Visual read status
- ✅ **Time Formatting** - Smart time display (Today, Yesterday, etc.)
- ✅ **Unread Separator** - Red line showing unread messages
- ✅ **Badges** - Green badges for unread counts

---

### 🔐 **Security & Authentication**

#### Authentication
- ✅ **Supabase Auth** - Secure user authentication
- ✅ **Email/Password** - Traditional login
- ✅ **Password Reset** - Forgot password flow
- ✅ **Protected Routes** - Middleware-based protection
- ✅ **Session Management** - Automatic session refresh
- ✅ **Secure Cookies** - HttpOnly, Secure cookies

#### Database Security
- ✅ **Row Level Security (RLS)** - Database-level access control
- ✅ **User Isolation** - Users can only see their data
- ✅ **SQL Injection Prevention** - Parameterized queries
- ✅ **Function Security** - SECURITY DEFINER functions
- ✅ **API Authentication** - All routes require valid session

#### Data Protection
- ✅ **Input Validation** - XSS prevention and sanitization
- ✅ **Phone Validation** - E.164 format validation
- ✅ **File Type Validation** - WhatsApp-supported types only
- ✅ **File Size Limits** - Prevent oversized uploads
- ✅ **CORS Configuration** - Restricted origins
- ✅ **Rate Limiting** - Prevent abuse

---

### ⚡ **Performance Optimizations**

#### Database Optimizations
- ✅ **Strategic Indexes** - Optimized query performance
- ✅ **Database Views** - Pre-computed complex queries
- ✅ **Database Functions** - Atomic operations
- ✅ **Full Replication** - Real-time enabled tables
- ✅ **Connection Pooling** - Efficient connections

#### Application Optimizations
- ✅ **Smart Preloading** - Load users first, then conversations
- ✅ **Parallel Processing** - Multiple operations simultaneously
- ✅ **Debounced Updates** - Prevent excessive re-renders
- ✅ **Code Splitting** - Dynamic imports for heavy components
- ✅ **Memory Management** - Proper cleanup and subscriptions

#### Real-time Performance
- ✅ **WebSocket Connections** - Persistent connections
- ✅ **Channel Management** - Unique channels per conversation
- ✅ **Duplicate Prevention** - Smart message deduplication
- ✅ **Subscription Cleanup** - Prevent memory leaks
- ✅ **Optimistic Updates** - Instant UI feedback

---

## 🛠️ Technology Stack

### Frontend
```
Framework:      Next.js 15 with App Router
UI Library:     React 19
Language:       TypeScript 5
Styling:        Tailwind CSS 3
Icons:          Lucide React
Components:     Shadcn/ui
State:          React Hooks
```

### Backend
```
API:            Next.js API Routes
Database:       PostgreSQL (Supabase)
Real-time:      Supabase Real-time (WebSocket)
Storage:        AWS S3
Authentication: Supabase Auth
Functions:      PostgreSQL Functions
```

### Integrations
```
WhatsApp:       Meta WhatsApp Cloud API (v23.0)
Cloud Storage:  AWS SDK v3
Image Optimize: Next.js Image Component
```

### Development
```
Package Manager: npm
Version Control: Git
Deployment:      Vercel (recommended)
```

---

## 🚀 Quick Start

### Prerequisites

Before you begin, ensure you have:

- **Node.js** 18+ installed ([Download](https://nodejs.org/))
- **npm** or **yarn** package manager
- **Supabase Account** ([Sign up](https://supabase.com))
- **Meta Business Account** ([Sign up](https://business.facebook.com/))
- **WhatsApp Business API** access
- **AWS Account** for S3 storage ([Sign up](https://aws.amazon.com/))

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd wachat

# Install dependencies
npm install

# Create environment file
cp .env.example .env.local

# Edit .env.local with your credentials
nano .env.local

# Run database migrations (see Setup Guide)
# Then start development server
npm run dev
```

Visit `http://localhost:3000` - you're ready to go! 🎉

---

## 📚 Complete Setup Guide

### Step 1: Database Setup (Supabase)

#### 1.1 Create Supabase Project

1. Go to [database.new](https://database.new)
2. Create a new project
3. Save your database password securely
4. Note your Project URL and Anon Key

#### 1.2 Run Database Migrations

Execute the following SQL in Supabase SQL Editor:

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

-- Enable real-time for tables
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
-- DATABASE FUNCTIONS
-- ============================================

-- Function: Update custom names
CREATE OR REPLACE FUNCTION update_user_custom_name(user_id TEXT, new_custom_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE users 
  SET custom_name = new_custom_name
  WHERE id = user_id;
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Mark messages as read
CREATE OR REPLACE FUNCTION mark_messages_as_read(current_user_id TEXT, other_user_id TEXT)
RETURNS INTEGER AS $$
DECLARE
  affected_rows INTEGER;
BEGIN
  UPDATE messages
  SET is_read = TRUE, read_at = NOW()
  WHERE receiver_id = current_user_id
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

-- Function: Get group unread count
CREATE OR REPLACE FUNCTION get_group_unread_count(p_group_id UUID)
RETURNS BIGINT AS $$
DECLARE
  total_unread BIGINT;
BEGIN
  SELECT COALESCE(SUM(
    (SELECT COUNT(*) 
     FROM messages m 
     WHERE m.sender_id = gm.user_id 
     AND m.receiver_id = (SELECT owner_id FROM chat_groups WHERE id = p_group_id)
     AND m.is_read = false
    )
  ), 0)
  INTO total_unread
  FROM group_members gm
  WHERE gm.group_id = p_group_id;
  
  RETURN total_unread;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Auto-update timestamp
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
-- USER CONVERSATIONS VIEW
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

#### 1.3 Enable Real-time Replication

1. Go to **Database** → **Replication** in Supabase dashboard
2. Enable replication for: `users`, `messages`, `chat_groups`, `group_members`

### Step 2: WhatsApp Cloud API Setup

#### 2.1 Create Meta App

1. Go to [Meta Developers](https://developers.facebook.com/)
2. Click **Create App** → Choose **Business** type
3. Add **WhatsApp** product to your app

#### 2.2 Get Your Credentials

You'll need these credentials from Meta Business Suite:

1. **Access Token** (Permanent Token)
   - Go to Meta Developers → Your App → WhatsApp → API Setup
   - Click **Generate Access Token**
   - Make it **permanent** (not test token)
   - Copy and save securely

2. **Phone Number ID**
   - In the same API Setup page
   - Under your test/production phone number
   - Copy the numeric Phone Number ID

3. **Business Account ID**
   - Go to Meta Business Suite → Settings → Business Info
   - Copy your Business Account ID
   - OR check the URL in Developers Console: it contains your Business Account ID

4. **Verify Token** (You Create This)
   - Create a secure random string (e.g., `my-secure-webhook-token-2024`)
   - You'll use this when setting up the webhook

#### 2.3 Configure Credentials in App

**🎯 NEW: User-Specific Configuration**

Instead of using environment variables, each user configures their own WhatsApp credentials through the app:

1. **After deployment**, sign up / log in to your app
2. Navigate to **Setup** (`/protected/setup`) - you'll be redirected automatically
3. Fill in the **Access Token Configuration** form:
   - ✅ **Access Token** - Paste your permanent token from Meta
   - ✅ **Phone Number ID** - Paste your Phone Number ID
   - ✅ **Business Account ID** - Paste your Business Account ID
   - ✅ **API Version** - Default: `v23.0` (leave as is unless you need specific version)
4. Click **Save Access Token**

5. Fill in the **Webhook Configuration** form:
   - ✅ **Verify Token** - Enter your custom secure token
   - ✅ Copy the automatically generated **Webhook URL** (unique to you)
6. Click **Save Webhook Configuration**

**Benefits of this approach:**
- ✨ Multi-tenant: Multiple users can use different WhatsApp Business accounts
- 🔒 Secure: Each user's credentials are isolated in the database
- 🚀 Easy: No need to redeploy when changing credentials
- 👥 Scalable: Support multiple businesses from one deployment

#### 2.4 Configure Webhook in Meta

1. Go to Meta Developers → Your App → WhatsApp → Configuration
2. Click **Edit** on Webhook
3. **Callback URL**: Use the unique webhook URL from your setup page
   - Format: `https://your-domain.com/api/webhook/[your-unique-token]`
4. **Verify Token**: Enter the verify token you created in step 2.3
5. Subscribe to **messages** field
6. Click **Verify and Save**
7. Return to your app - webhook should show as "✓ Verified"

### Step 3: AWS S3 Setup

#### 3.1 Create S3 Bucket

```bash
aws s3 mb s3://wachat-media-bucket --region us-east-1
```

Or via AWS Console:
1. Go to AWS S3 Console
2. Create bucket with unique name
3. **Block all public access** ✅
4. Create bucket

#### 3.2 Create IAM User

Create user with this policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::wachat-media-bucket/*"
    }
  ]
}
```

Save **Access Key ID** and **Secret Access Key**.

### Step 4: Environment Variables

Create `.env.local` in project root:

```bash
# ============================================
# SUPABASE CONFIGURATION
# ============================================
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY=your_supabase_anon_key

# Supabase Service Role Key (CRITICAL for webhooks)
# This bypasses Row Level Security for webhook operations
# Get it from: Supabase Dashboard → Settings → API → service_role key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# ============================================
# AWS S3 CONFIGURATION
# ============================================
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_REGION=us-east-1
AWS_BUCKET_NAME=wachat-media-bucket

# ============================================
# WHATSAPP CONFIGURATION (Optional - Legacy)
# ============================================
# NOTE: WhatsApp credentials are now configured per-user through the UI
# You can optionally keep these for backward compatibility, but they're not required
# The app will use user-specific credentials from the database
```

**🔑 Important:** The `SUPABASE_SERVICE_ROLE_KEY` is **required** for webhooks to work. This key allows the webhook endpoint to bypass Row Level Security (RLS) since webhook requests come from WhatsApp (external source) without user authentication.

**Where to find it:**
1. Go to Supabase Dashboard
2. Click **Settings** → **API**
3. Under **Project API keys**, copy the **`service_role` secret** key
4. ⚠️ **Never expose this key** to client-side code - it has admin privileges!

### Step 5: Run Application

```bash
# Development mode
npm run dev

# Production build
npm run build
npm start
```

Visit `http://localhost:3000` 🎉

---

## 📖 Features Documentation

### ⚙️ Initial Setup (Multi-Tenant)

**First Time Setup:**

After deploying the application and creating your account, you'll be automatically redirected to the setup page (`/protected/setup`).

**Setup Page Features:**

1. **Access Token Configuration** (Required for sending messages)
   - 🔑 Access Token - Your permanent WhatsApp Business API token
   - 📱 Phone Number ID - Your WhatsApp Business phone number ID
   - 🏢 Business Account ID - For template management
   - 🔢 API Version - WhatsApp API version (default: v23.0)

2. **Webhook Configuration** (Required for receiving messages)
   - 🔐 Verify Token - Your custom security token
   - 🔗 Webhook URL - Automatically generated unique URL for you
   
**Multi-User Support:**

- Each user gets their own WhatsApp Business configuration
- Users can manage different businesses independently
- Credentials are securely stored in the database
- No need to redeploy when changing credentials
- Full data isolation between users

**After Setup:**

- ✅ Access token configured → You can send messages and templates
- ✅ Webhook configured & verified → You can receive messages
- 🎉 Both configured → Full bidirectional chat functionality

### 🚀 Real-time Messaging

WaChat uses Supabase real-time subscriptions for instant message delivery:

**How it works:**
- WebSocket connections for instant updates
- Unique channels per conversation
- Sub-second message delivery
- Smart duplicate prevention
- Optimistic UI updates

### 📢 Broadcast Groups

**Creating a Broadcast Group:**

1. Click **Users** icon in chat header
2. Click **Create broadcast group**
3. Enter group name and description
4. Select members from contact list
5. Click **Create Group**

**Sending Broadcasts:**

1. Click **Broadcast** on a group
2. Type message or select template
3. Click **Send**
4. Message delivered to all members individually

**Key Benefits:**
- Each member receives as personal message
- Track individual read status
- See messages in each member's chat
- Real-time broadcast window

### 📋 Template Management

**Creating Templates:**

1. Navigate to **Templates**
2. Click **Create Template**
3. Fill template details:
   - Name (lowercase, underscores only)
   - Category (MARKETING, UTILITY, AUTHENTICATION)
   - Language
4. Add components:
   - Header (optional): Text or media
   - Body (required): Main message with variables
   - Footer (optional): Small text
   - Buttons (optional): Quick Reply, URL, Phone
5. Use `{{1}}`, `{{2}}` for dynamic content
6. Submit for Meta approval

**Sending Templates:**

1. Click template icon (💬) in chat
2. Select approved template
3. Fill variable values
4. Preview and send

### 🗄️ Media Messages

**Supported Types:**

- **Images**: JPG, PNG, WebP, GIF (max 5MB)
- **Videos**: MP4, MOV, AVI (max 16MB)
- **Audio**: MP3, AAC, voice messages (max 16MB)
- **Documents**: PDF, DOC, XLS, PPT (max 100MB)

**Upload Methods:**

- Drag & drop files into chat window
- Click attachment icon (📎)
- Multi-file selection supported

### 👤 User Management

**Custom Names:**

Display Priority:
1. Custom Name (user-set) ⭐
2. WhatsApp Name (from profile)
3. Phone Number (fallback)

**Edit Methods:**
- Hover over user → Click edit icon
- Click chat header → User info dialog → Edit name

**Create New Chat:**

1. Click **+** button
2. Enter phone number: `+1234567890` (E.164 format)
3. Optional: Add custom name
4. Click **Create Chat**

---

## 🔌 API Reference

### Authentication

All API routes require authentication via Supabase session.

### Message APIs

#### `POST /api/send-message`
Send text message.

```typescript
Request:
{
  "to": "+1234567890",
  "message": "Hello!"
}

Response:
{
  "success": true,
  "messageId": "wamid.123..."
}
```

#### `POST /api/send-media`
Upload and send media.

```typescript
FormData:
  to: string
  files: File[]
  captions: string[]

Response:
{
  "success": true,
  "successCount": 2,
  "failureCount": 0
}
```

#### `POST /api/send-template`
Send template message.

```typescript
Request:
{
  "to": "+1234567890",
  "templateName": "order_confirmation",
  "templateData": { ... },
  "variables": {
    "header": { "1": "John" },
    "body": { "1": "12345" }
  }
}
```

### Broadcast APIs

#### `POST /api/groups`
Create broadcast group.

```typescript
Request:
{
  "name": "Marketing Team",
  "description": "All marketing contacts",
  "memberIds": ["+1234567890", "+9876543210"]
}
```

#### `GET /api/groups`
Get all user's broadcast groups.

#### `POST /api/groups/[id]/broadcast`
Send broadcast message.

```typescript
Request:
{
  "message": "Hello team!",
  "messageType": "text"
}
```

### Template APIs

#### `GET /api/templates`
Fetch all templates.

#### `POST /api/templates/create`
Create new template.

#### `DELETE /api/templates/delete`
Delete template.

### User APIs

#### `POST /api/users/update-name`
Update custom name.

#### `POST /api/users/create-chat`
Create new chat.

---

## 🚀 Deployment

### Vercel Deployment (Recommended)

**Step-by-step:**

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Deploy on Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Import GitHub repository
   - Add environment variables
   - Deploy!

3. **Update Webhook**
   - Update WhatsApp webhook URL to:
   - `https://your-app.vercel.app/api/webhook/YOUR_TOKEN`

### Environment Variables Checklist

**Required for Deployment:**

- ✅ `NEXT_PUBLIC_SUPABASE_URL`
- ✅ `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY`
- ✅ `SUPABASE_SERVICE_ROLE_KEY` 🔑 **Critical for webhooks**
- ✅ `AWS_ACCESS_KEY_ID`
- ✅ `AWS_SECRET_ACCESS_KEY`
- ✅ `AWS_REGION`
- ✅ `AWS_BUCKET_NAME`

**Not Required (Configured Through UI):**

- ❌ ~~`WHATSAPP_TOKEN`~~ - Now set per-user in `/protected/setup`
- ❌ ~~`WHATSAPP_PHONE_NUMBER_ID`~~ - Now set per-user in `/protected/setup`
- ❌ ~~`WHATSAPP_BUSINESS_ACCOUNT_ID`~~ - Now set per-user in `/protected/setup`
- ❌ ~~`WHATSAPP_API_VERSION`~~ - Now set per-user in `/protected/setup`
- ❌ ~~`WHATSAPP_VERIFY_TOKEN`~~ - Now set per-user in `/protected/setup`

---

## 🐛 Troubleshooting

### Common Issues

#### "No user found for phone_number_id" in Webhook Logs

**Problem:** Webhook receives messages but can't find user settings in database.

**Root Cause:** Row Level Security (RLS) blocking webhook queries.

**Solution:**
1. **Check `SUPABASE_SERVICE_ROLE_KEY` is set** in environment variables
2. Get it from: Supabase Dashboard → Settings → API → `service_role` key
3. Add to `.env.local` or deployment environment variables
4. Restart your application after adding the key

**Why this happens:**
- Webhooks come from WhatsApp (external source, no user auth)
- Regular Supabase client requires authentication
- RLS policies block unauthenticated queries
- Service role key bypasses RLS for webhook operations

#### Webhook Not Working
**Solution:**
1. Verify webhook URL is publicly accessible (test in browser)
2. Check verify token matches between app and Meta settings
3. Confirm subscribed to "messages" field in Meta webhook settings
4. Check `SUPABASE_SERVICE_ROLE_KEY` is set (see above)
5. Review webhook logs in your deployment platform
6. Test with Meta's webhook test button

#### Messages Not Sending
**Solution:**
1. **Complete Setup:** Go to `/protected/setup` and configure credentials
2. Verify access token is **permanent** (not test token - expires in 24h)
3. Check phone number ID is correct (numeric ID from Meta)
4. Check business account ID is correct
5. Ensure recipient has WhatsApp account
6. Review API version compatibility (default v23.0 works)

#### Real-time Not Working
**Solution:**
1. Enable real-time in Supabase dashboard
2. Check replication is enabled for tables
3. Verify WebSocket connections in browser console
4. Review Supabase real-time logs

#### Images Not Loading
**Solution:**
1. Verify S3 bucket configuration
2. Check `next.config.ts` has S3 hostname in `remotePatterns`
3. Confirm pre-signed URLs not expired (24-hour expiry)
4. Test bucket permissions with IAM user
5. Check AWS credentials are correct in environment variables

#### Templates Not Loading
**Solution:**
1. **Complete Setup:** Ensure Business Account ID is configured in `/protected/setup`
2. Check business account ID matches your Meta Business Suite
3. Verify access token has template permissions
4. Check templates exist in Meta Business Manager
5. Review template status (must be APPROVED to send)

#### Can't Access Chat After Signup
**Solution:**
1. You need to complete setup first
2. Navigate to `/protected/setup`
3. Configure at least one: Access Token **OR** Webhook
4. After saving, you'll be able to access the chat interface

---

## 🤝 Contributing

We welcome contributions! Here's how:

### Reporting Bugs

1. Check existing issues
2. Create detailed bug report
3. Include reproduction steps
4. Add screenshots
5. Specify environment

### Code Contributions

1. Fork repository
2. Create feature branch
3. Make changes
4. Add tests
5. Update documentation
6. Submit pull request

### Code Standards

- Follow TypeScript best practices
- Use ESLint configuration
- Write meaningful commits
- Add comments for complex logic
- Update README when needed

---

## 📄 License

This project is licensed under the MIT License.

---

## 🙏 Acknowledgments

### Technologies
- [Next.js](https://nextjs.org) - React Framework
- [Supabase](https://supabase.com) - Backend Platform
- [Tailwind CSS](https://tailwindcss.com) - Styling
- [Lucide Icons](https://lucide.dev) - Icons
- [Shadcn/ui](https://ui.shadcn.com) - Components

### APIs & Services
- [Meta WhatsApp Cloud API](https://developers.facebook.com/docs/whatsapp)
- [AWS S3](https://aws.amazon.com/s3/)
- [Vercel](https://vercel.com)

---

## 📞 Support

### Getting Help

1. **Documentation**: Read this README
2. **Issues**: Check existing issues
3. **Discussions**: GitHub Discussions
4. **Email**: wachat@aryanshinde.in

---

<div align="center">

## 🎉 Ready to Chat!

**WaChat** is production-ready and waiting for your customers.

**Start messaging now!** 💬✨

---

**Built with ❤️ using Next.js, Supabase, and WhatsApp Cloud API**

[Get Started](#-quick-start) • [View Features](#-complete-feature-list) • [Read Docs](#-documentation)

</div>
