# Database Setup Guide - CRITICAL

## ⚠️ IMPORTANT: Your Database Is Not Set Up Yet!

The authentication isn't working because **the database tables don't exist yet**. You need to run the SQL migrations in your Supabase project.

---

## Quick Setup (5 Minutes)

### Step 1: Open Supabase Dashboard

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Sign in to your account
3. Select your project: **dyihhrjyyynwufpwggjn**

### Step 2: Run the SQL Migration

1. In the Supabase Dashboard, click **SQL Editor** in the left sidebar
2. Click **New Query**
3. Copy and paste the entire contents of this file:
   ```
   /Users/fakhirhassan/Desktop/workflow360/supabase/migrations/20250126_initial_schema.sql
   ```

### Step 3: Execute the Migration

1. Click **Run** (or press Cmd/Ctrl + Enter)
2. Wait for the green success message
3. You should see: "Success. No rows returned"

### Step 4: Verify Tables Were Created

1. Click **Table Editor** in the left sidebar
2. You should now see these tables:
   **Core Tables:**
   - ✅ users (with security_question, security_answer columns)
   - ✅ organizations
   - ✅ organization_members
   - ✅ projects
   - ✅ project_members
   - ✅ project_custom_roles
   - ✅ tasks
   - ✅ sprints
   - ✅ sprint_events
   - ✅ notifications

   **Communication Hub Tables:**
   - ✅ channels
   - ✅ channel_members
   - ✅ messages
   - ✅ message_reactions
   - ✅ direct_message_threads
   - ✅ direct_message_participants
   - ✅ direct_messages

### Step 5: Configure Authentication Settings

1. Click **Authentication** → **Providers** in the left sidebar
2. Click on **Email** provider
3. **DISABLE** "Confirm email" (for development)
4. Click **Save**

---

## Step 6: Verify Communication Hub Setup

The complete schema file (`001_complete_schema.sql`) already includes:
- Security question columns on `users` table (for password reset)
- Communication Hub tables (channels, messages, reactions, DMs)
- Auto-create triggers (#general channel created when members join orgs/projects)
- Supabase Realtime enabled on messages, reactions, DMs, channel_members
- `chat-attachments` storage bucket (10MB file size limit)

**If you already have the database set up and need to add Communication Hub only:**
Run the separate migration file in SQL Editor:
```
supabase/migrations/002_communication_hub.sql
```

### Step 7: Verify Realtime is Enabled

1. Go to **Database** → **Publications** in Supabase Dashboard
2. Click on `supabase_realtime`
3. Verify these tables are listed:
   - ✅ messages
   - ✅ message_reactions
   - ✅ direct_messages
   - ✅ channel_members

### Step 8: Verify Storage Bucket

1. Go to **Storage** in Supabase Dashboard
2. You should see a `chat-attachments` bucket
3. If not, create it manually with a 10MB file size limit

---

## After Setup: Test Authentication

### Test Signup:

1. Go to http://localhost:3001/auth/signup
2. Sign up with a **new email** (one you haven't tried before)
3. Open browser console (F12)
4. Look for these logs:
   ```
   🔐 Attempting sign up for: your-email@example.com
   ✅ Auth user created: [user-id]
   📧 Email confirmation required: false
   👤 Getting or creating user profile for: [user-id]
   📝 Creating new user profile
   ✅ User profile created successfully
   ```

### Test Login:

1. Go to http://localhost:3001/auth/login
2. Login with the email/password you just created
3. Check console for:
   ```
   🔐 Attempting sign in for: your-email@example.com
   ✅ Sign in successful: [user-id]
   📧 Email confirmed: true
   ```

4. You should be redirected to `/dashboard`

---

## If You Still Have Issues

### Issue: "relation public.users does not exist"

**Solution:** The migration didn't run. Go back to Step 2 and run the SQL migration.

### Issue: "Email confirmation required: true"

**Solution:** Disable email confirmation in Step 5.

### Issue: "new row violates row-level security policy"

**Solution:** The migration file includes RLS policies. Make sure you ran the ENTIRE migration file, not just part of it.

### Issue: "Invalid credentials" after signup

**Causes:**
1. Email confirmation is still enabled - Disable it in Authentication settings
2. You're trying to login with an old email that was created when confirmation was enabled
3. Wrong password

**Solution:**
1. Disable email confirmation (Step 5)
2. Sign up with a NEW email address
3. Then try logging in

---

## Detailed Migration File Location

The SQL migration file is located at:
```
/Users/fakhirhassan/Desktop/workflow360/supabase/migrations/20250126_initial_schema.sql
```

This file creates:
- All database tables (core + communication hub)
- Indexes for performance
- Row Level Security (RLS) policies
- Enums for status types
- Triggers for updated_at timestamps
- Communication hub auto-create channel triggers
- Reply count auto-increment/decrement triggers
- Supabase Realtime publications
- Chat attachments storage bucket

---

## Quick Copy: Open SQL File

Run this command to view the SQL migration:

```bash
cat /Users/fakhirhassan/Desktop/workflow360/supabase/migrations/20250126_initial_schema.sql
```

Then copy the entire output and paste it into Supabase SQL Editor.

---

## Alternative: Use Supabase CLI (Advanced)

If you have Supabase CLI installed:

```bash
cd /Users/fakhirhassan/Desktop/workflow360
supabase db push
```

But for now, the manual approach above is faster and more reliable.

---

## After Setup Checklist

- [ ] Ran SQL migration in Supabase Dashboard
- [ ] Verified tables exist in Table Editor
- [ ] Disabled email confirmation in Authentication settings
- [ ] Tested signup with NEW email
- [ ] Tested login with same credentials
- [ ] Successfully redirected to dashboard
- [ ] Can create organizations

---

## Need Help?

If you encounter errors, check the browser console and look for:
- ❌ symbols (errors)
- Error messages
- Error codes

Share those with me and I can help troubleshoot!
