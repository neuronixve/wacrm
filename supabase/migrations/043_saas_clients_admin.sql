-- Migration 043: SaaS Clients Admin Management
-- Adds status, payment tracking to accounts and sets superadmin role

ALTER TABLE public.accounts 
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'paid' CHECK (payment_status IN ('paid', 'pending', 'overdue', 'cancelled')),
  ADD COLUMN IF NOT EXISTS payment_notes text;

-- Update Sergio Jimenez to superadmin
UPDATE public.profiles 
SET role = 'superadmin' 
WHERE email = 'sergiovj@gmail.com';
