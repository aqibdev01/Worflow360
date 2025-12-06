# WORKFLOW360 - COMPLETE PROJECT DOCUMENTATION

> **Last Updated:** December 3, 2025
> **Version:** 0.1.0
> **Purpose:** Comprehensive reference for all components, modules, and code structure

---

## TABLE OF CONTENTS

1. [Project Overview](#project-overview)
2. [Type Definitions](#type-definitions)
3. [Hooks](#hooks)
4. [Utilities](#utilities)
5. [Library Functions](#library-functions)
6. [UI Components](#ui-components)
7. [App Routes & Pages](#app-routes--pages)
8. [Authentication Pages](#authentication-pages)
9. [Dashboard Pages](#dashboard-pages)
10. [Data Flow](#data-flow)
11. [Pending Implementations](#pending-implementations)

---

## PROJECT OVERVIEW

**Name:** Workflow360
**Type:** AI-Powered Project Management Application
**Framework:** Next.js 14 (App Router)
**Database:** Supabase (PostgreSQL)
**Authentication:** Supabase Auth with OAuth
**UI:** React + Tailwind CSS + shadcn/ui components

### Tech Stack
- **Frontend:** React 18, Next.js 14, TypeScript 5.9
- **Styling:** Tailwind CSS 3.4, class-variance-authority
- **Forms:** React Hook Form + Zod validation
- **Icons:** Lucide React
- **Notifications:** Sonner
- **Backend:** Supabase (Auth + Database)

### Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

---

## TYPE DEFINITIONS

### `/types/database.ts`
**Auto-generated Supabase schema types**

#### Enums
```typescript
MemberRole: "admin" | "manager" | "member"
ProjectStatus: "planning" | "active" | "on_hold" | "completed" | "archived"
ProjectRole: "owner" | "lead" | "contributor" | "viewer"
TaskStatus: "todo" | "in_progress" | "review" | "done" | "blocked"
TaskPriority: "low" | "medium" | "high" | "urgent"
SprintStatus: "planned" | "active" | "completed" | "cancelled"
```

#### Core Tables
- **User** - User profiles with email, full_name, avatar_url
- **Organization** - Organizations with name, description, invite_code, owner_id
- **OrganizationMember** - Membership with role (admin/manager/member)
- **Project** - Projects with status, dates, description, organization_id
- **ProjectMember** - Project membership with role
- **Task** - Tasks with status, priority, assignee, project, sprint
- **Sprint** - Sprints with status, dates, goals, project_id

#### Extended Types (with relations)
- `UserWithProfile` - User + organizations + projects
- `OrganizationWithMembers` - Org + members + user info
- `ProjectWithDetails` - Project + members + tasks + sprints
- `TaskWithDetails` - Task + assignee + project info
- `SprintWithTasks` - Sprint + tasks

### `/types/index.ts`
**Application-specific types**

```typescript
ApiResponse<T> - Generic API wrapper { data?: T, error?: string }
SessionUser - Authenticated user session object
MenuItem - Navigation menu items { label, href, icon }
Notification - Toast notifications { id, message, type }
```

---

## HOOKS

### `/hooks/useAuth.ts`
**Authentication context hook**

```typescript
useAuth() → {
  user: User | null,
  userProfile: UserWithProfile | null,
  loading: boolean,
  signOut: () => Promise<void>,
  refreshUser: () => Promise<void>
}
```

**Usage:**
```typescript
import { useAuth } from '@/hooks'
const { user, userProfile, loading } = useAuth()
```

---

## UTILITIES

### `/utils/index.ts`

```typescript
formatDate(date: Date): string
// Returns: "January 1, 2025"

generateId(): string
// Returns: unique ID using Math.random() + timestamp
```

---

## LIBRARY FUNCTIONS

### `/lib/supabase.ts`
**Supabase client initialization**

```typescript
supabase: SupabaseClient<Database>
isSupabaseConfigured(): boolean
```

### `/lib/utils.ts`
**UI utilities**

```typescript
cn(...inputs): string  // Merge Tailwind classes
generateInviteCode(): string  // 8-char alphanumeric code
```

### `/lib/auth.ts`
**Authentication functions**

#### Sign Up & Sign In
```typescript
signUp(credentials: SignUpCredentials): Promise<AuthResponse<User>>
// Creates auth user + user profile in database

signIn(credentials: SignInCredentials): Promise<AuthResponse<User>>
// Signs in and ensures profile exists

signOut(): Promise<AuthResponse<void>>
// Signs out current user
```

#### Password Management
```typescript
resetPassword(email: string): Promise<AuthResponse<void>>
// Sends password reset email

updatePassword(newPassword: string): Promise<AuthResponse<void>>
// Updates authenticated user's password
```

#### Session Management
```typescript
getCurrentUser(): Promise<User | null>
getSession(): Promise<Session | null>
refreshSession(): Promise<Session | null>
isAuthenticated(): Promise<boolean>
onAuthStateChange(callback: (user: User | null) => void)
```

#### OAuth
```typescript
signInWithOAuth(provider: 'google' | 'github' | 'gitlab' | 'azure'): Promise<AuthResponse<void>>
```

#### Profile Management
```typescript
getUserProfile(userId: string): Promise<UserWithProfile | null>
updateUserProfile(userId: string, updates: Partial<User>): Promise<AuthResponse<User>>
updateEmail(newEmail: string): Promise<AuthResponse<void>>
resendVerificationEmail(email: string): Promise<AuthResponse<void>>
```

### `/lib/database.ts`
**Type-safe database operations**

#### Organizations
```typescript
createOrganization(data: OrganizationInsert): Promise<Organization>
getUserOrganizations(userId: string): Promise<OrganizationWithMembers[]>
getOrganizationWithMembers(orgId: string): Promise<OrganizationWithMembers | null>
addOrganizationMember(data: OrganizationMemberInsert): Promise<OrganizationMember>
updateOrganizationMemberRole(memberId: string, role: MemberRole): Promise<OrganizationMember>
removeOrganizationMember(memberId: string): Promise<void>
getOrganizationByInviteCode(inviteCode: string): Promise<Organization | null>
isUserOrganizationMember(orgId: string, userId: string): Promise<boolean>
getOrganizationMembers(orgId: string): Promise<OrganizationMember[]>
```

#### Projects
```typescript
createProject(data: ProjectInsert): Promise<Project>
getOrganizationProjects(orgId: string): Promise<Project[]>
getProjectDetails(projectId: string): Promise<ProjectWithDetails | null>
updateProjectStatus(projectId: string, status: ProjectStatus): Promise<Project>
addProjectMember(data: ProjectMemberInsert): Promise<ProjectMember>
```

#### Tasks
```typescript
createTask(data: TaskInsert): Promise<Task>
getProjectTasks(projectId: string): Promise<Task[]>
getTasksByStatus(projectId: string, status: TaskStatus): Promise<Task[]>
getUserTasks(userId: string): Promise<TaskWithDetails[]>
updateTaskStatus(taskId: string, status: TaskStatus): Promise<Task>
assignTask(taskId: string, assigneeId: string): Promise<Task>
updateTaskPriority(taskId: string, priority: TaskPriority): Promise<Task>
```

#### Sprints
```typescript
createSprint(data: SprintInsert): Promise<Sprint>
getProjectSprints(projectId: string): Promise<Sprint[]>
getActiveSprint(projectId: string): Promise<Sprint | null>
updateSprintStatus(sprintId: string, status: SprintStatus): Promise<Sprint>
addTaskToSprint(taskId: string, sprintId: string): Promise<Task>
```

#### Analytics
```typescript
getProjectTaskStats(projectId: string): Promise<{
  byStatus: Record<TaskStatus, number>,
  byPriority: Record<TaskPriority, number>
}>
getUserTasksByProject(userId: string): Promise<{
  projectId: string,
  projectName: string,
  tasks: TaskWithDetails[]
}[]>
```

---

## UI COMPONENTS

### `/components/Logo.tsx`
```typescript
<Logo className?: string />
```
SVG logo with 360° cycle arrows

### `/components/ui/avatar.tsx`
```typescript
<Avatar
  src?: string
  alt?: string
  fallback?: string
/>
```
User avatar with fallback initials

### `/components/ui/badge.tsx`
```typescript
<Badge variant="default" | "secondary" | "destructive" | "outline" | "success" | "warning" />
```

### `/components/ui/button.tsx`
```typescript
<Button
  variant="default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size="default" | "sm" | "lg" | "icon"
/>
```

### `/components/ui/card.tsx`
```typescript
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>Content</CardContent>
  <CardFooter>Footer</CardFooter>
</Card>
```

### `/components/ui/checkbox.tsx`
```typescript
<Checkbox label?: string checked?: boolean />
```

### `/components/ui/dropdown-menu.tsx`
```typescript
<DropdownMenu>
  <DropdownMenuTrigger>Trigger</DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuLabel>Label</DropdownMenuLabel>
    <DropdownMenuItem>Item</DropdownMenuItem>
    <DropdownMenuSeparator />
  </DropdownMenuContent>
</DropdownMenu>
```

### `/components/ui/input.tsx`
```typescript
<Input type="text" placeholder="..." />
```

### `/components/ui/label.tsx`
```typescript
<Label htmlFor="field">Label</Label>
```

### `/components/ui/separator.tsx`
```typescript
<Separator orientation="horizontal" | "vertical" />
```

### `/components/ui/toaster.tsx`
```typescript
<Toaster />  // Place in root layout
```

---

## APP ROUTES & PAGES

### `/app/layout.tsx`
**Root layout**
- Sets up Inter font
- Wraps app in AuthProvider
- Includes Toaster component
- Sets metadata

### `/app/page.tsx`
**Landing page**
- Hero section
- Features grid (6 features)
- Benefits section (4 benefits)
- CTA section
- Footer with links

### `/app/providers/AuthProvider.tsx`
**Global auth context**
- Manages user session
- Auto-refreshes tokens
- Provides useAuth hook
- Listens to auth state changes

---

## AUTHENTICATION PAGES

### `/app/auth/callback/route.ts`
**OAuth callback handler**
- Exchanges code for session
- Redirects to /dashboard

### `/app/auth/login/page.tsx`
**Login page**
- Email + password form
- "Forgot password?" link
- Link to sign up
- Error display

### `/app/auth/signup/page.tsx`
**Registration page**
- Full name (optional)
- Email + password + confirm password
- Min 8 character validation
- Success screen
- Link to sign in

### `/app/auth/reset-password/page.tsx`
**Password reset (dual mode)**
- **Request mode:** Enter email, send reset link
- **Update mode:** Enter new password (when coming from email link)

---

## DASHBOARD PAGES

### `/app/dashboard/layout.tsx`
**Dashboard layout**
- Fixed sidebar with navigation
- Mobile responsive toggle
- Top bar with:
  - Breadcrumbs
  - Search
  - Notifications badge
  - User dropdown
- Sign out functionality

**Sidebar Navigation:**
- Dashboard
- Projects
- Organizations
- Calendar
- Analytics

### `/app/dashboard/page.tsx`
**Dashboard home**
- Welcome message with user name
- Empty state: Create/Join organization cards
- Getting started guide (4 steps)
- Features preview (3 cards)

### `/app/dashboard/organizations/page.tsx`
**Organizations list**
- Displays user's organizations
- Shows owner/admin badge
- Member count + project count
- Invite code display
- Create/Join buttons

### `/app/dashboard/organizations/new/page.tsx`
**Create organization (3 steps)**

**Step 1: Basic Info**
- Organization name (required, min 2 chars)
- Description (optional)

**Step 2: Invite Team**
- Add members with email + role
- Roles: admin, manager, member
- Dynamic add/remove

**Step 3: Review**
- Confirm details
- Generate invite code
- Create organization + add members

### `/app/dashboard/organizations/join/page.tsx`
**Join organization**
- Invite code input
- Pending invitations list
- Public organizations list
- Accept/decline buttons

### `/app/dashboard/organizations/[orgId]/page.tsx`
**Organization dashboard**
- Stats: projects, members, tasks, org ID
- Welcome message
- Getting started guide

### `/app/dashboard/organizations/[orgId]/projects/new/page.tsx`
**Create project**
- Project details:
  - Name, description
  - Start/end dates
  - Status
- Template selection:
  - Blank, Software, Marketing, Design
- Team member selection
- Form validation with Zod

### `/app/dashboard/organizations/[orgId]/projects/[projectId]/page.tsx`
**Organization-scoped project view**
- Success message after creation
- Project stats cards

### `/app/dashboard/projects/page.tsx`
**All projects list**
- User's projects across all organizations
- Project cards with:
  - Status badge
  - Organization name
  - Task count
  - Completion %
  - Created date
- Empty state

### `/app/dashboard/projects/[projectId]/page.tsx`
**Project detail page**
- Project header with description
- Status badge + metadata
- Overall progress bar
- Team member avatars
- Quick stats (tasks by status)
- Navigation tabs:
  - Kanban
  - Sprints
  - Team
  - Settings
- Recent activity feed
- Project health metrics
- Upcoming milestones

---

## DATA FLOW

### Authentication Flow
```
1. User signs up/signs in
   ↓
2. AuthProvider detects session
   ↓
3. Fetches user profile
   ↓
4. useAuth hook provides context
   ↓
5. Components access user data
```

### Organization Flow
```
1. Create organization
   ↓
2. Generate invite code
   ↓
3. Add creator as owner
   ↓
4. Invite team members
   ↓
5. Members join via code
```

### Project Flow
```
1. Select organization
   ↓
2. Create project
   ↓
3. Add team members
   ↓
4. Create tasks
   ↓
5. Assign to sprints
   ↓
6. Track progress
```

---

## PENDING IMPLEMENTATIONS

### Missing Database Functions
These are imported in pages but not yet implemented in `/lib/database.ts`:

```typescript
// Needed in: /app/dashboard/projects/page.tsx
getUserProjects(userId: string): Promise<Project[]>

// Needed in: /app/dashboard/organizations/[orgId]/page.tsx
getOrganization(orgId: string): Promise<Organization | null>

// NEW - Project Management Features
createCustomRole(projectId: string, name: string, description: string): Promise<CustomRole>
getProjectCustomRoles(projectId: string): Promise<CustomRole[]>
```

### Incomplete Pages
- **Kanban board** - Referenced in tabs but not created
- **Sprints page** - Referenced but not created
- **Team page** - Referenced but not created
- **Project settings** - Referenced but not created
- **Calendar view** - Nav link but no page
- **Analytics** - Nav link but no page

### Features to Implement
- Search functionality (search bar exists but not functional)
- Notifications system (badge shows but no backend)
- Activity feed (shown but static data)
- File attachments for tasks
- Comments on tasks
- Real-time updates (Supabase Realtime)
- Email notifications
- Task dependencies
- Gantt chart view
- Time tracking
- Reports and exports

---

## ARCHITECTURAL PATTERNS

1. **Type Safety** - End-to-end TypeScript with generated Supabase types
2. **Context Pattern** - AuthProvider for global state
3. **Custom Hooks** - Reusable logic extraction
4. **Form Validation** - Zod schemas + react-hook-form
5. **Component Composition** - Atomic design with shadcn/ui
6. **Dynamic Routes** - Next.js App Router with [orgId]/[projectId]
7. **Loading States** - Spinner + disabled states
8. **Error Handling** - Toast notifications via Sonner
9. **Responsive Design** - Mobile-first Tailwind
10. **Accessibility** - Semantic HTML + ARIA labels

---

## FILE STRUCTURE TREE

```
workflow360/
├── app/
│   ├── layout.tsx                          # Root layout
│   ├── page.tsx                            # Landing page
│   ├── providers/
│   │   └── AuthProvider.tsx                # Auth context
│   ├── auth/
│   │   ├── callback/route.ts               # OAuth callback
│   │   ├── login/page.tsx                  # Login form
│   │   ├── signup/page.tsx                 # Registration
│   │   └── reset-password/page.tsx         # Password reset
│   └── dashboard/
│       ├── layout.tsx                      # Dashboard layout
│       ├── page.tsx                        # Dashboard home
│       ├── organizations/
│       │   ├── page.tsx                    # Org list
│       │   ├── new/page.tsx                # Create org
│       │   ├── join/page.tsx               # Join org
│       │   └── [orgId]/
│       │       ├── page.tsx                # Org dashboard
│       │       └── projects/
│       │           ├── new/page.tsx        # Create project
│       │           └── [projectId]/page.tsx # Project view
│       └── projects/
│           ├── page.tsx                    # All projects
│           └── [projectId]/page.tsx        # Project details
│
├── components/
│   ├── Logo.tsx                            # Brand logo
│   └── ui/
│       ├── avatar.tsx                      # Avatar component
│       ├── badge.tsx                       # Status badges
│       ├── button.tsx                      # Button variants
│       ├── card.tsx                        # Card layouts
│       ├── checkbox.tsx                    # Checkbox input
│       ├── dropdown-menu.tsx               # Dropdown menus
│       ├── input.tsx                       # Text inputs
│       ├── label.tsx                       # Form labels
│       ├── separator.tsx                   # Visual dividers
│       └── toaster.tsx                     # Toast container
│
├── lib/
│   ├── index.ts                            # Lib exports
│   ├── supabase.ts                         # Supabase client
│   ├── auth.ts                             # Auth functions
│   ├── database.ts                         # DB operations
│   └── utils.ts                            # UI utilities
│
├── hooks/
│   ├── index.ts                            # Hook exports
│   └── useAuth.ts                          # Auth hook
│
├── types/
│   ├── index.ts                            # App types
│   └── database.ts                         # Supabase types
│
├── utils/
│   └── index.ts                            # General utilities
│
├── middleware.ts                           # Auth middleware
├── package.json                            # Dependencies
├── tailwind.config.ts                      # Tailwind config
└── tsconfig.json                           # TypeScript config
```

---

## QUICK REFERENCE

### Common Imports
```typescript
// Auth
import { useAuth } from '@/hooks'
import { signIn, signOut, signUp } from '@/lib/auth'

// Database
import {
  createOrganization,
  createProject,
  createTask,
  getUserOrganizations
} from '@/lib/database'

// UI Components
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

// Utils
import { cn } from '@/lib/utils'
import { formatDate } from '@/utils'

// Toast
import { toast } from 'sonner'

// Types
import type { User, Organization, Project, Task } from '@/types/database'
```

### Common Patterns

**Protected Page:**
```typescript
'use client'
import { useAuth } from '@/hooks'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function ProtectedPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login')
    }
  }, [user, loading, router])

  if (loading) return <div>Loading...</div>
  if (!user) return null

  return <div>Protected content</div>
}
```

**Form with Validation:**
```typescript
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email')
})

type FormData = z.infer<typeof schema>

export default function MyForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema)
  })

  const onSubmit = async (data: FormData) => {
    // Handle submission
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Input {...register('name')} />
      {errors.name && <span>{errors.name.message}</span>}
    </form>
  )
}
```

---

**End of Documentation**

> This file will be updated as the project evolves. Always reference this file before making changes to ensure consistency with existing patterns and architecture.
