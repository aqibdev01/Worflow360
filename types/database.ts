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

// AI Module Enum Types
export type DecompositionStatus = "none" | "suggested" | "partially_accepted" | "fully_accepted";
export type SkillLevel = "beginner" | "intermediate" | "expert";
export type DecompositionReviewStatus = "pending" | "accepted" | "partially_accepted" | "rejected";
export type RiskLevel = "low" | "medium" | "high" | "critical";

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
          security_question: string | null;
          security_answer: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          security_question?: string | null;
          security_answer?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          security_question?: string | null;
          security_answer?: string | null;
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
          start_date: string | null;
          end_date: string | null;
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
          start_date?: string | null;
          end_date?: string | null;
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
          start_date?: string | null;
          end_date?: string | null;
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
          custom_role: string | null;
          assigned_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          role?: ProjectRole;
          custom_role?: string | null;
          assigned_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          user_id?: string;
          role?: ProjectRole;
          custom_role?: string | null;
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
          story_points: number | null;
          estimated_days: number | null;
          actual_days: number | null;
          tags: string[];
          complexity_score: number | null;
          ai_suggested_assignee_id: string | null;
          ai_assignee_confidence: number | null;
          parent_task_id: string | null;
          is_ai_generated: boolean;
          decomposition_status: DecompositionStatus;
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
          story_points?: number | null;
          estimated_days?: number | null;
          actual_days?: number | null;
          tags?: string[];
          complexity_score?: number | null;
          ai_suggested_assignee_id?: string | null;
          ai_assignee_confidence?: number | null;
          parent_task_id?: string | null;
          is_ai_generated?: boolean;
          decomposition_status?: DecompositionStatus;
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
          story_points?: number | null;
          estimated_days?: number | null;
          actual_days?: number | null;
          tags?: string[];
          complexity_score?: number | null;
          ai_suggested_assignee_id?: string | null;
          ai_assignee_confidence?: number | null;
          parent_task_id?: string | null;
          is_ai_generated?: boolean;
          decomposition_status?: DecompositionStatus;
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
          velocity: number | null;
          capacity: number | null;
          ai_risk_score: number | null;
          ai_risk_factors: Json | null;
          ai_analyzed_at: string | null;
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
          velocity?: number | null;
          capacity?: number | null;
          ai_risk_score?: number | null;
          ai_risk_factors?: Json | null;
          ai_analyzed_at?: string | null;
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
          velocity?: number | null;
          capacity?: number | null;
          ai_risk_score?: number | null;
          ai_risk_factors?: Json | null;
          ai_analyzed_at?: string | null;
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
      user_skills: {
        Row: {
          id: string;
          user_id: string;
          skill: string;
          level: SkillLevel;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          skill: string;
          level?: SkillLevel;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          skill?: string;
          level?: SkillLevel;
          created_at?: string;
        };
      };
      ai_task_decompositions: {
        Row: {
          id: string;
          parent_task_id: string;
          suggested_subtasks: Json;
          model_version: string;
          confidence_score: number | null;
          status: DecompositionReviewStatus;
          created_at: string;
          reviewed_at: string | null;
          reviewed_by: string | null;
        };
        Insert: {
          id?: string;
          parent_task_id: string;
          suggested_subtasks: Json;
          model_version: string;
          confidence_score?: number | null;
          status?: DecompositionReviewStatus;
          created_at?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
        };
        Update: {
          id?: string;
          parent_task_id?: string;
          suggested_subtasks?: Json;
          model_version?: string;
          confidence_score?: number | null;
          status?: DecompositionReviewStatus;
          created_at?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
        };
      };
      ai_assignment_logs: {
        Row: {
          id: string;
          task_id: string;
          suggested_assignee_id: string;
          confidence_score: number | null;
          scoring_breakdown: Json | null;
          was_accepted: boolean | null;
          final_assignee_id: string | null;
          model_version: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          suggested_assignee_id: string;
          confidence_score?: number | null;
          scoring_breakdown?: Json | null;
          was_accepted?: boolean | null;
          final_assignee_id?: string | null;
          model_version: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          task_id?: string;
          suggested_assignee_id?: string;
          confidence_score?: number | null;
          scoring_breakdown?: Json | null;
          was_accepted?: boolean | null;
          final_assignee_id?: string | null;
          model_version?: string;
          created_at?: string;
        };
      };
      ai_bottleneck_reports: {
        Row: {
          id: string;
          sprint_id: string;
          project_id: string;
          risk_level: RiskLevel;
          risk_score: number | null;
          bottlenecks: Json;
          recommendations: Json | null;
          model_version: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          sprint_id: string;
          project_id: string;
          risk_level: RiskLevel;
          risk_score?: number | null;
          bottlenecks: Json;
          recommendations?: Json | null;
          model_version: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          sprint_id?: string;
          project_id?: string;
          risk_level?: RiskLevel;
          risk_score?: number | null;
          bottlenecks?: Json;
          recommendations?: Json | null;
          model_version?: string;
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
      decomposition_status: DecompositionStatus;
      skill_level: SkillLevel;
      decomposition_review_status: DecompositionReviewStatus;
      risk_level: RiskLevel;
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
export type UserSkill = Database["public"]["Tables"]["user_skills"]["Row"];
export type UserSkillInsert = Database["public"]["Tables"]["user_skills"]["Insert"];
export type UserSkillUpdate = Database["public"]["Tables"]["user_skills"]["Update"];
export type AiTaskDecomposition = Database["public"]["Tables"]["ai_task_decompositions"]["Row"];
export type AiTaskDecompositionInsert = Database["public"]["Tables"]["ai_task_decompositions"]["Insert"];
export type AiTaskDecompositionUpdate = Database["public"]["Tables"]["ai_task_decompositions"]["Update"];
export type AiAssignmentLog = Database["public"]["Tables"]["ai_assignment_logs"]["Row"];
export type AiAssignmentLogInsert = Database["public"]["Tables"]["ai_assignment_logs"]["Insert"];
export type AiAssignmentLogUpdate = Database["public"]["Tables"]["ai_assignment_logs"]["Update"];
export type AiBottleneckReport = Database["public"]["Tables"]["ai_bottleneck_reports"]["Row"];
export type AiBottleneckReportInsert = Database["public"]["Tables"]["ai_bottleneck_reports"]["Insert"];
export type AiBottleneckReportUpdate = Database["public"]["Tables"]["ai_bottleneck_reports"]["Update"];

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
  subtasks?: Task[];
  parent_task?: Task | null;
  ai_suggested_assignee?: User | null;
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
  ai_bottleneck_reports?: AiBottleneckReport[];
}

export interface NotificationWithDetails extends Notification {
  users?: User;
}

// =====================================================
// AI Module Extended Types (for joins)
// =====================================================

export interface UserWithSkills extends User {
  user_skills?: UserSkill[];
}

export interface AiTaskDecompositionWithDetails extends AiTaskDecomposition {
  parent_task?: Task;
  reviewer?: User | null;
}

export interface AiAssignmentLogWithDetails extends AiAssignmentLog {
  task?: Task;
  suggested_assignee?: User;
  final_assignee?: User | null;
}

export interface AiBottleneckReportWithDetails extends AiBottleneckReport {
  sprint?: Sprint;
  project?: Project;
}

// JSON structure types for AI module JSONB columns
export interface AiScoringBreakdown {
  skill_match: number;
  workload: number;
  role_match: number;
  availability: number;
  [key: string]: number;
}

export interface AiBottleneckItem {
  type: string;
  description: string;
  affected_tasks: string[];
  severity: string;
}

export interface AiRecommendation {
  action: string;
  reason: string;
  priority: string;
}

export interface AiRiskFactors {
  overloaded_members?: string[];
  blockers?: string[];
  [key: string]: unknown;
}

export interface AiSuggestedSubtask {
  title: string;
  description: string;
  priority: TaskPriority;
  story_points: number | null;
  tags: string[];
  estimated_days: number | null;
}

// =====================================================
// Communication Hub Types
// =====================================================
export type ChannelType = "public" | "private" | "announcement";
export type ChannelMemberRole = "admin" | "member";
export type MessageType = "text" | "system" | "task_ref" | "file";
export type DMMessageType = "text" | "file" | "task_ref";

export interface Channel {
  id: string;
  organization_id: string;
  project_id: string | null;
  name: string;
  display_name: string;
  description: string | null;
  type: ChannelType;
  created_by: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChannelMember {
  id: string;
  channel_id: string;
  user_id: string;
  role: ChannelMemberRole;
  last_read_at: string;
  is_muted: boolean;
  joined_at: string;
}

export interface Message {
  id: string;
  channel_id: string;
  sender_id: string;
  content: string;
  type: MessageType;
  metadata: Record<string, any> | null;
  parent_message_id: string | null;
  reply_count: number;
  is_edited: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export interface DirectMessageThread {
  id: string;
  organization_id: string;
  created_at: string;
}

export interface DirectMessageParticipant {
  thread_id: string;
  user_id: string;
  last_read_at: string;
}

export interface DirectMessage {
  id: string;
  thread_id: string;
  sender_id: string;
  content: string;
  type: DMMessageType;
  metadata: Record<string, any> | null;
  is_edited: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

// Extended chat types
export interface MessageWithSender extends Message {
  users?: User | null;
  message_reactions?: MessageReaction[];
}

export interface ChannelWithMembers extends Channel {
  channel_members?: { count: number }[];
}

export interface ChannelWithUnread extends Channel {
  unread_count?: number;
  last_message?: Message | null;
}

export interface DMThreadWithDetails extends DirectMessageThread {
  direct_message_participants?: (DirectMessageParticipant & {
    users?: User;
  })[];
  last_message?: DirectMessage | null;
}
