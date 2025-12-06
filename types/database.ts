// Database Type Definitions for Workflow360
// Auto-generated types matching Supabase schema

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// Enum Types
export type MemberRole = "admin" | "manager" | "member";
export type ProjectStatus =
  | "planning"
  | "active"
  | "on_hold"
  | "completed"
  | "archived";
export type ProjectRole = "owner" | "lead" | "contributor" | "viewer";
export type TaskStatus = "todo" | "in_progress" | "review" | "done" | "blocked";
export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type SprintStatus = "planned" | "active" | "completed" | "cancelled";
export type SprintEventType = "planning" | "daily_standup" | "review" | "retrospective" | "meeting" | "milestone" | "other";
export type NotificationType = "info" | "success" | "warning" | "error" | "event";

// Database Tables
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      organizations: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          owner_id: string;
          invite_code: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          owner_id: string;
          invite_code: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          owner_id?: string;
          invite_code?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      organization_members: {
        Row: {
          id: string;
          org_id: string;
          user_id: string;
          role: MemberRole;
          joined_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          user_id: string;
          role?: MemberRole;
          joined_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          user_id?: string;
          role?: MemberRole;
          joined_at?: string;
        };
      };
      projects: {
        Row: {
          id: string;
          org_id: string;
          name: string;
          description: string | null;
          status: ProjectStatus;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          name: string;
          description?: string | null;
          status?: ProjectStatus;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          name?: string;
          description?: string | null;
          status?: ProjectStatus;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      project_members: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          role: ProjectRole;
          assigned_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          role?: ProjectRole;
          assigned_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          user_id?: string;
          role?: ProjectRole;
          assigned_at?: string;
        };
      };
      tasks: {
        Row: {
          id: string;
          project_id: string;
          sprint_id: string | null;
          title: string;
          description: string | null;
          status: TaskStatus;
          priority: TaskPriority;
          assignee_id: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
          due_date: string | null;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          project_id: string;
          sprint_id?: string | null;
          title: string;
          description?: string | null;
          status?: TaskStatus;
          priority?: TaskPriority;
          assignee_id?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
          due_date?: string | null;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          project_id?: string;
          sprint_id?: string | null;
          title?: string;
          description?: string | null;
          status?: TaskStatus;
          priority?: TaskPriority;
          assignee_id?: string | null;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
          due_date?: string | null;
          completed_at?: string | null;
        };
      };
      sprints: {
        Row: {
          id: string;
          project_id: string;
          name: string;
          goal: string | null;
          start_date: string;
          end_date: string;
          status: SprintStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          name: string;
          goal?: string | null;
          start_date: string;
          end_date: string;
          status?: SprintStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          name?: string;
          goal?: string | null;
          start_date?: string;
          end_date?: string;
          status?: SprintStatus;
          created_at?: string;
          updated_at?: string;
        };
      };
      sprint_events: {
        Row: {
          id: string;
          sprint_id: string;
          title: string;
          description: string | null;
          event_type: SprintEventType;
          event_date: string;
          start_time: string | null;
          end_time: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          sprint_id: string;
          title: string;
          description?: string | null;
          event_type: SprintEventType;
          event_date: string;
          start_time?: string | null;
          end_time?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          sprint_id?: string;
          title?: string;
          description?: string | null;
          event_type?: SprintEventType;
          event_date?: string;
          start_time?: string | null;
          end_time?: string | null;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          message: string;
          type: NotificationType;
          read: boolean;
          link: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          message: string;
          type?: NotificationType;
          read?: boolean;
          link?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          message?: string;
          type?: NotificationType;
          read?: boolean;
          link?: string | null;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_org_admin: {
        Args: {
          org_uuid: string;
          user_uuid: string;
        };
        Returns: boolean;
      };
      is_project_member: {
        Args: {
          project_uuid: string;
          user_uuid: string;
        };
        Returns: boolean;
      };
      get_user_org_role: {
        Args: {
          org_uuid: string;
          user_uuid: string;
        };
        Returns: string | null;
      };
    };
    Enums: {
      member_role: MemberRole;
      project_status: ProjectStatus;
      project_role: ProjectRole;
      task_status: TaskStatus;
      task_priority: TaskPriority;
      sprint_status: SprintStatus;
    };
  };
}

// Type helpers for easier usage
export type User = Database["public"]["Tables"]["users"]["Row"];
export type Organization = Database["public"]["Tables"]["organizations"]["Row"];
export type OrganizationMember =
  Database["public"]["Tables"]["organization_members"]["Row"];
export type Project = Database["public"]["Tables"]["projects"]["Row"];
export type ProjectMember =
  Database["public"]["Tables"]["project_members"]["Row"];
export type Task = Database["public"]["Tables"]["tasks"]["Row"];
export type Sprint = Database["public"]["Tables"]["sprints"]["Row"];
export type SprintEvent = Database["public"]["Tables"]["sprint_events"]["Row"];
export type Notification = Database["public"]["Tables"]["notifications"]["Row"];

// Insert types for creating new records
export type UserInsert = Database["public"]["Tables"]["users"]["Insert"];
export type OrganizationInsert =
  Database["public"]["Tables"]["organizations"]["Insert"];
export type OrganizationMemberInsert =
  Database["public"]["Tables"]["organization_members"]["Insert"];
export type ProjectInsert = Database["public"]["Tables"]["projects"]["Insert"];
export type ProjectMemberInsert =
  Database["public"]["Tables"]["project_members"]["Insert"];
export type TaskInsert = Database["public"]["Tables"]["tasks"]["Insert"];
export type SprintInsert = Database["public"]["Tables"]["sprints"]["Insert"];
export type SprintEventInsert = Database["public"]["Tables"]["sprint_events"]["Insert"];
export type NotificationInsert = Database["public"]["Tables"]["notifications"]["Insert"];

// Update types for updating existing records
export type UserUpdate = Database["public"]["Tables"]["users"]["Update"];
export type OrganizationUpdate =
  Database["public"]["Tables"]["organizations"]["Update"];
export type OrganizationMemberUpdate =
  Database["public"]["Tables"]["organization_members"]["Update"];
export type ProjectUpdate = Database["public"]["Tables"]["projects"]["Update"];
export type ProjectMemberUpdate =
  Database["public"]["Tables"]["project_members"]["Update"];
export type TaskUpdate = Database["public"]["Tables"]["tasks"]["Update"];
export type SprintUpdate = Database["public"]["Tables"]["sprints"]["Update"];
export type SprintEventUpdate = Database["public"]["Tables"]["sprint_events"]["Update"];
export type NotificationUpdate = Database["public"]["Tables"]["notifications"]["Update"];

// Extended types with relations (for joins)
export interface UserWithProfile extends User {
  organizations?: Organization[];
  projects?: Project[];
}

export interface OrganizationWithMembers extends Organization {
  organization_members?: (OrganizationMember & {
    users?: User;
  })[];
  projects?: Project[];
}

export interface ProjectWithDetails extends Project {
  organizations?: Organization;
  project_members?: (ProjectMember & {
    users?: User;
  })[];
  tasks?: Task[];
  sprints?: Sprint[];
}

export interface TaskWithDetails extends Task {
  projects?: Project;
  assignee?: User;
  created_by_user?: User;
  sprints?: Sprint;
}

export interface SprintWithTasks extends Sprint {
  projects?: Project;
  tasks?: Task[];
}

export interface SprintEventWithDetails extends SprintEvent {
  created_by_user?: User;
  sprints?: Sprint;
}

export interface SprintWithDetails extends Sprint {
  projects?: Project;
  tasks?: TaskWithDetails[];
  sprint_events?: SprintEvent[];
}

export interface NotificationWithDetails extends Notification {
  users?: User;
}
