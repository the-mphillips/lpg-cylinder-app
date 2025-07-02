/* Report Settings Setup for LPG Cylinder Reports System */

INSERT INTO app_settings (category, key, value, description, is_public, is_active) VALUES
('reports', 'test_station_number', '"871"', 'Test station number for reports', true, true),
('reports', 'test_station_text', '"SAI GLOBAL APPROVED TEST STATION NO. 871"', 'Test station description text', true, true),
('reports', 'company_abn', '"64 246 540 757"', 'Company ABN for reports', true, true),
('reports', 'company_phone', '"1300 292 427"', 'Company phone for reports', true, true),
('reports', 'company_email', '"ACCOUNTS@BWAVIC.COM.AU"', 'Company email for reports', true, true),
('reports', 'company_address_line1', '"PO BOX 210,"', 'Company address line 1', true, true),
('reports', 'company_address_line2', '"BUNYIP VIC 3815"', 'Company address line 2', true, true),
('reports', 'logo_url', '""', 'Report header logo URL', true, true),
('reports', 'mark_url', '""', 'Report certification mark URL', true, true)
ON CONFLICT (category, key) DO UPDATE SET 
  value = EXCLUDED.value, 
  description = EXCLUDED.description, 
  updated_at = NOW(); 