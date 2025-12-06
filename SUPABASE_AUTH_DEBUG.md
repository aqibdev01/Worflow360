# Supabase Authentication Debugging Guide

## Issue: "Invalid credentials" after successful signup

This guide will help you diagnose and fix the authentication issue.

---

## Step 1: Check Console Logs

Open your browser's Developer Console (F12) and look for these log messages:

### During Sign Up:
```
🔐 Attempting sign up for: your-email@example.com
✅ Auth user created: [user-id]
📧 Email confirmation required: true/false
👤 Getting or creating user profile for: [user-id]
✅ User profile created successfully
```

### During Sign In:
```
🔐 Attempting sign in for: your-email@example.com
❌ Sign in error: [error details]
Error code: [error code]
Error message: [error message]
```

---

## Step 2: Common Issues & Solutions

### Issue 1: Email Confirmation Required

**Symptom:** Signup succeeds but login says "invalid credentials"

**Cause:** Supabase is configured to require email confirmation before login

**Solution Options:**

#### Option A: Disable Email Confirmation (Development Only)
1. Go to your Supabase Dashboard
2. Navigate to **Authentication** → **Providers** → **Email**
3. Find "Confirm email" setting
4. **Disable** it for development
5. Try signing up again with a new email

#### Option B: Check Email for Confirmation Link
1. Check your email inbox (and spam folder)
2. Look for email from Supabase
3. Click the confirmation link
4. Try logging in again

---

### Issue 2: Database Table Missing

**Symptom:** Console shows error creating user profile

**Error:** `relation "public.users" does not exist`

**Solution:** Run the SQL migration to create tables

1. Go to Supabase Dashboard → **SQL Editor**
2. Check if the `users` table exists:
   ```sql
   SELECT * FROM information_schema.tables
   WHERE table_schema = 'public'
   AND table_name = 'users';
   ```

3. If it doesn't exist, run the migration files in `/supabase/migrations/`

---

### Issue 3: Row Level Security (RLS) Blocking Insert

**Symptom:** Console shows "new row violates row-level security policy"

**Solution:** Update RLS policies

1. Go to Supabase Dashboard → **Authentication** → **Policies**
2. For the `users` table, add a policy for INSERT:

```sql
-- Policy: Allow users to insert their own profile
CREATE POLICY "Users can insert their own profile"
ON public.users
FOR INSERT
WITH CHECK (auth.uid() = id);

-- Policy: Allow users to read their own profile
CREATE POLICY "Users can read their own profile"
ON public.users
FOR SELECT
USING (auth.uid() = id);

-- Policy: Allow users to update their own profile
CREATE POLICY "Users can update their own profile"
ON public.users
FOR UPDATE
USING (auth.uid() = id);
```

---

### Issue 4: Wrong Email/Password

**Symptom:** Error code: `invalid_credentials`

**Cause:** Typing wrong email or password

**Solution:**
1. Double-check you're using the exact email and password from signup
2. Try password reset if you forgot the password
3. Or create a new account with a different email

---

## Step 3: Test Authentication Flow

### Test Signup:
1. Clear browser cookies/localStorage
2. Go to `/auth/signup`
3. Open Developer Console (F12)
4. Sign up with a **new email** (one you haven't used before)
5. Check console for logs
6. Check your email inbox

### Test Login:
1. If email confirmation is **disabled**: login immediately
2. If email confirmation is **enabled**:
   - Check email
   - Click confirmation link
   - Then try login
3. Check console for error details

---

## Step 4: Quick Fix Commands

### Check Supabase Connection:
Open browser console and run:
```javascript
const { data, error } = await supabase.auth.getSession()
console.log('Session:', data)
console.log('Error:', error)
```

### Check if tables exist:
1. Go to Supabase Dashboard → **Table Editor**
2. Look for these tables:
   - `users`
   - `organizations`
   - `organization_members`
   - `projects`
   - `project_members`
   - `tasks`
   - `sprints`

---

## Step 5: Recommended Settings for Development

For smooth development experience:

1. **Disable Email Confirmation:**
   - Dashboard → Authentication → Providers → Email
   - Uncheck "Confirm email"

2. **Set Redirect URLs:**
   - Dashboard → Authentication → URL Configuration
   - Site URL: `http://localhost:3001`
   - Redirect URLs: `http://localhost:3001/auth/callback`

3. **Enable Development Mode:**
   - This allows you to test without email confirmation
   - Faster iteration during development

---

## Step 6: Check Current Logs

Try signing up and logging in now, then look for these specific logs in your browser console:

### Expected Successful Flow:
```
🔐 Attempting sign up for: test@example.com
✅ Auth user created: abc123...
📧 Email confirmation required: false  ← Should be false
👤 Getting or creating user profile for: abc123...
✅ User profile created successfully

🔐 Attempting sign in for: test@example.com
✅ Sign in successful: abc123...
📧 Email confirmed: true
```

### If You See Errors:
Copy the full error message and check against the solutions above.

---

## Need More Help?

If you're still having issues, provide:
1. Console error messages
2. Error codes
3. Whether email confirmation is enabled or disabled
4. Screenshot of the error

This will help diagnose the exact issue!
