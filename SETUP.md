# Workflow360 Setup Guide

This guide will help you set up Workflow360 with your own Supabase instance.

## Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- A Supabase account (free tier works)

## Step 1: Clone and Install Dependencies

```bash
cd workflow360
npm install
```

## Step 2: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Enter a project name (e.g., "workflow360")
4. Set a secure database password (save this!)
5. Select a region close to your users
6. Click "Create new project"

## Step 3: Run the Database Migration

1. In your Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy the entire contents of `supabase/migrations/001_complete_schema.sql`
4. Paste it into the SQL Editor
5. Click **Run** (or press Ctrl/Cmd + Enter)

This creates all the tables, indexes, functions, and security policies needed.

## Step 4: Configure Environment Variables

1. In Supabase, go to **Settings** → **API**
2. Copy your **Project URL** and **anon public** key
3. Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

## Step 5: Enable Email Authentication

1. In Supabase, go to **Authentication** → **Providers**
2. Make sure **Email** is enabled
3. (Optional) Configure email templates under **Email Templates**

## Step 6: Run the Application

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database Schema Overview

### Tables

| Table | Description |
|-------|-------------|
| `users` | User profiles (extends Supabase auth) |
| `organizations` | Team workspaces |
| `organization_members` | Links users to organizations with roles |
| `projects` | Projects within organizations |
| `project_members` | Links users to projects with roles |
| `project_custom_roles` | Custom role definitions for projects |
| `tasks` | Tasks within projects |
| `sprints` | Sprint planning for projects |
| `sprint_events` | Events within sprints (meetings, milestones) |
| `notifications` | User notifications |

### User Roles

**Organization Roles:**
- `admin` - Full access to organization settings
- `manager` - Can manage projects and members
- `member` - Standard access

**Project Roles:**
- `owner` - Full project control
- `lead` - Can manage sprints and assign tasks
- `contributor` - Can create and update tasks
- `viewer` - Read-only access

## Troubleshooting

### "Permission denied" errors
- Make sure RLS policies are properly created (run the migration again)
- Check that you're logged in with a valid user

### "Invalid invite code" when joining
- Invite codes are case-insensitive
- Make sure the organization exists

### Database connection issues
- Verify your environment variables are correct
- Check Supabase project status in the dashboard

## Color Scheme

The app uses these brand colors:
- **Dark Navy**: #0B0F3F (sidebar)
- **Brand Blue**: #00A6FF (primary actions)
- **Brand Purple**: #7F57FF (secondary actions)
- **Brand Cyan**: #4FD1FF (highlights)
- **Success Green**: #2ECC71
- **Destructive Red**: #E74C3C
- **Warning Yellow**: #F1C40F

## Support

For issues, please open a GitHub issue or contact the development team.
