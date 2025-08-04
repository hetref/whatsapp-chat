-- Template Message Type Support Migration
-- Run this in your Supabase SQL Editor to enable template message storage

-- Drop the existing check constraint
ALTER TABLE messages DROP CONSTRAINT IF EXISTS check_message_type;

-- Add the updated check constraint that includes 'template'
ALTER TABLE messages 
ADD CONSTRAINT check_message_type 
CHECK (message_type IN ('text', 'image', 'document', 'audio', 'video', 'sticker', 'template'));

-- Update the comment to reflect the new message type
COMMENT ON COLUMN messages.message_type IS 'Type of message: text, image, document, audio, video, sticker, template';

-- Verify the constraint was updated successfully
SELECT 
    conname AS constraint_name,
    consrc AS constraint_definition
FROM pg_constraint 
WHERE conname = 'check_message_type';

-- Show current table structure
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'messages' 
ORDER BY ordinal_position; 