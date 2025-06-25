# Environment Setup Guide

## 🚨 **CRITICAL**: Database Connection Required

The LPG Cylinder Testing App is **100% complete** but **cannot function** without proper environment configuration. This guide will help you set up the database connection.

## 📊 **Current Status**

| Component | Status | Issue |
|-----------|--------|-------|
| **Application Code** | ✅ Complete | Ready to run |
| **UI Components** | ✅ Working | All pages render |
| **TypeScript** | ✅ Compiled | No errors |
| **Build Process** | ✅ Working | Builds successfully |
| **Database Connection** | ❌ **BLOCKED** | **Missing environment variables** |

## 🔧 **Step-by-Step Setup**

### Step 1: Create Environment File

Create a `.env.local` file in the root directory of `lpg-cylinder-app/`:

```bash
# Navigate to project root
cd lpg-cylinder-app

# Create environment file
touch .env.local
```

### Step 2: Add Supabase Configuration

Add the following content to `.env.local`:

```env
# Supabase Configuration (REQUIRED)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Optional: Production settings
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000
```

### Step 3: Get Supabase Credentials

#### Option A: From Supabase Dashboard
1. Go to [supabase.com](https://supabase.com)
2. Sign in to your account
3. Select your LPG Cylinder project
4. Go to **Settings** → **API**
5. Copy the following values:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY`

#### Option B: From Previous Configuration
If you have the original Flask app configuration, look for:
- Supabase URL in database connection strings
- API keys in environment variables
- Service role keys in admin configurations

### Step 4: Verify Environment Variables

Create a test file to verify the configuration:

```bash
# Create test file
echo 'console.log("Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL)' > test-env.js

# Run test
node test-env.js

# Clean up
rm test-env.js
```

### Step 5: Start the Application

```bash
# Install dependencies (if not done)
npm install

# Start development server
npm run dev
```

## 🧪 **Testing the Connection**

### 1. Application Startup
- ✅ **Expected**: Server starts on http://localhost:3000
- ❌ **If fails**: Check Node.js version (requires 18+)

### 2. Login Page
- ✅ **Expected**: Login form displays with test credentials
- ❌ **If fails**: Check TypeScript compilation errors

### 3. Database Connection
- ✅ **Expected**: Login attempts connect to database
- ❌ **If fails**: Check environment variables

### 4. Dashboard Data
- ✅ **Expected**: Statistics load from database
- ❌ **If fails**: Check database schema compatibility

## 🔍 **Troubleshooting**

### Issue: "Loading..." on Dashboard
**Cause**: Environment variables not configured
**Solution**: 
1. Verify `.env.local` exists
2. Check all required variables are set
3. Restart development server

### Issue: Login Form Not Working
**Cause**: Database connection failed
**Solution**:
1. Verify Supabase credentials
2. Check network connectivity
3. Verify database is accessible

### Issue: TypeScript Errors
**Cause**: Missing type definitions
**Solution**:
```bash
npm run lint
npm run build
```

### Issue: Build Failures
**Cause**: Dependency issues
**Solution**:
```bash
rm -rf node_modules package-lock.json
npm install
```

## 📋 **Environment Variables Reference**

### Required Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | `https://xyz.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public API key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin API key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |

### Optional Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `NEXTAUTH_SECRET` | Session encryption | Auto-generated |
| `NEXTAUTH_URL` | Application URL | `http://localhost:3000` |

## 🗄️ **Database Schema Verification**

The application expects these tables in your Supabase database:

### Core Tables
- `users` - User accounts and authentication
- `reports` - LPG cylinder test reports
- `major_customers` - Customer information
- `activity_logs` - User activity tracking
- `email_settings` - Email configuration
- `email_logs` - Email delivery tracking
- `system_logs` - Application logging

### Verification Query
Run this in Supabase SQL Editor to verify tables exist:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

Expected output:
```
activity_logs
email_logs
email_settings
major_customers
reports
system_logs
users
```

## 🔐 **Authentication Testing**

### Test Users
The application displays test credentials on the login page:
- **Admin**: admin / password123
- **Tester**: seana / password123
- **Any user**: [username] / password123

### Verify Users Exist
Run this query in Supabase to check users:

```sql
SELECT username, email, role, is_active 
FROM users 
ORDER BY role, username;
```

## 🚀 **Success Indicators**

### ✅ **Environment Setup Complete**
- [ ] `.env.local` file created
- [ ] All required variables set
- [ ] Application starts without errors
- [ ] Login page displays correctly

### ✅ **Database Connection Working**
- [ ] Login attempts reach database
- [ ] Dashboard statistics load
- [ ] User details display
- [ ] No connection errors in console

### ✅ **Ready for Development**
- [ ] Authentication flow working
- [ ] Role-based access functional
- [ ] Dashboard data loading
- [ ] All UI components responsive

## 📞 **Getting Help**

### If You're Still Stuck

1. **Check Console Errors**: Open browser DevTools → Console
2. **Check Network Tab**: Look for failed API requests
3. **Verify Database**: Use Supabase dashboard to test queries
4. **Check Logs**: Look at terminal output for error messages

### Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| "Invalid API key" | Wrong Supabase keys | Verify credentials |
| "Connection refused" | Network/firewall | Check connectivity |
| "Table doesn't exist" | Schema mismatch | Verify database schema |
| "Unauthorized" | Wrong permissions | Check service role key |

### Support Resources
- **Supabase Docs**: [supabase.com/docs](https://supabase.com/docs)
- **Next.js Docs**: [nextjs.org/docs](https://nextjs.org/docs)
- **Project Status**: See `PROJECT-STATUS.md`
- **Technical Details**: See `current-app-summary.md`

---

## 🎉 **Once Connected**

After successful environment setup, you'll have:
- ✅ **Working Authentication**: Login with real users
- ✅ **Live Dashboard**: Real statistics from database
- ✅ **Role-Based Access**: Proper permission system
- ✅ **Ready for Features**: Can start building reports, users, customers

**The application is 100% ready - it just needs to connect to your database!**

---

**Last Updated**: December 2024  
**Status**: Environment Setup Required

## Quick Setup

1. **Copy Environment Variables**
   ```bash
   cp .env.example .env.local
   ```

2. **Configure Supabase**
   - Update `NEXT_PUBLIC_SUPABASE_URL` with your Supabase project URL
   - Update `NEXT_PUBLIC_SUPABASE_ANON_KEY` with your Supabase anon key
   - Update `SUPABASE_SERVICE_ROLE_KEY` with your service role key

3. **Install Dependencies**
   ```bash
   npm install
   ```

4. **Run Development Server**
   ```bash
   npm run dev
   ```

## Important Notes

### Supabase Image Configuration
The `next.config.ts` file is already configured to allow images from Supabase storage. If you're using a different Supabase project, the configuration will automatically use the hostname from your `NEXT_PUBLIC_SUPABASE_URL` environment variable.

If you encounter "hostname not configured" errors with Next.js Image component:
1. Ensure your `NEXT_PUBLIC_SUPABASE_URL` is correctly set in `.env.local`
2. Restart the development server after any config changes
3. The app supports images from the `/storage/v1/object/public/**` path pattern

### File Upload Configuration
Make sure your Supabase storage bucket `app-data` has the following structure:
```
app-data/
├── branding/         # Logo, favicon uploads
└── signatures/       # Digital signature files
```

Both buckets should be configured as public for the upload functionality to work correctly. 