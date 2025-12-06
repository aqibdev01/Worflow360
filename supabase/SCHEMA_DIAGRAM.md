# Workflow360 Database Schema Diagram

## Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         WORKFLOW360 DATABASE SCHEMA                          │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────┐
│   auth.users     │
│  (Supabase Auth) │
└────────┬─────────┘
         │ 1:1
         ↓
┌──────────────────┐         ┌──────────────────────┐
│  public.users    │         │   organizations      │
├──────────────────┤         ├──────────────────────┤
│ • id (PK, FK)    │◄────┐   │ • id (PK)            │
│ • email          │     │   │ • name               │
│ • full_name      │     └───│ • owner_id (FK)      │
│ • avatar_url     │         │ • description        │
│ • created_at     │         │ • created_at         │
│ • updated_at     │         │ • updated_at         │
└────────┬─────────┘         └──────────┬───────────┘
         │                              │
         │                              │
         │ *                            │ *
         ↓                              ↓
┌──────────────────────┐      ┌─────────────────────┐
│ organization_members │      │      projects       │
├──────────────────────┤      ├─────────────────────┤
│ • id (PK)            │      │ • id (PK)           │
│ • org_id (FK)        │◄─────│ • org_id (FK)       │
│ • user_id (FK)       │      │ • name              │
│ • role               │      │ • description       │
│   - admin            │      │ • status            │
│   - manager          │      │   - planning        │
│   - member           │      │   - active          │
│ • joined_at          │      │   - on_hold         │
└──────────────────────┘      │   - completed       │
         ↑                    │   - archived        │
         │                    │ • created_by (FK)   │
         │ *                  │ • created_at        │
┌────────┴─────────┐          │ • updated_at        │
│      users       │          └──────────┬──────────┘
│  (assignee/      │                     │
│   creator refs)  │                     │
└──────────────────┘                     │ 1
                                         ├────────────┐
                                         │            │
                                         │ *          │ *
                                         ↓            ↓
                              ┌──────────────┐  ┌──────────────────┐
                              │    tasks     │  │ project_members  │
                              ├──────────────┤  ├──────────────────┤
                              │ • id (PK)    │  │ • id (PK)        │
                  ┌───────────│ • project_id │  │ • project_id (FK)│
                  │           │   (FK)       │  │ • user_id (FK)   │
                  │           │ • sprint_id  │  │ • role           │
                  │           │   (FK)       │  │   - owner        │
                  │           │ • title      │  │   - lead         │
                  │           │ • description│  │   - contributor  │
                  │           │ • status     │  │   - viewer       │
                  │           │   - todo     │  │ • assigned_at    │
                  │           │   - progress │  └──────────────────┘
                  │           │   - review   │
                  │           │   - done     │
                  │           │   - blocked  │
                  │           │ • priority   │
                  │           │   - low      │
                  │           │   - medium   │
                  │           │   - high     │
                  │           │   - urgent   │
                  │           │ • assignee_id│
                  │           │   (FK)       │
                  │           │ • created_by │
                  │           │   (FK)       │
                  │           │ • created_at │
                  │           │ • updated_at │
                  │           │ • due_date   │
                  │           │ • completed_ │
                  │           │   at         │
                  │           └──────────────┘
                  │                  ↑
                  │                  │ *
                  │                  │
                  │           ┌──────┴───────┐
                  └──────────►│   sprints    │
                        *     ├──────────────┤
                              │ • id (PK)    │
                              │ • project_id │
                              │   (FK)       │
                              │ • name       │
                              │ • goal       │
                              │ • start_date │
                              │ • end_date   │
                              │ • status     │
                              │   - planned  │
                              │   - active   │
                              │   - completed│
                              │   - cancelled│
                              │ • created_at │
                              │ • updated_at │
                              └──────────────┘
```

## Relationships Summary

| From Table | To Table | Relationship | Description |
|------------|----------|--------------|-------------|
| `users` | `auth.users` | 1:1 | Profile extends auth user |
| `organizations` | `users` | N:1 | Each org has one owner |
| `organization_members` | `organizations` | N:1 | Members belong to orgs |
| `organization_members` | `users` | N:1 | Members are users |
| `projects` | `organizations` | N:1 | Projects belong to orgs |
| `projects` | `users` | N:1 | Each project has creator |
| `project_members` | `projects` | N:1 | Members belong to projects |
| `project_members` | `users` | N:1 | Members are users |
| `tasks` | `projects` | N:1 | Tasks belong to projects |
| `tasks` | `sprints` | N:1 | Tasks optionally in sprints |
| `tasks` | `users` | N:1 | Tasks have assignee |
| `tasks` | `users` | N:1 | Tasks have creator |
| `sprints` | `projects` | N:1 | Sprints belong to projects |

## Data Flow Examples

### Creating a Complete Workflow

```
1. User signs up
   └─> auth.users created (Supabase Auth)
       └─> public.users profile created

2. User creates organization
   └─> organizations row created
       └─> User automatically becomes owner

3. Owner invites team members
   └─> organization_members rows created
       └─> Role assigned (admin/manager/member)

4. Manager creates project
   └─> projects row created
       └─> Manager auto-added as project owner

5. Project owner adds team
   └─> project_members rows created
       └─> Roles assigned (owner/lead/contributor/viewer)

6. Team creates sprint
   └─> sprints row created
       └─> Start and end dates set

7. Team creates tasks
   └─> tasks rows created
       └─> Assigned to sprint (optional)
       └─> Assigned to team member
       └─> Status: todo → in_progress → review → done
```

## Permission Flow

### Organization Access

```
┌─────────────┐
│    User     │
└──────┬──────┘
       │
       ├─ Is owner? ──────────────────────► Full access
       │
       ├─ Has admin role? ────────────────► Manage members, projects
       │
       ├─ Has manager role? ──────────────► Create projects
       │
       └─ Has member role? ───────────────► View, join projects
```

### Project Access

```
┌─────────────┐
│    User     │
└──────┬──────┘
       │
       ├─ Project owner role? ────────────► Full control
       │
       ├─ Project lead role? ─────────────► Manage tasks, sprints, members
       │
       ├─ Project contributor role? ──────► Create/edit tasks
       │
       └─ Project viewer role? ───────────► Read-only access
```

## Cascade Behaviors

### On Delete Cascade

- **User deleted** → All their owned orgs deleted
- **Organization deleted** → All projects, members deleted
- **Project deleted** → All tasks, sprints, members deleted
- **Sprint deleted** → Tasks.sprint_id set to NULL

### On Delete Set Null

- **User deleted** → Tasks.assignee_id set to NULL
- **Sprint deleted** → Tasks.sprint_id set to NULL

## Indexes for Performance

| Table | Index | Columns | Purpose |
|-------|-------|---------|---------|
| `users` | users_email_idx | email | Fast email lookups |
| `organizations` | organizations_owner_id_idx | owner_id | Find user's owned orgs |
| `organization_members` | org_members_org_id_idx | org_id | Find org members |
| `organization_members` | org_members_user_id_idx | user_id | Find user's orgs |
| `projects` | projects_org_id_idx | org_id | Find org projects |
| `projects` | projects_status_idx | status | Filter by status |
| `project_members` | project_members_project_idx | project_id | Find project members |
| `tasks` | tasks_project_id_idx | project_id | Find project tasks |
| `tasks` | tasks_status_idx | status | Filter by status |
| `tasks` | tasks_assignee_id_idx | assignee_id | Find user's tasks |
| `sprints` | sprints_project_id_idx | project_id | Find project sprints |
| `sprints` | sprints_dates_idx | start_date, end_date | Date range queries |

## Constraints

### Unique Constraints
- `users.email` - One email per user
- `(org_id, user_id)` in `organization_members` - User can't join org twice
- `(project_id, user_id)` in `project_members` - User can't join project twice

### Check Constraints
- `sprints.end_date > sprints.start_date` - Valid date range

### Foreign Key Constraints
All relationships enforced with foreign keys for data integrity.

## Triggers

### Automatic Timestamps
- `update_updated_at_column()` - Auto-updates `updated_at` on:
  - users
  - organizations
  - projects
  - tasks
  - sprints

### Task Completion
- `set_task_completed_at()` - Auto-sets/unsets `completed_at` when task status changes to/from 'done'

## Enums Reference

```sql
-- Member roles in organizations
CREATE TYPE member_role AS ENUM ('admin', 'manager', 'member');

-- Project lifecycle statuses
CREATE TYPE project_status AS ENUM ('planning', 'active', 'on_hold', 'completed', 'archived');

-- Project member roles
CREATE TYPE project_role AS ENUM ('owner', 'lead', 'contributor', 'viewer');

-- Task workflow statuses
CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'review', 'done', 'blocked');

-- Task priority levels
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');

-- Sprint lifecycle statuses
CREATE TYPE sprint_status AS ENUM ('planned', 'active', 'completed', 'cancelled');
```

## Common Query Patterns

### Get user's accessible projects with stats
```sql
SELECT
  p.*,
  o.name as org_name,
  COUNT(DISTINCT t.id) as task_count,
  COUNT(DISTINCT pm.id) as member_count
FROM projects p
JOIN organizations o ON p.org_id = o.id
JOIN project_members pm ON p.id = pm.project_id
LEFT JOIN tasks t ON p.id = t.project_id
WHERE pm.user_id = current_user_id
GROUP BY p.id, o.name;
```

### Get project task board (Kanban style)
```sql
SELECT
  t.*,
  u.full_name as assignee_name,
  u.avatar_url as assignee_avatar,
  s.name as sprint_name
FROM tasks t
LEFT JOIN users u ON t.assignee_id = u.id
LEFT JOIN sprints s ON t.sprint_id = s.id
WHERE t.project_id = project_id
ORDER BY t.status, t.priority DESC, t.created_at;
```

### Get active sprint with task breakdown
```sql
SELECT
  s.*,
  COUNT(t.id) FILTER (WHERE t.status = 'done') as completed_tasks,
  COUNT(t.id) as total_tasks
FROM sprints s
LEFT JOIN tasks t ON s.id = t.sprint_id
WHERE s.project_id = project_id
  AND s.status = 'active'
GROUP BY s.id;
```
