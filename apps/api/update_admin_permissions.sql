-- Check current admin user
SELECT id, email, role, permissions FROM users WHERE email LIKE '%admin%' OR role = 'admin';
