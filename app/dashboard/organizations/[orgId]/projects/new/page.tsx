"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import {
  FolderKanban,
  Users,
  Calendar,
  Target,
  Loader2,
  ArrowLeft,
  Plus,
  X,
  CheckCircle2,
  Code,
  Palette,
  Bug,
  TrendingUp,
  Briefcase,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import {
  createProject,
  addProjectMemberWithRole,
  createCustomRole,
  getOrganizationMembers,
  getOrganization,
} from "@/lib/database";

// Validation schema
const projectSchema = z.object({
  name: z.string().min(3, "Project name must be at least 3 characters"),
  description: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  status: z.enum(["planning", "active", "on_hold", "completed", "archived"]),
  team_members: z.array(
    z.object({
      user_id: z.string(),
      role: z.string(),
      custom_role: z.string().optional(),
    })
  ).optional(),
});

type ProjectFormData = z.infer<typeof projectSchema>;

// Default role options with icons
const DEFAULT_ROLES = [
  { value: "developer", label: "Developer", icon: Code, color: "text-blue-600" },
  { value: "qa", label: "QA Engineer", icon: Bug, color: "text-green-600" },
  { value: "designer", label: "Designer", icon: Palette, color: "text-purple-600" },
  { value: "business_analyst", label: "Business Analyst", icon: TrendingUp, color: "text-orange-600" },
  { value: "project_manager", label: "Project Manager", icon: Briefcase, color: "text-red-600" },
];

// Project-level roles (owner, lead, contributor, viewer)
const PROJECT_LEVEL_ROLES = [
  { value: "lead", label: "Project Lead" },
  { value: "contributor", label: "Contributor" },
  { value: "viewer", label: "Viewer" },
];

export default function NewProjectPage() {
  const router = useRouter();
  const params = useParams();
  const orgId = params.orgId as string;
  const { user } = useAuth();

  const [currentStep, setCurrentStep] = useState(1);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);
  const [organizationMembers, setOrganizationMembers] = useState<any[]>([]);
  const [organizationName, setOrganizationName] = useState("");
  const [customRoles, setCustomRoles] = useState<Array<{ name: string; description: string }>>([]);
  const [newCustomRoleName, setNewCustomRoleName] = useState("");

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
    trigger,
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: "",
      description: "",
      start_date: "",
      end_date: "",
      status: "planning",
      team_members: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "team_members",
  });

  const formData = watch();

  // Load organization members
  useEffect(() => {
    const loadOrganizationData = async () => {
      try {
        setIsLoadingMembers(true);

        // Get organization details
        const org = await getOrganization(orgId);
        setOrganizationName(org.name);

        // Get organization members
        const members = await getOrganizationMembers(orgId);
        setOrganizationMembers(members);
      } catch (error) {
        console.error("Error loading organization data:", error);
        toast.error("Failed to load organization data");
      } finally {
        setIsLoadingMembers(false);
      }
    };

    loadOrganizationData();
  }, [orgId]);

  const handleNext = async () => {
    let isValid = false;

    if (currentStep === 1) {
      isValid = await trigger(["name", "description", "start_date", "end_date", "status"]);
    } else if (currentStep === 2) {
      isValid = true; // Members are optional
    }

    if (isValid) {
      setCurrentStep((prev) => Math.min(prev + 1, 3));
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const onSubmit = async (data: ProjectFormData) => {
    if (currentStep < 3) {
      handleNext();
      return;
    }

    if (!user) {
      toast.error("Authentication required", {
        description: "You must be logged in to create a project.",
      });
      return;
    }

    setIsCreating(true);

    try {
      console.log("Creating project with data:", data);

      // Create project
      const newProject = await createProject({
        org_id: orgId,
        name: data.name,
        description: data.description || null,
        status: data.status,
        start_date: data.start_date || null,
        end_date: data.end_date || null,
        created_by: user.id,
      });

      console.log("Project created:", newProject);

      // Create custom roles first
      if (customRoles.length > 0) {
        console.log("Creating custom roles:", customRoles);
        await Promise.all(
          customRoles.map((role) =>
            createCustomRole(newProject.id, role.name, role.description)
          )
        );
      }

      // Add creator as project owner
      await addProjectMemberWithRole({
        project_id: newProject.id,
        user_id: user.id,
        role: "owner",
        custom_role: "Project Manager",
      });

      // Add selected team members with their roles
      if (data.team_members && data.team_members.length > 0) {
        console.log("Adding team members:", data.team_members);
        await Promise.all(
          data.team_members.map((member) =>
            addProjectMemberWithRole({
              project_id: newProject.id,
              user_id: member.user_id,
              role: member.role || "contributor",
              custom_role: member.custom_role,
            })
          )
        );
      }

      toast.success("Project created!", {
        description: `${data.name} has been created successfully.`,
      });

      // Redirect to project dashboard
      setTimeout(() => {
        router.push(`/dashboard/projects/${newProject.id}`);
        router.refresh();
      }, 1000);
    } catch (error: any) {
      console.error("Error creating project:", error);
      toast.error("Failed to create project", {
        description: error.message || "An unexpected error occurred. Please try again.",
      });
      setIsCreating(false);
    }
  };

  const addTeamMember = (userId: string, userName: string) => {
    // Check if member already added
    const alreadyAdded = fields.some((field) => field.user_id === userId);
    if (alreadyAdded) {
      toast.error("Member already added");
      return;
    }

    append({ user_id: userId, role: "contributor", custom_role: "developer" });
    toast.success(`Added ${userName} to project team`);
  };

  const addCustomRole = () => {
    if (!newCustomRoleName.trim()) {
      toast.error("Please enter a role name");
      return;
    }

    // Check if role already exists
    const existsInDefaults = DEFAULT_ROLES.some(
      r => r.label.toLowerCase() === newCustomRoleName.toLowerCase() ||
           r.value.toLowerCase() === newCustomRoleName.toLowerCase()
    );
    const existsInCustom = customRoles.some(
      r => r.name.toLowerCase() === newCustomRoleName.toLowerCase()
    );
    const exists = existsInDefaults || existsInCustom;

    if (exists) {
      toast.error("This role already exists");
      return;
    }

    setCustomRoles([...customRoles, { name: newCustomRoleName.trim(), description: "" }]);
    setNewCustomRoleName("");
    toast.success(`Custom role "${newCustomRoleName}" added`);
  };

  const removeCustomRole = (index: number) => {
    setCustomRoles(customRoles.filter((_, i) => i !== index));
  };

  if (isLoadingMembers) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading organization data...</p>
        </div>
      </div>
    );
  }

  const STEPS = [
    { number: 1, title: "Project Details", description: "Basic information" },
    { number: 2, title: "Team & Roles", description: "Add members with roles" },
    { number: 3, title: "Review", description: "Confirm and create" },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <span>{organizationName}</span>
          <span>•</span>
          <span>New Project</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Create New Project</h1>
        <p className="text-muted-foreground mt-2">
          Set up a new project with team members and roles
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between">
        {STEPS.map((step, index) => (
          <div key={step.number} className="flex items-center flex-1">
            <div className="flex items-center gap-3">
              <div
                className={`flex items-center justify-center h-10 w-10 rounded-full border-2 transition-colors ${
                  currentStep >= step.number
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-muted-foreground/30 text-muted-foreground"
                }`}
              >
                {currentStep > step.number ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <span className="font-semibold">{step.number}</span>
                )}
              </div>
              <div className="hidden sm:block">
                <p
                  className={`text-sm font-medium ${
                    currentStep >= step.number ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {step.title}
                </p>
                <p className="text-xs text-muted-foreground">{step.description}</p>
              </div>
            </div>
            {index < STEPS.length - 1 && (
              <Separator
                className={`flex-1 mx-4 ${
                  currentStep > step.number ? "bg-primary" : "bg-muted-foreground/30"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Step 1: Project Details */}
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FolderKanban className="h-5 w-5 text-primary" />
                <CardTitle>Project Details</CardTitle>
              </div>
              <CardDescription>Basic information about your project</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Project Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="Q1 Marketing Campaign"
                  {...register("name")}
                  disabled={isCreating}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <textarea
                  id="description"
                  rows={4}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Describe the goals and objectives of this project..."
                  {...register("description")}
                  disabled={isCreating}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">
                    <Calendar className="h-4 w-4 inline mr-1" />
                    Start Date (Optional)
                  </Label>
                  <Input
                    id="start_date"
                    type="date"
                    {...register("start_date")}
                    disabled={isCreating}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end_date">
                    <Target className="h-4 w-4 inline mr-1" />
                    End Date (Optional)
                  </Label>
                  <Input
                    id="end_date"
                    type="date"
                    {...register("end_date")}
                    disabled={isCreating}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Project Status</Label>
                <select
                  id="status"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  {...register("status")}
                  disabled={isCreating}
                >
                  <option value="planning">Planning</option>
                  <option value="active">Active</option>
                  <option value="on_hold">On Hold</option>
                  <option value="completed">Completed</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Team Members with Roles (Combined with Custom Roles) */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  <CardTitle>Team Members & Roles</CardTitle>
                </div>
                <CardDescription>
                  Add team members and assign them roles
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Custom Roles Section */}
                <div className="space-y-3 p-4 bg-secondary/30 rounded-lg border">
                  <Label>Custom Roles (Optional)</Label>
                  <p className="text-sm text-muted-foreground">
                    Create project-specific roles beyond the default ones
                  </p>

                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter custom role name..."
                      value={newCustomRoleName}
                      onChange={(e) => setNewCustomRoleName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomRole())}
                    />
                    <Button type="button" onClick={addCustomRole} variant="outline">
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </div>

                  {customRoles.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {customRoles.map((role, index) => (
                        <Badge key={index} variant="secondary" className="gap-1">
                          {role.name}
                          <button
                            type="button"
                            onClick={() => removeCustomRole(index)}
                            className="ml-1 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Selected Team Members */}
                {fields.length > 0 && (
                  <div className="space-y-2">
                    <Label>Selected Members ({fields.length})</Label>
                    <div className="space-y-2">
                      {fields.map((field, index) => {
                        const member = organizationMembers.find(
                          (m) => m.users.id === field.user_id
                        );
                        const selectedRole = watch(`team_members.${index}.custom_role`);
                        const RoleIcon = DEFAULT_ROLES.find(r => r.value === selectedRole)?.icon || Briefcase;
                        const roleColor = DEFAULT_ROLES.find(r => r.value === selectedRole)?.color || "text-gray-600";

                        return (
                          <div
                            key={field.id}
                            className="flex items-center justify-between p-4 border rounded-lg"
                          >
                            <div className="flex items-center gap-3 flex-1">
                              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                <span className="text-sm font-medium text-primary">
                                  {member?.users.full_name?.charAt(0) || "?"}
                                </span>
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-medium">
                                  {member?.users.full_name || member?.users.email}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {member?.users.email}
                                </p>
                              </div>

                              {/* Role Selection */}
                              <div className="flex items-center gap-2">
                                <select
                                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                                  {...register(`team_members.${index}.role`)}
                                  disabled={isCreating}
                                >
                                  {PROJECT_LEVEL_ROLES.map((role) => (
                                    <option key={role.value} value={role.value}>
                                      {role.label}
                                    </option>
                                  ))}
                                </select>

                                {/* Custom Role Selection */}
                                <select
                                  className={`h-9 rounded-md border border-input bg-background px-3 text-sm ${roleColor}`}
                                  {...register(`team_members.${index}.custom_role`)}
                                  disabled={isCreating}
                                >
                                  {DEFAULT_ROLES.map((role) => (
                                    <option key={role.value} value={role.value}>
                                      {role.label}
                                    </option>
                                  ))}
                                  {customRoles.map((role, i) => (
                                    <option key={`custom-${i}`} value={role.name}>
                                      {role.name}
                                    </option>
                                  ))}
                                </select>

                                <RoleIcon className={`h-4 w-4 ${roleColor}`} />
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => remove(index)}
                              disabled={isCreating}
                              className="ml-2"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Available Members */}
                <div className="space-y-2">
                  <Label>Available Organization Members</Label>
                  {organizationMembers.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No other members in this organization yet</p>
                    </div>
                  ) : (
                    <div className="max-h-64 overflow-y-auto space-y-2 border rounded-lg p-3">
                      {organizationMembers
                        .filter((member) => member.users.id !== user?.id)
                        .map((member) => {
                          const isAdded = fields.some(
                            (field) => field.user_id === member.users.id
                          );
                          return (
                            <div
                              key={member.id}
                              className="flex items-center justify-between p-2 hover:bg-accent rounded-md transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                  <span className="text-xs font-medium text-primary">
                                    {member.users.full_name?.charAt(0) || "?"}
                                  </span>
                                </div>
                                <div>
                                  <p className="text-sm font-medium">
                                    {member.users.full_name || member.users.email}
                                  </p>
                                  <div className="flex items-center gap-2">
                                    <p className="text-xs text-muted-foreground">
                                      {member.users.email}
                                    </p>
                                    <Badge variant="secondary" className="text-xs">
                                      {member.role}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                              <Button
                                type="button"
                                size="sm"
                                variant={isAdded ? "secondary" : "outline"}
                                onClick={() =>
                                  addTeamMember(
                                    member.users.id,
                                    member.users.full_name || member.users.email
                                  )
                                }
                                disabled={isCreating || isAdded}
                              >
                                {isAdded ? (
                                  <>
                                    <CheckCircle2 className="h-4 w-4 mr-1" />
                                    Added
                                  </>
                                ) : (
                                  <>
                                    <Plus className="h-4 w-4 mr-1" />
                                    Add
                                  </>
                                )}
                              </Button>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>

                {/* Role Legend */}
                <div className="bg-secondary/50 border rounded-lg p-4">
                  <h4 className="text-sm font-medium mb-3">Default Roles</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {DEFAULT_ROLES.map((role) => {
                      const Icon = role.icon;
                      return (
                        <div key={role.value} className="flex items-center gap-2">
                          <Icon className={`h-4 w-4 ${role.color}`} />
                          <span className="text-sm">{role.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 3: Review */}
        {currentStep === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Review & Create</CardTitle>
              <CardDescription>
                Review all details before creating your project
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Project Name</h3>
                <p className="text-lg font-semibold">{formData.name}</p>
              </div>

              {formData.description && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Description</h3>
                  <p className="text-sm">{formData.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {formData.start_date && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Start Date</h3>
                    <p className="text-sm">{new Date(formData.start_date).toLocaleDateString()}</p>
                  </div>
                )}
                {formData.end_date && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">End Date</h3>
                    <p className="text-sm">{new Date(formData.end_date).toLocaleDateString()}</p>
                  </div>
                )}
              </div>

              <Separator />

              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">
                  Team Members ({(formData.team_members?.length || 0) + 1})
                </h3>
                <div className="space-y-2">
                  {/* Show creator */}
                  <div className="flex items-center justify-between p-3 border rounded-lg bg-primary/5">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-xs font-medium text-primary">You</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">You (Owner)</p>
                        <p className="text-xs text-muted-foreground">Project Manager</p>
                      </div>
                    </div>
                    <Badge>Owner</Badge>
                  </div>

                  {/* Show team members */}
                  {formData.team_members?.map((teamMember, index) => {
                    const member = organizationMembers.find(m => m.users.id === teamMember.user_id);
                    const roleInfo = DEFAULT_ROLES.find(r => r.value === teamMember.custom_role);
                    const RoleIcon = roleInfo?.icon || Briefcase;

                    return (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-xs font-medium text-primary">
                              {member?.users.full_name?.charAt(0) || "?"}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium">
                              {member?.users.full_name || member?.users.email}
                            </p>
                            <div className="flex items-center gap-2">
                              <RoleIcon className={`h-3 w-3 ${roleInfo?.color}`} />
                              <p className="text-xs text-muted-foreground capitalize">
                                {teamMember.custom_role?.replace("_", " ")}
                              </p>
                            </div>
                          </div>
                        </div>
                        <Badge variant="secondary" className="capitalize">
                          {teamMember.role}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </div>

              {customRoles.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-3">
                      Custom Roles ({customRoles.length})
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {customRoles.map((role, index) => (
                        <Badge key={index} variant="outline">
                          {role.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={currentStep === 1 ? () => router.back() : handleBack}
            disabled={isCreating}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {currentStep === 1 ? "Cancel" : "Back"}
          </Button>

          {currentStep < 3 ? (
            <Button type="button" onClick={handleNext} disabled={isCreating}>
              Next
              <CheckCircle2 className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button type="submit" disabled={isCreating}>
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Project...
                </>
              ) : (
                <>
                  <FolderKanban className="mr-2 h-4 w-4" />
                  Create Project
                </>
              )}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
