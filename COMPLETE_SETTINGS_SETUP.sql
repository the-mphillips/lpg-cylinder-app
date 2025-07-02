-- Complete App Settings Setup for LPG Cylinder Reports System
-- This script populates all missing settings for proper report generation

-- Insert/Update Report Configuration Settings
INSERT INTO app_settings (category, key, value, description, is_public, is_active) VALUES
-- Test Station Information
('reports', 'test_station_number', '"871"', 'Test station number for reports', true, true),
('reports', 'test_station_text', '"SAI GLOBAL APPROVED TEST STATION NO. 871"', 'Test station description text', true, true),

-- Company Information
('reports', 'company_abn', '"64 246 540 757"', 'Company ABN for reports', true, true),
('reports', 'company_phone', '"1300 292 427"', 'Company phone for reports', true, true),
('reports', 'company_email', '"ACCOUNTS@BWAVIC.COM.AU"', 'Company email for reports', true, true),
('reports', 'company_address_line1', '"PO BOX 210,"', 'Company address line 1', true, true),
('reports', 'company_address_line2', '"BUNYIP VIC 3815"', 'Company address line 2', true, true),

-- Report Assets (these will be updated via upload system)
('reports', 'logo_url', '""', 'Report header logo URL', true, true),
('reports', 'mark_url', '""', 'Report certification mark URL', true, true),

-- Branding Settings (if missing)
('branding', 'logo_light_url', '""', 'Light theme logo URL', true, true),
('branding', 'logo_dark_url', '""', 'Dark theme logo URL', true, true),
('branding', 'favicon_url', '""', 'Favicon URL', true, true),
('branding', 'primary_color', '"#1f2937"', 'Primary brand color', true, true),
('branding', 'secondary_color', '"#f59e0b"', 'Secondary brand color', true, true),

-- Company Branding Information
('branding', 'company_name', '"BWA (VIC) PTY LTD"', 'Company name for branding', true, true),
('branding', 'company_tagline', '"Gas Cylinder Testing Specialists"', 'Company tagline', true, true),
('branding', 'support_email', '"support@bwavic.com.au"', 'Support email address', true, true),
('branding', 'support_phone', '"1300 292 427"', 'Support phone number', true, true),

-- Email Configuration (if missing)
('email', 'smtp_host', '""', 'SMTP server hostname', false, true),
('email', 'smtp_port', '587', 'SMTP server port', false, true),
('email', 'smtp_username', '""', 'SMTP username', false, true),
('email', 'smtp_password', '""', 'SMTP password (encrypted)', false, true),
('email', 'from_email', '"noreply@bwavic.com.au"', 'From email address', false, true),
('email', 'from_name', '"BWA GAS Reports System"', 'From name', false, true),
('email', 'reply_to_email', '"support@bwavic.com.au"', 'Reply-to email address', false, true),
('email', 'email_signature', '"Best regards,\nBWA GAS Team\n\nPO BOX 210, BUNYIP VIC 3815\nPhone: 1300 292 427\nEmail: accounts@bwavic.com.au"', 'Email signature', false, true),
('email', 'use_tls', 'true', 'Use TLS encryption', false, true),
('email', 'use_ssl', 'false', 'Use SSL encryption', false, true),
('email', 'is_enabled', 'true', 'Enable email functionality', false, true),
('email', 'subject_prefix', '"[BWA GAS] "', 'Email subject prefix', false, true)

ON CONFLICT (category, key) DO UPDATE SET 
  value = EXCLUDED.value, 
  description = EXCLUDED.description, 
  updated_at = NOW();

-- Verify the settings were created
SELECT 
  category,
  key,
  value,
  description,
  is_public,
  is_active,
  created_at
FROM app_settings 
WHERE category IN ('reports', 'branding', 'email')
ORDER BY category, key; 