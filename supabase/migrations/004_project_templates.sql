-- =====================================================
-- Project Templates
-- =====================================================

-- Templates table
CREATE TABLE IF NOT EXISTS project_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  icon TEXT DEFAULT 'folder',
  color TEXT DEFAULT '#3B82F6',
  is_system BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Template tasks (pre-defined tasks that get created when template is applied)
CREATE TABLE IF NOT EXISTS template_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES project_templates(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo',
  priority TEXT NOT NULL DEFAULT 'medium',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- Seed System Templates
-- =====================================================

-- 1. Software Sprint Template
INSERT INTO project_templates (id, name, description, category, icon, color, is_system, organization_id)
VALUES (
  'a1b2c3d4-0001-4000-8000-000000000001',
  'Software Sprint',
  'Agile software development with sprint-ready tasks including planning, development, testing, and deployment phases.',
  'engineering',
  'code',
  '#3B82F6',
  TRUE,
  NULL
);

INSERT INTO template_tasks (template_id, title, description, status, priority, sort_order) VALUES
  ('a1b2c3d4-0001-4000-8000-000000000001', 'Sprint Planning', 'Define sprint goals, estimate stories, and assign tasks to team members.', 'todo', 'high', 1),
  ('a1b2c3d4-0001-4000-8000-000000000001', 'Set up development environment', 'Configure local dev environment, install dependencies, and verify build.', 'todo', 'high', 2),
  ('a1b2c3d4-0001-4000-8000-000000000001', 'Implement core feature', 'Build the main feature for this sprint based on the requirements.', 'todo', 'high', 3),
  ('a1b2c3d4-0001-4000-8000-000000000001', 'Write unit tests', 'Create unit tests covering the new feature logic.', 'todo', 'medium', 4),
  ('a1b2c3d4-0001-4000-8000-000000000001', 'Code review', 'Review pull requests and provide feedback to team members.', 'todo', 'medium', 5),
  ('a1b2c3d4-0001-4000-8000-000000000001', 'QA testing', 'Perform manual and automated QA testing on the sprint deliverables.', 'todo', 'medium', 6),
  ('a1b2c3d4-0001-4000-8000-000000000001', 'Bug fixes', 'Fix any bugs found during the QA testing phase.', 'todo', 'high', 7),
  ('a1b2c3d4-0001-4000-8000-000000000001', 'Deploy to staging', 'Deploy the sprint build to the staging environment for final review.', 'todo', 'medium', 8),
  ('a1b2c3d4-0001-4000-8000-000000000001', 'Sprint retrospective', 'Review what went well, what can be improved, and action items for the next sprint.', 'todo', 'low', 9);

-- 2. Marketing Campaign Template
INSERT INTO project_templates (id, name, description, category, icon, color, is_system, organization_id)
VALUES (
  'a1b2c3d4-0002-4000-8000-000000000002',
  'Marketing Campaign',
  'End-to-end marketing campaign workflow covering research, content creation, launch, and performance tracking.',
  'marketing',
  'megaphone',
  '#8B5CF6',
  TRUE,
  NULL
);

INSERT INTO template_tasks (template_id, title, description, status, priority, sort_order) VALUES
  ('a1b2c3d4-0002-4000-8000-000000000002', 'Market research & audience analysis', 'Research target audience demographics, pain points, and preferred channels.', 'todo', 'high', 1),
  ('a1b2c3d4-0002-4000-8000-000000000002', 'Define campaign goals & KPIs', 'Set measurable objectives and key performance indicators for the campaign.', 'todo', 'high', 2),
  ('a1b2c3d4-0002-4000-8000-000000000002', 'Create content calendar', 'Plan content topics, formats, and publishing schedule across all channels.', 'todo', 'medium', 3),
  ('a1b2c3d4-0002-4000-8000-000000000002', 'Design visual assets', 'Create graphics, banners, social media images, and other visual materials.', 'todo', 'medium', 4),
  ('a1b2c3d4-0002-4000-8000-000000000002', 'Write copy & messaging', 'Draft ad copy, email content, social posts, and landing page text.', 'todo', 'medium', 5),
  ('a1b2c3d4-0002-4000-8000-000000000002', 'Set up tracking & analytics', 'Configure UTM parameters, conversion pixels, and analytics dashboards.', 'todo', 'high', 6),
  ('a1b2c3d4-0002-4000-8000-000000000002', 'Launch campaign', 'Go live with the campaign across all planned channels.', 'todo', 'urgent', 7),
  ('a1b2c3d4-0002-4000-8000-000000000002', 'Monitor & optimize', 'Track performance daily and make adjustments to improve results.', 'todo', 'medium', 8),
  ('a1b2c3d4-0002-4000-8000-000000000002', 'Post-campaign report', 'Compile final results, insights, and recommendations for future campaigns.', 'todo', 'low', 9);

-- 3. General Project Template
INSERT INTO project_templates (id, name, description, category, icon, color, is_system, organization_id)
VALUES (
  'a1b2c3d4-0003-4000-8000-000000000003',
  'General Project',
  'A flexible project template suitable for any team with common planning, execution, and review tasks.',
  'general',
  'folder',
  '#10B981',
  TRUE,
  NULL
);

INSERT INTO template_tasks (template_id, title, description, status, priority, sort_order) VALUES
  ('a1b2c3d4-0003-4000-8000-000000000003', 'Define project scope', 'Outline project objectives, deliverables, constraints, and success criteria.', 'todo', 'high', 1),
  ('a1b2c3d4-0003-4000-8000-000000000003', 'Create project timeline', 'Break down the project into phases with milestones and deadlines.', 'todo', 'high', 2),
  ('a1b2c3d4-0003-4000-8000-000000000003', 'Assign team responsibilities', 'Allocate tasks and responsibilities to each team member.', 'todo', 'medium', 3),
  ('a1b2c3d4-0003-4000-8000-000000000003', 'Kickoff meeting', 'Hold an initial team meeting to align on goals and expectations.', 'todo', 'medium', 4),
  ('a1b2c3d4-0003-4000-8000-000000000003', 'Execute Phase 1', 'Complete the first major phase of the project deliverables.', 'todo', 'high', 5),
  ('a1b2c3d4-0003-4000-8000-000000000003', 'Mid-project review', 'Assess progress, identify risks, and adjust the plan as needed.', 'todo', 'medium', 6),
  ('a1b2c3d4-0003-4000-8000-000000000003', 'Execute Phase 2', 'Complete the second major phase of the project deliverables.', 'todo', 'high', 7),
  ('a1b2c3d4-0003-4000-8000-000000000003', 'Final review & sign-off', 'Review all deliverables and get stakeholder approval.', 'todo', 'high', 8),
  ('a1b2c3d4-0003-4000-8000-000000000003', 'Project retrospective', 'Document lessons learned and best practices for future projects.', 'todo', 'low', 9);

-- =====================================================
-- RLS Policies
-- =====================================================

ALTER TABLE project_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_tasks ENABLE ROW LEVEL SECURITY;

-- Everyone can view system templates
CREATE POLICY "Anyone can view system templates"
  ON project_templates FOR SELECT
  USING (is_system = TRUE);

-- Org members can view their org's custom templates
CREATE POLICY "Org members can view org templates"
  ON project_templates FOR SELECT
  USING (
    organization_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = project_templates.organization_id
        AND organization_members.user_id = auth.uid()
    )
  );

-- Org admins/managers can create templates
CREATE POLICY "Admins can create org templates"
  ON project_templates FOR INSERT
  WITH CHECK (
    organization_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = project_templates.organization_id
        AND organization_members.user_id = auth.uid()
        AND organization_members.role IN ('admin', 'manager')
    )
  );

-- Org admins/managers can update their org templates
CREATE POLICY "Admins can update org templates"
  ON project_templates FOR UPDATE
  USING (
    is_system = FALSE
    AND organization_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = project_templates.organization_id
        AND organization_members.user_id = auth.uid()
        AND organization_members.role IN ('admin', 'manager')
    )
  );

-- Org admins/managers can delete their org templates
CREATE POLICY "Admins can delete org templates"
  ON project_templates FOR DELETE
  USING (
    is_system = FALSE
    AND organization_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = project_templates.organization_id
        AND organization_members.user_id = auth.uid()
        AND organization_members.role IN ('admin', 'manager')
    )
  );

-- Template tasks: viewable if the template is viewable
CREATE POLICY "View template tasks"
  ON template_tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_templates
      WHERE project_templates.id = template_tasks.template_id
        AND (
          project_templates.is_system = TRUE
          OR EXISTS (
            SELECT 1 FROM organization_members
            WHERE organization_members.organization_id = project_templates.organization_id
              AND organization_members.user_id = auth.uid()
          )
        )
    )
  );

-- Template tasks: insertable if you can edit the template
CREATE POLICY "Manage template tasks"
  ON template_tasks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_templates
      WHERE project_templates.id = template_tasks.template_id
        AND project_templates.is_system = FALSE
        AND EXISTS (
          SELECT 1 FROM organization_members
          WHERE organization_members.organization_id = project_templates.organization_id
            AND organization_members.user_id = auth.uid()
            AND organization_members.role IN ('admin', 'manager')
        )
    )
  );

CREATE POLICY "Update template tasks"
  ON template_tasks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM project_templates
      WHERE project_templates.id = template_tasks.template_id
        AND project_templates.is_system = FALSE
        AND EXISTS (
          SELECT 1 FROM organization_members
          WHERE organization_members.organization_id = project_templates.organization_id
            AND organization_members.user_id = auth.uid()
            AND organization_members.role IN ('admin', 'manager')
        )
    )
  );

CREATE POLICY "Delete template tasks"
  ON template_tasks FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM project_templates
      WHERE project_templates.id = template_tasks.template_id
        AND project_templates.is_system = FALSE
        AND EXISTS (
          SELECT 1 FROM organization_members
          WHERE organization_members.organization_id = project_templates.organization_id
            AND organization_members.user_id = auth.uid()
            AND organization_members.role IN ('admin', 'manager')
        )
    )
  );
