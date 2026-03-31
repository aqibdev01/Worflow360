"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, X, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

// Common software skills for search suggestions
const COMMON_SKILLS = [
  "React", "Vue", "Angular", "Svelte", "Next.js", "Nuxt.js",
  "TypeScript", "JavaScript", "HTML", "CSS", "Tailwind CSS", "SASS",
  "Node.js", "Python", "FastAPI", "Django", "Flask", "Express",
  "Java", "Spring Boot", "Go", "Rust", "C#", ".NET", "PHP", "Laravel",
  "PostgreSQL", "MySQL", "MongoDB", "Redis", "Supabase", "Firebase",
  "REST API", "GraphQL", "gRPC",
  "Docker", "Kubernetes", "AWS", "Azure", "GCP", "Terraform",
  "CI/CD", "GitHub Actions", "Jenkins", "Linux", "Nginx",
  "Jest", "Playwright", "Cypress", "Selenium", "Unit Testing", "E2E",
  "Figma", "UI Design", "UX Research", "Wireframing", "Prototyping",
  "Technical Writing", "API Docs", "Agile", "Scrum",
  "Machine Learning", "Data Science", "TensorFlow", "PyTorch",
  "Git", "Shell Scripting", "Monitoring", "Load Testing",
];

type SkillLevel = "beginner" | "intermediate" | "expert";

interface UserSkill {
  id: string;
  skill: string;
  level: SkillLevel;
}

interface SkillsManagerProps {
  userId: string;
  readOnly?: boolean;
  className?: string;
}

const LEVEL_COLORS: Record<SkillLevel, string> = {
  beginner: "bg-gray-100 text-gray-700 border-gray-200",
  intermediate: "bg-blue-100 text-blue-700 border-blue-200",
  expert: "bg-green-100 text-green-700 border-green-200",
};

/**
 * Skills management component for user profiles.
 *
 * In edit mode: users can add/remove skills with level selection.
 * In readOnly mode: displays skills as badges (for viewing teammates).
 */
export function SkillsManager({
  userId,
  readOnly = false,
  className,
}: SkillsManagerProps) {
  const [skills, setSkills] = useState<UserSkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<SkillLevel>("intermediate");
  const [removingId, setRemovingId] = useState<string | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Load skills
  useEffect(() => {
    async function fetchSkills() {
      setLoading(true);
      const { data, error } = await supabase
        .from("user_skills")
        .select("id, skill, level")
        .eq("user_id", userId)
        .order("skill", { ascending: true });

      if (!error && data) {
        setSkills(data as UserSkill[]);
      }
      setLoading(false);
    }
    fetchSkills();
  }, [userId]);

  // Close suggestions on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter suggestions
  const existingSkillNames = new Set(skills.map((s) => s.skill.toLowerCase()));
  const filteredSuggestions = COMMON_SKILLS.filter(
    (s) =>
      !existingSkillNames.has(s.toLowerCase()) &&
      s.toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 8);

  const handleAddSkill = async (skillName: string) => {
    if (!skillName.trim()) return;
    if (existingSkillNames.has(skillName.toLowerCase())) {
      toast.error("You already have this skill");
      return;
    }

    setAdding(true);
    try {
      const { data, error } = await supabase
        .from("user_skills")
        .insert({
          user_id: userId,
          skill: skillName.trim(),
          level: selectedLevel,
        })
        .select("id, skill, level")
        .single();

      if (error) throw error;
      setSkills((prev) =>
        [...prev, data as UserSkill].sort((a, b) =>
          a.skill.localeCompare(b.skill)
        )
      );
      setSearchQuery("");
      setShowSuggestions(false);
      toast.success(`Added "${skillName}"`);
    } catch (error) {
      toast.error("Failed to add skill");
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveSkill = async (skillId: string) => {
    setRemovingId(skillId);
    try {
      const { error } = await supabase
        .from("user_skills")
        .delete()
        .eq("id", skillId);

      if (error) throw error;
      setSkills((prev) => prev.filter((s) => s.id !== skillId));
    } catch (error) {
      toast.error("Failed to remove skill");
    } finally {
      setRemovingId(null);
    }
  };

  const handleUpdateLevel = async (skillId: string, newLevel: SkillLevel) => {
    try {
      const { error } = await supabase
        .from("user_skills")
        .update({ level: newLevel })
        .eq("id", skillId);

      if (error) throw error;
      setSkills((prev) =>
        prev.map((s) => (s.id === skillId ? { ...s, level: newLevel } : s))
      );
    } catch (error) {
      toast.error("Failed to update level");
    }
  };

  if (loading) {
    return (
      <div className={`space-y-3 ${className || ""}`}>
        <h4 className="text-sm font-semibold">Skills</h4>
        <div className="flex gap-2">
          <div className="h-6 w-16 bg-muted animate-pulse rounded-full" />
          <div className="h-6 w-20 bg-muted animate-pulse rounded-full" />
          <div className="h-6 w-14 bg-muted animate-pulse rounded-full" />
        </div>
      </div>
    );
  }

  // Read-only mode — just badges
  if (readOnly) {
    return (
      <div className={`space-y-2 ${className || ""}`}>
        <h4 className="text-sm font-semibold">Skills</h4>
        {skills.length === 0 ? (
          <p className="text-xs text-muted-foreground">No skills listed</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {skills.map((skill) => (
              <Badge
                key={skill.id}
                variant="outline"
                className={`text-xs ${LEVEL_COLORS[skill.level]}`}
              >
                {skill.skill}
                <span className="ml-1 opacity-60 capitalize text-[10px]">
                  {skill.level}
                </span>
              </Badge>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Edit mode
  return (
    <div className={`space-y-3 ${className || ""}`}>
      <h4 className="text-sm font-semibold">My Skills</h4>

      {/* Skill list */}
      {skills.length > 0 && (
        <div className="space-y-1.5">
          {skills.map((skill) => (
            <div
              key={skill.id}
              className="flex items-center gap-2 group"
            >
              <Badge
                variant="outline"
                className={`text-xs ${LEVEL_COLORS[skill.level]}`}
              >
                {skill.skill}
              </Badge>

              <Select
                value={skill.level}
                onValueChange={(val) =>
                  handleUpdateLevel(skill.id, val as SkillLevel)
                }
              >
                <SelectTrigger className="h-6 w-[120px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="expert">Expert</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                onClick={() => handleRemoveSkill(skill.id)}
                disabled={removingId === skill.id}
              >
                {removingId === skill.id ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <X className="h-3 w-3" />
                )}
              </Button>
            </div>
          ))}
        </div>
      )}

      {skills.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Add your skills so AI can suggest better task assignments.
        </p>
      )}

      {/* Add skill form */}
      <div className="flex items-center gap-2" ref={searchRef}>
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search or type a skill..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && searchQuery.trim()) {
                handleAddSkill(searchQuery.trim());
              }
            }}
            className="h-8 pl-7 text-sm"
          />

          {/* Suggestions dropdown */}
          {showSuggestions && searchQuery && filteredSuggestions.length > 0 && (
            <div className="absolute z-50 top-full mt-1 w-full bg-popover border rounded-md shadow-md max-h-48 overflow-y-auto">
              {filteredSuggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent transition-colors"
                  onClick={() => handleAddSkill(suggestion)}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>

        <Select
          value={selectedLevel}
          onValueChange={(val) => setSelectedLevel(val as SkillLevel)}
        >
          <SelectTrigger className="h-8 w-[120px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="beginner">Beginner</SelectItem>
            <SelectItem value="intermediate">Intermediate</SelectItem>
            <SelectItem value="expert">Expert</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="sm"
          className="h-8"
          onClick={() => handleAddSkill(searchQuery.trim())}
          disabled={adding || !searchQuery.trim()}
        >
          {adding ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Plus className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>
    </div>
  );
}
