# Workflow360 Database Quick Start

This guide will help you get the database up and running quickly.

## Step 1: Setup Supabase Project

1. Create account at [supabase.com](https://supabase.com)
2. Click "New Project"
3. Choose organization and fill in:
   - **Name**: workflow360
   - **Database Password**: (save this securely)
   - **Region**: (closest to your users)
4. Click "Create new project" and wait for provisioning

## Step 2: Run Database Migration

### Using Supabase Dashboard (Easiest)

1. In your Supabase project, go to **SQL Editor** (left sidebar)
2. Click "New query"
3. Open `supabase/migrations/20250126_initial_schema.sql` from this project
4. Copy all contents and paste into the SQL editor
5. Click **Run** (or press Cmd/Ctrl + Enter)
6. You should see "Success. No rows returned"

### Using Supabase CLI (Advanced)

```bash
# Install CLI globally
npm install -g supabase

# Login to Supabase
supabase login

# Initialize Supabase in your project (if not done)
supabase init

# Link to your remote project
supabase link --project-ref YOUR_PROJECT_REF

# Push database migrations
supabase db push
```

## Step 3: Get API Credentials

1. In Supabase Dashboard, go to **Settings** → **API**
2. Copy the following:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **Project API keys** → **anon public** key

## Step 4: Configure Environment Variables

1. In your project root, copy the example file:
   ```bash
   cp .env.example .env.local
   ```

2. Edit `.env.local` and add your credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
   ```

3. **Important**: Never commit `.env.local` to git!

## Step 5: Verify Database Setup

Run this test in your Next.js app:

```typescript
// Test in app/page.tsx or a test route
import { supabase } from "@/lib/supabase";

async function testConnection() {
  const { data, error } = await supabase
    .from("users")
    .select("count")
    .single();

  if (error) {
    console.error("Connection failed:", error);
  } else {
    console.log("✅ Database connected!");
  }
}
```

## Step 6: Setup Authentication (Optional but Recommended)

### Enable Email Authentication

1. Go to **Authentication** → **Providers** in Supabase Dashboard
2. Enable **Email** provider
3. Configure email templates (optional)

### Test User Signup

```typescript
import { supabase } from "@/lib/supabase";

// Sign up a new user
const { data, error } = await supabase.auth.signUp({
  email: "user@example.com",
  password: "securepassword123",
});

if (!error) {
  // User created! Now create their profile
  const { error: profileError } = await supabase
    .from("users")
    .insert({
      id: data.user!.id,
      email: data.user!.email!,
      full_name: "Test User",
    });
}
```

## Common Operations

### Create Your First Organization

```typescript
import { createOrganization } from "@/lib/database";

const org = await createOrganization({
  name: "My Company",
  description: "Our workflow management",
  owner_id: userId, // from supabase.auth.getUser()
});
```

### Create a Project

```typescript
import { createProject } from "@/lib/database";

const project = await createProject({
  org_id: organizationId,
  name: "Website Redesign",
  description: "Q1 2025 website refresh",
  status: "active",
  created_by: userId,
});
```

### Create a Task

```typescript
import { createTask } from "@/lib/database";

const task = await createTask({
  project_id: projectId,
  title: "Design homepage mockup",
  description: "Create Figma mockup for new homepage",
  status: "todo",
  priority: "high",
  assignee_id: designerId,
  created_by: userId,
});
```

### Query Data with Relations

```typescript
import { supabase } from "@/lib/supabase";

// Get tasks with assignee and project info
const { data: tasks } = await supabase
  .from("tasks")
  .select(`
    *,
    assignee:users!assignee_id(full_name, avatar_url),
    projects(name, organizations(name))
  `)
  .eq("assignee_id", userId)
  .eq("status", "in_progress");
```

## Troubleshooting

### "Missing Supabase environment variables"
- Check that `.env.local` exists and has correct values
- Restart your dev server after changing env variables
- Verify variable names start with `NEXT_PUBLIC_`

### "Row Level Security Policy Violation"
- Make sure user is authenticated: `await supabase.auth.getUser()`
- Verify user has permission (e.g., is member of organization)
- Check RLS policies in [README.md](./README.md)

### "Foreign Key Constraint Violation"
- Ensure referenced records exist before inserting
- Example: User must exist in `users` table before creating org
- Example: Organization must exist before creating project

### "Invalid JWT" or "JWT expired"
- User session expired, need to re-authenticate
- Call `supabase.auth.refreshSession()` to refresh
- Implement session refresh logic in your app

### Tables Not Found
- Migration may not have run successfully
- Check SQL Editor history in Supabase Dashboard
- Try running migration again
- Verify you're connected to correct project

## Database Schema Overview

```
Users (auth.users + public.users)
  └─> Organizations (owner)
       └─> Projects
            ├─> Tasks
            │    └─> Sprints
            └─> Sprints
                 └─> Tasks

Organization Members (many-to-many: users <-> organizations)
Project Members (many-to-many: users <-> projects)
```

## Role Hierarchy

### Organization Roles
- **Owner**: Full control, can delete organization
- **Admin**: Manage members, create projects
- **Manager**: Create projects, manage own projects
- **Member**: View organization, join projects

### Project Roles
- **Owner**: Full project control
- **Lead**: Manage project, members, and sprints
- **Contributor**: Create/edit tasks
- **Viewer**: Read-only access

## Next Steps

1. ✅ Database setup complete
2. 📝 Build authentication flow (signup/login)
3. 🏢 Create organization management UI
4. 📊 Build project dashboard
5. ✔️ Implement task board (Kanban/List view)
6. 🏃 Add sprint planning features

## Resources

- [Full Database Schema Documentation](./README.md)
- [Supabase Documentation](https://supabase.com/docs)
- [TypeScript Types Reference](../types/database.ts)
- [Database Utility Functions](../lib/database.ts)

## Need Help?

- Check the [main README](../README.md) for project setup
- Review [Supabase docs](https://supabase.com/docs) for database questions
- Check RLS policies if you get permission errors
- Use Supabase Dashboard's SQL Editor to debug queries
