# Project Management System Implementation Plan

## Overview
Complete project management system with custom roles, Kanban boards, and sprint management.

---

## Features to Implement

### 1. Enhanced Project Creation
- [x] Organization dashboard with "Create Project" button
- [ ] Multi-step project creation form:
  - Step 1: Basic Info (name, description, dates)
  - Step 2: Add Members from Organization with Roles
  - Step 3: Define Custom Roles (optional)
  - Step 4: Review and Create

### 2. Member Roles System
**Default Roles:**
- Developer
- QA (Quality Assurance)
- Designer
- Business Analyst
- Project Manager (from project_role: owner/lead)

**Custom Roles:**
- User-defined role names
- Role descriptions
- Assigned to specific project members

### 3. Project Dashboard
After creation, redirect to `/dashboard/projects/[projectId]` with tabs:
- **Overview** - Project stats and info
- **Kanban Board** - Task management
- **Sprints** - Sprint planning and tracking
- **Team** - Member management
- **Settings** - Project settings

### 4. Kanban Board (`/dashboard/projects/[projectId]/kanban`)
**Columns:**
- To Do
- In Progress
- In Review
- Done
- Blocked

**Features:**
- Drag and drop tasks between columns
- Create new tasks inline
- Task cards showing:
  - Title
  - Assignee avatar
  - Priority badge
  - Due date
  - Task ID

### 5. Sprint Management (`/dashboard/projects/[projectId]/sprints`)
**Features:**
- List of all sprints (planned, active, completed)
- Create new sprint form:
  - Sprint name
  - Goal/objective
  - Start/end dates
  - Select tasks to include
- Sprint board view (Kanban for sprint tasks only)
- Sprint burndown chart
- Sprint completion stats

---

## Database Schema Updates

### New Fields in `projects` table:
```sql
ALTER TABLE projects ADD COLUMN start_date TIMESTAMPTZ;
ALTER TABLE projects ADD COLUMN end_date TIMESTAMPTZ;
```

### New Table: `project_custom_roles`
```sql
CREATE TABLE project_custom_roles (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(id),
  name TEXT NOT NULL,
  description TEXT,
  permissions JSONB,
  created_at TIMESTAMPTZ
);
```

### New Field in `project_members`:
```sql
ALTER TABLE project_members ADD COLUMN custom_role TEXT;
```

---

## File Structure

```
app/dashboard/
├── organizations/
│   └── [orgId]/
│       ├── page.tsx (Add "Create Project" button)
│       └── projects/
│           └── new/
│               └── page.tsx (Enhanced creation form)
│
└── projects/
    └── [projectId]/
        ├── page.tsx (Redirect to overview)
        ├── overview/
        │   └── page.tsx (Project dashboard)
        ├── kanban/
        │   └── page.tsx (Kanban board)
        ├── sprints/
        │   ├── page.tsx (Sprints list)
        │   ├── new/
        │   │   └── page.tsx (Create sprint)
        │   └── [sprintId]/
        │       └── page.tsx (Sprint detail)
        ├── team/
        │   └── page.tsx (Team management)
        └── settings/
            └── page.tsx (Project settings)
```

---

## Implementation Steps

### Phase 1: Database & Types ✅
1. Run migration for custom roles
2. Update TypeScript types
3. Add database helper functions

### Phase 2: Enhanced Project Creation
1. Update organization dashboard with "Create Project" button
2. Build multi-step project creation form
3. Add member selection from organization
4. Add role assignment (default + custom)
5. Implement custom role creation

### Phase 3: Project Dashboard
1. Create project layout with tabs
2. Build overview page with stats
3. Add team member list
4. Show recent activity

### Phase 4: Kanban Board
1. Create Kanban board layout
2. Implement drag-and-drop with DnD Kit
3. Add task creation modal
4. Add task edit/delete functionality
5. Real-time updates (optional)

### Phase 5: Sprint Management
1. Create sprints list page
2. Build sprint creation form
3. Implement sprint board view
4. Add task assignment to sprints
5. Sprint statistics and burndown

---

## Component Architecture

### New Components to Create:

```
components/
├── project/
│   ├── ProjectCard.tsx
│   ├── MemberSelector.tsx
│   ├── RoleSelector.tsx
│   └── CustomRoleForm.tsx
│
├── kanban/
│   ├── KanbanBoard.tsx
│   ├── KanbanColumn.tsx
│   ├── TaskCard.tsx
│   ├── CreateTaskModal.tsx
│   └── TaskDetailModal.tsx
│
└── sprint/
    ├── SprintCard.tsx
    ├── SprintForm.tsx
    ├── SprintBoard.tsx
    └── BurndownChart.tsx
```

---

## API Functions to Add

### lib/database.ts additions:

```typescript
// Projects with dates
createProjectWithDates(data: ProjectInsertWithDates): Promise<Project>

// Custom Roles
createCustomRole(projectId, name, description): Promise<CustomRole>
getProjectCustomRoles(projectId): Promise<CustomRole[]>
deleteCustomRole(roleId): Promise<void>

// Project Members with Custom Roles
addProjectMemberWithRole(data): Promise<ProjectMember>
updateMemberRole(memberId, role, customRole?): Promise<ProjectMember>

// Sprints
createSprint(data): Promise<Sprint>
getProjectSprints(projectId): Promise<Sprint[]>
getSprintTasks(sprintId): Promise<Task[]>
updateSprintStatus(sprintId, status): Promise<Sprint>

// Tasks (Kanban)
createTask(data): Promise<Task>
updateTaskStatus(taskId, status): Promise<Task>
updateTaskColumn(taskId, status): Promise<Task>
assignTaskToUser(taskId, userId): Promise<Task>
```

---

## User Flow

### Creating a Project:
1. User clicks "Create Project" on org dashboard
2. Step 1: Enter project name, description, start/end dates
3. Step 2: Select members from organization
4. Step 3: Assign roles (Developer, QA, Designer, BA) or create custom roles
5. Step 4: Review all details
6. Click "Create Project"
7. Redirect to project dashboard

### Using Kanban Board:
1. Navigate to project → Kanban tab
2. View columns: To Do, In Progress, Review, Done, Blocked
3. Create new task by clicking "+ Add Task" in any column
4. Drag tasks between columns to update status
5. Click task to see details/edit
6. Assign to team member
7. Set priority and due date

### Managing Sprints:
1. Navigate to project → Sprints tab
2. See list of all sprints
3. Click "Create Sprint"
4. Enter sprint details (name, goal, dates)
5. Select tasks from backlog to include
6. Start sprint
7. View sprint progress on sprint board
8. Complete sprint when done

---

## Next Actions

1. ✅ Create SQL migration for custom roles
2. Update types in `/types/database.ts`
3. Add database functions in `/lib/database.ts`
4. Update organization dashboard with "Create Project" button
5. Build enhanced project creation form
6. Create project dashboard layout
7. Implement Kanban board
8. Build sprint management

---

This is a comprehensive system that will take the project management to the next level!
