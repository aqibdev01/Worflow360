import { supabase } from "../supabase";

// =====================================================
// Project Template Operations
// =====================================================

export interface ProjectTemplate {
  id: string;
  organization_id: string | null;
  name: string;
  description: string | null;
  category: string;
  icon: string;
  color: string;
  is_system: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  template_tasks?: TemplateTask[];
}

export interface TemplateTask {
  id: string;
  template_id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  sort_order: number;
}

/**
 * Get all available templates for an organization
 * Returns system templates + org-specific custom templates
 */
export async function getAvailableTemplates(
  orgId: string
): Promise<ProjectTemplate[]> {
  const { data, error } = await (supabase as any)
    .from("project_templates")
    .select("*, template_tasks(*)")
    .or(`is_system.eq.true,organization_id.eq.${orgId}`)
    .order("is_system", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Get a single template with its tasks
 */
export async function getTemplate(
  templateId: string
): Promise<ProjectTemplate> {
  const { data, error } = await (supabase as any)
    .from("project_templates")
    .select("*, template_tasks(*)")
    .eq("id", templateId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Create a custom template for an organization
 */
export async function createTemplate(
  orgId: string,
  data: {
    name: string;
    description?: string;
    category?: string;
    icon?: string;
    color?: string;
    created_by: string;
    tasks?: Array<{
      title: string;
      description?: string;
      status?: string;
      priority?: string;
      sort_order?: number;
    }>;
  }
): Promise<ProjectTemplate> {
  // Create the template
  const { data: template, error } = await (supabase as any)
    .from("project_templates")
    .insert({
      organization_id: orgId,
      name: data.name,
      description: data.description || null,
      category: data.category || "general",
      icon: data.icon || "folder",
      color: data.color || "#3B82F6",
      is_system: false,
      created_by: data.created_by,
    })
    .select()
    .single();

  if (error) throw error;

  // Create template tasks if provided
  if (data.tasks && data.tasks.length > 0) {
    const taskRows = data.tasks.map((task, index) => ({
      template_id: template.id,
      title: task.title,
      description: task.description || null,
      status: task.status || "todo",
      priority: task.priority || "medium",
      sort_order: task.sort_order ?? index + 1,
    }));

    const { error: taskError } = await (supabase as any)
      .from("template_tasks")
      .insert(taskRows);

    if (taskError) throw taskError;
  }

  return template;
}

/**
 * Apply a template to a project — creates tasks from the template
 */
export async function applyTemplate(
  projectId: string,
  templateId: string,
  createdBy: string
): Promise<void> {
  // Get template tasks
  const { data: templateTasks, error: fetchError } = await (supabase as any)
    .from("template_tasks")
    .select("*")
    .eq("template_id", templateId)
    .order("sort_order", { ascending: true });

  if (fetchError) throw fetchError;
  if (!templateTasks || templateTasks.length === 0) return;

  // Create actual tasks in the project
  const taskRows = templateTasks.map((t: TemplateTask) => ({
    project_id: projectId,
    title: t.title,
    description: t.description,
    status: t.status,
    priority: t.priority,
    created_by: createdBy,
  }));

  const { error: insertError } = await (supabase as any)
    .from("tasks")
    .insert(taskRows);

  if (insertError) throw insertError;
}

/**
 * Delete a custom template
 */
export async function deleteTemplate(templateId: string): Promise<void> {
  const { error } = await (supabase as any)
    .from("project_templates")
    .delete()
    .eq("id", templateId)
    .eq("is_system", false);

  if (error) throw error;
}

/**
 * Update a custom template
 */
export async function updateTemplate(
  templateId: string,
  data: {
    name?: string;
    description?: string;
    category?: string;
    icon?: string;
    color?: string;
  }
): Promise<ProjectTemplate> {
  const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.category !== undefined) updateData.category = data.category;
  if (data.icon !== undefined) updateData.icon = data.icon;
  if (data.color !== undefined) updateData.color = data.color;

  const { data: template, error } = await (supabase as any)
    .from("project_templates")
    .update(updateData)
    .eq("id", templateId)
    .eq("is_system", false)
    .select()
    .single();

  if (error) throw error;
  return template;
}
