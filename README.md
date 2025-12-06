# Workflow360

A comprehensive workflow management application built with Next.js 14, TypeScript, and Supabase.

## Features

- **Next.js 14** with App Router for modern React development
- **TypeScript** for type-safe code with full database typing
- **Tailwind CSS** for styling
- **Supabase** integration for backend services
  - PostgreSQL database with Row Level Security (RLS)
  - Real-time subscriptions
  - Authentication and authorization
- **Comprehensive Database Schema**
  - Multi-tenant organization structure
  - Project and task management
  - Sprint planning
  - Role-based access control (RBAC)
- **ESLint** and **Prettier** for code quality and formatting

## Project Structure

```
workflow360/
├── app/              # Next.js app directory (routes, layouts, pages)
├── components/       # Reusable React components
├── hooks/            # Custom React hooks
├── lib/              # Library code and configurations
│   ├── supabase.ts   # Typed Supabase client
│   └── database.ts   # Database utility functions
├── types/            # TypeScript type definitions
│   ├── database.ts   # Auto-generated database types
│   └── index.ts      # Application types
├── utils/            # Utility functions
├── supabase/         # Database migrations and schema
│   ├── migrations/   # SQL migration files
│   ├── README.md     # Database documentation
│   ├── QUICK_START.md # Quick setup guide
│   └── SCHEMA_DIAGRAM.md # Visual schema reference
└── public/           # Static assets
```

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm, yarn, or pnpm
- Supabase account (free tier available)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd workflow360
```

2. Install dependencies:
```bash
npm install
```

3. Set up Supabase database:
   - Follow the [Database Quick Start Guide](supabase/QUICK_START.md)
   - Or see [Full Database Documentation](supabase/README.md)

4. Set up environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` and add your Supabase credentials:
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key

5. Verify setup:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### Development

Run the development server:

```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

### Build

Build the application for production:

```bash
npm run build
```

### Lint

Run ESLint to check code quality:

```bash
npm run lint
```

### Format

Format code with Prettier:

```bash
npm run format
```

## Technologies

- **Framework**: [Next.js 14](https://nextjs.org/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Backend**: [Supabase](https://supabase.com/)
- **Code Quality**: ESLint, Prettier

## Database Schema

Workflow360 uses a comprehensive PostgreSQL database schema with the following tables:

### Core Tables
- **users** - User profiles (extends Supabase Auth)
- **organizations** - Multi-tenant organizations
- **organization_members** - Org membership with roles (admin/manager/member)
- **projects** - Projects within organizations
- **project_members** - Project membership with roles (owner/lead/contributor/viewer)
- **tasks** - Task management with status and priority
- **sprints** - Sprint planning and management

### Key Features
- ✅ **Row Level Security (RLS)** - Secure data access policies
- ✅ **Role-Based Access Control** - Organization and project-level permissions
- ✅ **Cascade Deletes** - Proper foreign key constraints
- ✅ **Automatic Timestamps** - Auto-updating created_at/updated_at
- ✅ **Type Safety** - Full TypeScript typing for database operations

### Documentation
- 📖 [Quick Start Guide](supabase/QUICK_START.md) - Get up and running in 5 minutes
- 📖 [Full Database Documentation](supabase/README.md) - Complete schema reference
- 📖 [Schema Diagram](supabase/SCHEMA_DIAGRAM.md) - Visual ER diagram and relationships
- 📖 [Database Utilities](lib/database.ts) - Pre-built query functions

### Database Setup

**Quick Setup (Recommended)**

1. Create a [Supabase](https://supabase.com/) project
2. Run the migration from [supabase/migrations/20250126_initial_schema.sql](supabase/migrations/20250126_initial_schema.sql)
3. Add credentials to `.env.local`
4. Start building!

See the [Quick Start Guide](supabase/QUICK_START.md) for detailed instructions.

## Usage Examples

### Using Database Utility Functions

```typescript
import {
  createOrganization,
  createProject,
  createTask
} from "@/lib/database";

// Create an organization
const org = await createOrganization({
  name: "Acme Corp",
  description: "Our company",
  owner_id: userId,
});

// Create a project
const project = await createProject({
  org_id: org.id,
  name: "Website Redesign",
  status: "active",
  created_by: userId,
});

// Create a task
const task = await createTask({
  project_id: project.id,
  title: "Design homepage",
  status: "todo",
  priority: "high",
  created_by: userId,
});
```

### Using Typed Supabase Client

```typescript
import { supabase } from "@/lib/supabase";

// Type-safe query with relations
const { data: tasks } = await supabase
  .from("tasks")
  .select(`
    *,
    assignee:users!assignee_id(full_name, avatar_url),
    projects(name, organizations(name))
  `)
  .eq("status", "in_progress");

// TypeScript knows the exact shape of the returned data
```

## Contributing

1. Create a feature branch
2. Make your changes
3. Run `npm run lint` and `npm run format`
4. Submit a pull request

## License

This project is licensed under the MIT License.
