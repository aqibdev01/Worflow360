# Workflow360 Database Schema

This directory contains the Supabase database schema and migration scripts for Workflow360.

## Overview

The Workflow360 database is designed to support a comprehensive workflow management system with the following key features:

- **User Management**: User profiles integrated with Supabase Auth
- **Organizations**: Multi-tenant organization structure
- **Projects**: Project management within organizations
- **Tasks**: Task tracking with status, priority, and assignments
- **Sprints**: Sprint planning and management
- **Role-Based Access Control**: Granular permissions at organization and project levels

## Database Schema

### Tables

#### 1. `users`
Extends Supabase Auth users with additional profile information.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | References auth.users(id) |
| email | TEXT | User email address |
| full_name | TEXT | User's full name |
| avatar_url | TEXT | URL to user's avatar image |
| created_at | TIMESTAMPTZ | Account creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

#### 2. `organizations`
Organizations that contain projects and members.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Unique organization ID |
| name | TEXT | Organization name |
| description | TEXT | Organization description |
| owner_id | UUID (FK) | References users(id) - organization owner |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

#### 3. `organization_members`
Links users to organizations with roles.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Unique member record ID |
| org_id | UUID (FK) | References organizations(id) |
| user_id | UUID (FK) | References users(id) |
| role | member_role | 'admin', 'manager', or 'member' |
| joined_at | TIMESTAMPTZ | When user joined organization |

**Unique Constraint**: (org_id, user_id)

#### 4. `projects`
Projects within organizations.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Unique project ID |
| org_id | UUID (FK) | References organizations(id) |
| name | TEXT | Project name |
| description | TEXT | Project description |
| status | project_status | 'planning', 'active', 'on_hold', 'completed', 'archived' |
| created_by | UUID (FK) | References users(id) - project creator |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

#### 5. `project_members`
Links users to projects with roles.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Unique member record ID |
| project_id | UUID (FK) | References projects(id) |
| user_id | UUID (FK) | References users(id) |
| role | project_role | 'owner', 'lead', 'contributor', or 'viewer' |
| assigned_at | TIMESTAMPTZ | When user was assigned to project |

**Unique Constraint**: (project_id, user_id)

#### 6. `tasks`
Tasks within projects.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Unique task ID |
| project_id | UUID (FK) | References projects(id) |
| sprint_id | UUID (FK) | References sprints(id) - nullable |
| title | TEXT | Task title |
| description | TEXT | Task description |
| status | task_status | 'todo', 'in_progress', 'review', 'done', 'blocked' |
| priority | task_priority | 'low', 'medium', 'high', 'urgent' |
| assignee_id | UUID (FK) | References users(id) - task assignee |
| created_by | UUID (FK) | References users(id) - task creator |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |
| due_date | TIMESTAMPTZ | Task due date |
| completed_at | TIMESTAMPTZ | Completion timestamp (auto-set) |

#### 7. `sprints`
Sprint planning within projects.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Unique sprint ID |
| project_id | UUID (FK) | References projects(id) |
| name | TEXT | Sprint name |
| goal | TEXT | Sprint goal/objective |
| start_date | TIMESTAMPTZ | Sprint start date |
| end_date | TIMESTAMPTZ | Sprint end date |
| status | sprint_status | 'planned', 'active', 'completed', 'cancelled' |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

**Constraint**: end_date must be greater than start_date

### Enums

- **member_role**: admin, manager, member
- **project_status**: planning, active, on_hold, completed, archived
- **project_role**: owner, lead, contributor, viewer
- **task_status**: todo, in_progress, review, done, blocked
- **task_priority**: low, medium, high, urgent
- **sprint_status**: planned, active, completed, cancelled

### Relationships

```
auth.users (1) ──→ (1) public.users
public.users (1) ──→ (*) organizations (as owner)
public.users (*) ──→ (*) organizations (via organization_members)
public.organizations (1) ──→ (*) projects
public.users (1) ──→ (*) projects (as creator)
public.users (*) ──→ (*) projects (via project_members)
public.projects (1) ──→ (*) tasks
public.projects (1) ──→ (*) sprints
public.sprints (1) ──→ (*) tasks
public.users (1) ──→ (*) tasks (as assignee)
public.users (1) ──→ (*) tasks (as creator)
```

## Row Level Security (RLS)

All tables have RLS enabled with the following policy structure:

### Users Table
- Users can view and update their own profile
- Users can view profiles of members in their organizations

### Organizations Table
- Users can view organizations they're members of
- Users can create organizations (become owner)
- Owners and admins can update organizations
- Only owners can delete organizations

### Organization Members Table
- Users can view members of organizations they belong to
- Owners and admins can add/update/remove members
- Users can remove themselves from organizations

### Projects Table
- Users can view projects in organizations they belong to
- Organization managers and admins can create projects
- Project leads and org admins can update projects
- Project owners and org admins can delete projects

### Project Members Table
- Users can view members of projects they're in
- Project owners and leads can add/update/remove members
- Users can remove themselves from projects

### Tasks Table
- Users can view tasks in projects they're members of
- Project members can create and update tasks
- Task creators and project leads can delete tasks

### Sprints Table
- Users can view sprints in projects they're members of
- Project owners and leads can create/update/delete sprints

## Database Functions

### `is_org_admin(org_uuid, user_uuid)`
Returns `true` if the user is an admin or owner of the organization.

### `is_project_member(project_uuid, user_uuid)`
Returns `true` if the user is a member of the project.

### `get_user_org_role(org_uuid, user_uuid)`
Returns the user's role in the organization ('owner', 'admin', 'manager', 'member', or NULL).

## Triggers

### Auto-update `updated_at`
Automatically updates the `updated_at` column on the following tables:
- users
- organizations
- projects
- tasks
- sprints

### Auto-set `completed_at`
Automatically sets/unsets `completed_at` on tasks when status changes to/from 'done'.

## Setup Instructions

### 1. Create a Supabase Project

1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Click "New Project"
3. Fill in project details and create

### 2. Run the Migration

#### Option A: Using Supabase Dashboard (Recommended for first-time setup)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `migrations/20250126_initial_schema.sql`
4. Paste into the SQL editor
5. Click "Run" to execute the migration

#### Option B: Using Supabase CLI

```bash
# Install Supabase CLI (if not already installed)
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push
```

### 3. Configure Environment Variables

Copy your Supabase credentials to `.env.local`:

```bash
cp .env.example .env.local
```

Update `.env.local` with your values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

You can find these values in:
- Supabase Dashboard → Settings → API

### 4. Verify Setup

Test the database connection:

```typescript
import { supabase } from "@/lib/supabase";

// Test query
const { data, error } = await supabase
  .from("users")
  .select("*")
  .limit(1);

if (error) {
  console.error("Database connection error:", error);
} else {
  console.log("Database connected successfully!");
}
```

## Usage Examples

### Create an Organization

```typescript
import { supabase } from "@/lib/supabase";

const { data, error } = await supabase
  .from("organizations")
  .insert({
    name: "Acme Corp",
    description: "Our awesome organization",
    owner_id: userId,
  })
  .select()
  .single();
```

### Add Organization Member

```typescript
const { data, error } = await supabase
  .from("organization_members")
  .insert({
    org_id: organizationId,
    user_id: newUserId,
    role: "member",
  });
```

### Create a Project

```typescript
const { data, error } = await supabase
  .from("projects")
  .insert({
    org_id: organizationId,
    name: "Q1 Website Redesign",
    description: "Complete redesign of company website",
    status: "active",
    created_by: userId,
  })
  .select()
  .single();
```

### Create a Task

```typescript
const { data, error } = await supabase
  .from("tasks")
  .insert({
    project_id: projectId,
    title: "Design homepage mockup",
    description: "Create high-fidelity mockup for new homepage",
    status: "todo",
    priority: "high",
    assignee_id: designerId,
    created_by: userId,
  })
  .select()
  .single();
```

### Query Tasks with Relations

```typescript
const { data, error } = await supabase
  .from("tasks")
  .select(`
    *,
    assignee:users!assignee_id(id, full_name, avatar_url),
    project:projects(id, name),
    sprint:sprints(id, name)
  `)
  .eq("project_id", projectId)
  .order("created_at", { ascending: false });
```

### Create a Sprint

```typescript
const { data, error } = await supabase
  .from("sprints")
  .insert({
    project_id: projectId,
    name: "Sprint 1",
    goal: "Complete user authentication flow",
    start_date: "2025-01-26T00:00:00Z",
    end_date: "2025-02-09T23:59:59Z",
    status: "planned",
  })
  .select()
  .single();
```

## Security Considerations

1. **RLS Enabled**: All tables have Row Level Security enabled
2. **Authentication Required**: Most operations require authenticated users
3. **Role-Based Access**: Different roles have different permissions
4. **Cascade Deletes**: Foreign key constraints ensure data integrity
5. **Input Validation**: Use TypeScript types for compile-time validation

## Maintenance

### Adding New Migrations

Create new migration files with timestamps:

```bash
# Example
supabase/migrations/20250127_add_comments_table.sql
```

### Backup

Regular backups are handled by Supabase automatically. For manual backups:

1. Go to Supabase Dashboard → Database → Backups
2. Download a backup or schedule automated backups

## TypeScript Types

All database types are automatically generated in `types/database.ts`. Import and use them in your application:

```typescript
import type { Task, Project, Organization } from "@/types";

const task: Task = {
  // TypeScript will enforce the correct structure
};
```

## Troubleshooting

### RLS Policies Blocking Access

If queries are returning empty results:

1. Verify user is authenticated
2. Check RLS policies match your use case
3. Use Supabase Dashboard → Authentication to verify user session
4. Test queries in SQL Editor with "Use RLS" disabled to isolate issue

### Foreign Key Violations

Ensure referenced records exist before inserting:

```typescript
// First, ensure user exists in public.users
// Then, create organization
// Then, add organization members
```

### Migration Errors

If migration fails:
1. Check SQL syntax
2. Verify no duplicate table/index names
3. Clear failed migrations from `_supabase_migrations` table
4. Re-run migration

## Support

For issues or questions:
- Check [Supabase Documentation](https://supabase.com/docs)
- Review [Workflow360 README](../README.md)
- Open an issue in the project repository
