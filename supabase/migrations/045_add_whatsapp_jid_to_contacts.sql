-- Migration 045: Add whatsapp_jid to contacts for multi-device & LID mapping
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS whatsapp_jid TEXT;
CREATE INDEX IF NOT EXISTS idx_contacts_whatsapp_jid ON contacts (account_id, whatsapp_jid);

-- Re-link existing contact that was edited with real phone number
UPDATE contacts
SET whatsapp_jid = '51874816344264@lid'
WHERE id = '08580022-0af0-4770-b591-8a9d5570c292' OR phone = '584122791925';

-- Reassign orphaned messages from temporary duplicate conversation
-- to the primary conversation
UPDATE messages
SET conversation_id = '90c9ea85-9343-4bb1-a5c5-77c16ce0903b'
WHERE conversation_id = 'b26c20a7-68b6-475c-9c90-015ed3362e9c';

-- Update primary conversation with latest message details
UPDATE conversations
SET 
  last_message_text = 'Verga como que lo rompí',
  last_message_at = NOW(),
  updated_at = NOW()
WHERE id = '90c9ea85-9343-4bb1-a5c5-77c16ce0903b';

-- Delete duplicate conversation and duplicate contact
DELETE FROM conversations WHERE id = 'b26c20a7-68b6-475c-9c90-015ed3362e9c';
DELETE FROM contacts WHERE id = '700c61bd-f598-4cc2-b745-848a974b2a8b';
