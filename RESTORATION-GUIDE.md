# 🔄 Database Restoration Guide

This guide provides two options for restoring your LPG Cylinder Testing System data from your Supabase backup.

## 📋 **Prerequisites**

- New Supabase project created
- Backup file: `db_cluster-24-02-2025@04-16-37.backup`
- PostgreSQL client tools installed (psql or pgAdmin)
- Your new Supabase connection details

## 🎯 **Two Restoration Options**

### **Option 1: Direct Restoration (Quick & Simple)**
- Restore exact copy of your old database
- Keeps current schema and structure
- Fastest option, but misses modern improvements

### **Option 2: Modern Schema Migration (Recommended)**
- Upgraded database structure with modern improvements
- Better performance, security, and maintainability
- Requires additional migration step

---

## 🚀 **Option 1: Direct Restoration**

### **Step 1: Get Your Connection String**
From your new Supabase project:
1. Go to Settings → Database
2. Copy the connection string
3. Replace `[YOUR-PASSWORD]` with your database password

```
postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

### **Step 2: Restore Using pg_restore**

```bash
# Navigate to your backup directory
cd "C:\Users\MichaelPhillips\Downloads\db_cluster-24-02-2025@04-16-37.backup"

# Restore the backup
pg_restore --verbose --clean --no-acl --no-owner \
  -h db.[PROJECT-REF].supabase.co \
  -U postgres \
  -d postgres \
  -p 5432 \
  db_cluster-24-02-2025@04-16-37.backup
```

### **Step 3: Verify Restoration**
Connect to your database and check:

```sql
-- Check tables exist
\dt

-- Check data counts
SELECT 'users' as table_name, COUNT(*) FROM "user"
UNION ALL
SELECT 'reports', COUNT(*) FROM report
UNION ALL
SELECT 'customers', COUNT(*) FROM major_customer;
```

---

## ⭐ **Option 2: Modern Schema Migration (Recommended)**

This option upgrades your database with modern improvements while preserving all data.

### **Modern Schema Benefits:**
- ✅ **UUIDs instead of integer IDs** (better for distributed systems)
- ✅ **Enhanced security** with Row Level Security (RLS)
- ✅ **Better performance** with optimized indexes
- ✅ **JSONB for cylinder data** (flexible, queryable)
- ✅ **Enum types** for data validation
- ✅ **Proper foreign key relationships**
- ✅ **Automated timestamps** with triggers
- ✅ **Better audit trail** with structured logging

### **Step 1: Restore Original Data**
First, restore your backup using Option 1 above.

### **Step 2: Create Modern Schema**
Run the modern schema creation script:

```sql
-- Copy and paste the contents of database-migration.sql
-- into your Supabase SQL Editor or run via psql
\i database-migration.sql
```

### **Step 3: Migrate Data**
Run the data migration script:

```sql
-- Copy and paste the contents of data-migration.sql
-- into your Supabase SQL Editor or run via psql
\i data-migration.sql
```

### **Step 4: Verify Migration**
Check the migration results:

```sql
-- View migration summary
SELECT * FROM migration_summary;

-- Check role distribution
SELECT role, COUNT(*) as user_count 
FROM users 
GROUP BY role 
ORDER BY user_count DESC;

-- Check report status distribution
SELECT status, COUNT(*) as report_count 
FROM reports 
GROUP BY status 
ORDER BY report_count DESC;
```

### **Step 5: Clean Up Old Tables (Optional)**
After verifying everything works:

```sql
-- Drop old tables (CAREFUL - only after verification!)
DROP TABLE IF EXISTS "user" CASCADE;
DROP TABLE IF EXISTS report CASCADE;
DROP TABLE IF EXISTS major_customer CASCADE;
DROP TABLE IF EXISTS activity_log CASCADE;
DROP TABLE IF EXISTS sent_email CASCADE;
DROP TABLE IF EXISTS system_log CASCADE;
-- ... continue with other old tables
```

---

## 🔧 **Using Supabase Dashboard**

If you prefer using the Supabase Dashboard:

### **Method 1: SQL Editor**
1. Go to SQL Editor in your Supabase dashboard
2. Create a new query
3. Copy/paste the restoration scripts
4. Run each script step by step

### **Method 2: Database Import (if available)**
1. Go to Database → Backups
2. Look for import/restore options
3. Upload your `.backup` file

---

## 🛠️ **Troubleshooting**

### **Common Issues:**

#### **Issue 1: Permission Denied**
```sql
-- Grant necessary permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;
```

#### **Issue 2: Conflicting Data**
```sql
-- Clear existing data if needed (CAREFUL!)
TRUNCATE TABLE users CASCADE;
TRUNCATE TABLE reports CASCADE;
```

#### **Issue 3: Missing Extensions**
```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

#### **Issue 4: pg_restore not found**
Install PostgreSQL client tools:
- **Windows**: Download from PostgreSQL.org
- **Mac**: `brew install postgresql`
- **Linux**: `sudo apt-get install postgresql-client`

---

## 📊 **Post-Restoration Setup**

### **1. Update Environment Variables**
Update your `.env.local`:

```env
# Your new Supabase credentials
NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT-REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_new_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_new_service_role_key

# Database URL for direct connections
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

### **2. Test Your Application**
```bash
# Start your Next.js app
npm run dev

# Check if data loads correctly
# Visit http://localhost:3000/dashboard
```

### **3. Set Up Authentication**
If using the modern schema:

```sql
-- Create authentication policies
-- These are included in the migration scripts
```

### **4. Configure Email Settings**
Update email configuration in your app or database:

```sql
-- Update email settings
UPDATE email_settings 
SET smtp_password_encrypted = crypt('your_new_password', gen_salt('bf', 10))
WHERE id = (SELECT id FROM email_settings LIMIT 1);
```

---

## 🎯 **Recommendation**

**I recommend Option 2 (Modern Schema Migration)** because:

1. **Future-Proof**: Uses modern PostgreSQL features
2. **Better Performance**: Optimized indexes and queries
3. **Enhanced Security**: Row Level Security policies
4. **Better Developer Experience**: Works perfectly with tRPC/TypeScript
5. **Scalability**: UUID-based design scales better
6. **Data Integrity**: Enum types prevent invalid data

The migration preserves 100% of your data while providing significant improvements for the modern Next.js application.

---

## 🆘 **Need Help?**

If you encounter issues:
1. Check the Supabase logs in your dashboard
2. Verify your connection string is correct
3. Ensure your backup file is not corrupted
4. Contact support with specific error messages

**Migration Success Indicators:**
- All table counts match between old and new
- Users can log in with existing credentials
- Reports display correctly
- All relationships are preserved

Choose your restoration method and let's get your modern LPG testing system running! 🚀 