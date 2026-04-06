"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Filter,
  X,
  ExternalLink,
  Loader2,
  Clock,
  AlertTriangle,
  Bell,
  Target,
  Users,
  MessageSquare,
  Flag,
  Calendar as CalendarIconSolid,
} from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isToday,
  addMonths,
  subMonths,
  parseISO,
  isWithinInterval,
} from "date-fns";
import {
  getCalendarTasks,
  getCalendarTasksForManager,
  getManagedProjectMembers,
  getCalendarSprintEvents,
  getCalendarSprints,
  getUpcomingDeadlines,
  getOverdueTasks,
  getUpcomingSprintEvents,
} from "@/lib/database";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CalendarTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string;
  assignee_id: string | null;
  project_id: string;
  projects: { id: string; name: string } | null;
  assignee?: { id: string; full_name: string | null; email: string } | null;
}

interface SprintEvent {
  id: string;
  sprint_id: string;
  title: string;
  description: string | null;
  event_type: string;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  created_by: string;
  sprints?: {
    id: string;
    name: string;
    project_id: string;
    projects?: { id: string; name: string };
  };
  created_by_user?: { id: string; full_name: string | null; email: string };
}

interface CalendarSprint {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: string;
  project_id: string;
  projects?: { id: string; name: string };
}

interface ProjectMember {
  user_id: string;
  users: { id: string; full_name: string | null; email: string };
}

// ─── Config ───────────────────────────────────────────────────────────────────

const PRIORITY_STYLE: Record<string, string> = {
  urgent: "bg-red-100 text-red-700 border border-red-200 hover:bg-red-200",
  high: "bg-orange-100 text-orange-700 border border-orange-200 hover:bg-orange-200",
  medium: "bg-yellow-100 text-yellow-700 border border-yellow-200 hover:bg-yellow-200",
  low: "bg-emerald-100 text-emerald-700 border border-emerald-200 hover:bg-emerald-200",
};

const PRIORITY_DOT: Record<string, string> = {
  urgent: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-yellow-500",
  low: "bg-emerald-500",
};

const STATUS_LABEL: Record<string, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  review: "In Review",
  done: "Done",
  blocked: "Blocked",
};

const EVENT_TYPE_CONFIG: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  planning: { icon: Target, color: "text-blue-600", bg: "bg-blue-100 border-blue-200", label: "Planning" },
  daily_standup: { icon: Users, color: "text-green-600", bg: "bg-green-100 border-green-200", label: "Standup" },
  review: { icon: MessageSquare, color: "text-purple-600", bg: "bg-purple-100 border-purple-200", label: "Review" },
  retrospective: { icon: Clock, color: "text-orange-600", bg: "bg-orange-100 border-orange-200", label: "Retro" },
  meeting: { icon: Users, color: "text-indigo-600", bg: "bg-indigo-100 border-indigo-200", label: "Meeting" },
  milestone: { icon: Flag, color: "text-red-600", bg: "bg-red-100 border-red-200", label: "Milestone" },
  other: { icon: CalendarIconSolid, color: "text-gray-600", bg: "bg-gray-100 border-gray-200", label: "Event" },
};

const SPRINT_COLORS = [
  "bg-indigo-600/8 border-indigo-500/20",
  "bg-violet-600/8 border-violet-500/20",
  "bg-emerald-500/8 border-emerald-500/20",
  "bg-amber-500/8 border-amber-500/20",
  "bg-pink-500/8 border-pink-500/20",
];

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MAX_VISIBLE_ITEMS = 3;

// ─── Helper: build calendar grid ─────────────────────────────────────────────

function buildCalendarDays(date: Date): Date[] {
  const start = startOfWeek(startOfMonth(date), { weekStartsOn: 0 });
  const end = endOfWeek(endOfMonth(date), { weekStartsOn: 0 });
  const days: Date[] = [];
  let current = start;
  while (current <= end) {
    days.push(current);
    current = addDays(current, 1);
  }
  while (days.length < 42) {
    days.push(addDays(days[days.length - 1], 1));
  }
  return days;
}

// ─── Event chip component ────────────────────────────────────────────────────

function EventChip({ event, onClick }: { event: SprintEvent; onClick: () => void }) {
  const config = EVENT_TYPE_CONFIG[event.event_type] || EVENT_TYPE_CONFIG.other;
  const Icon = config.icon;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            className={`w-full text-left px-1.5 py-0.5 rounded text-[11px] font-medium truncate flex items-center gap-1 transition-colors border ${config.bg}`}
          >
            <Icon className={`h-3 w-3 flex-shrink-0 ${config.color}`} />
            <span className="truncate">{event.title}</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-[240px] space-y-1.5 p-3">
          <p className="font-semibold text-sm leading-tight">{event.title}</p>
          <Badge variant="outline" className="text-[10px] capitalize px-1.5">
            {config.label}
          </Badge>
          {event.start_time && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {event.start_time}{event.end_time ? ` - ${event.end_time}` : ""}
            </p>
          )}
          {event.sprints?.projects && (
            <p className="text-xs text-muted-foreground truncate">
              {event.sprints.name} &middot; {event.sprints.projects.name}
            </p>
          )}
          {event.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">{event.description}</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ─── Task chip component ──────────────────────────────────────────────────────

function TaskChip({
  task,
  onClick,
  isManager,
}: {
  task: CalendarTask;
  onClick: () => void;
  isManager: boolean;
}) {
  const assigneeName =
    task.assignee?.full_name ||
    task.assignee?.email?.split("@")[0] ||
    "Unassigned";

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            className={`w-full text-left px-1.5 py-0.5 rounded text-[11px] font-medium truncate flex items-center gap-1 transition-colors ${
              PRIORITY_STYLE[task.priority] || PRIORITY_STYLE.low
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${
                PRIORITY_DOT[task.priority] || "bg-gray-400"
              }`}
            />
            <span className="truncate">{task.title}</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-[220px] space-y-1.5 p-3">
          <p className="font-semibold text-sm leading-tight">{task.title}</p>
          <div className="flex flex-wrap gap-1">
            <Badge variant="outline" className="text-[10px] capitalize px-1.5">
              {task.priority}
            </Badge>
            <Badge variant="secondary" className="text-[10px] px-1.5">
              {STATUS_LABEL[task.status] || task.status}
            </Badge>
          </div>
          {task.projects && (
            <p className="text-xs text-muted-foreground truncate">
              {task.projects.name}
            </p>
          )}
          {isManager && task.assignee_id && (
            <p className="text-xs text-muted-foreground">{assigneeName}</p>
          )}
          <p className="text-xs text-primary flex items-center gap-1">
            <ExternalLink className="h-3 w-3" />
            Click to open project
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ─── Day Detail Dialog ────────────────────────────────────────────────────────

function DayDetailDialog({
  open,
  onOpenChange,
  date,
  tasks,
  events,
  sprints,
  isManager,
  onTaskClick,
  onEventClick,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  date: Date | null;
  tasks: CalendarTask[];
  events: SprintEvent[];
  sprints: CalendarSprint[];
  isManager: boolean;
  onTaskClick: (task: CalendarTask) => void;
  onEventClick: (event: SprintEvent) => void;
}) {
  if (!date) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-indigo-600" />
            {format(date, "EEEE, MMMM d, yyyy")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Active sprints on this day */}
          {sprints.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Active Sprints
              </h4>
              <div className="space-y-1">
                {sprints.map((s) => (
                  <div key={s.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600/5 border border-indigo-500/15">
                    <div className="h-2 w-2 rounded-full bg-indigo-600" />
                    <span className="text-sm font-medium">{s.name}</span>
                    <Badge variant="outline" className="text-[10px] ml-auto capitalize">{s.status}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sprint Events */}
          {events.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Events ({events.length})
              </h4>
              <div className="space-y-2">
                {events.map((ev) => {
                  const config = EVENT_TYPE_CONFIG[ev.event_type] || EVENT_TYPE_CONFIG.other;
                  const Icon = config.icon;
                  return (
                    <button
                      key={ev.id}
                      onClick={() => onEventClick(ev)}
                      className={`w-full text-left px-3 py-2 rounded-lg border transition-colors hover:shadow-sm ${config.bg}`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className={`h-4 w-4 ${config.color}`} />
                        <span className="font-medium text-sm">{ev.title}</span>
                        <Badge variant="outline" className="text-[10px] ml-auto capitalize">{config.label}</Badge>
                      </div>
                      {ev.start_time && (
                        <p className="text-xs text-muted-foreground mt-1 ml-6">
                          {ev.start_time}{ev.end_time ? ` - ${ev.end_time}` : ""}
                        </p>
                      )}
                      {ev.sprints && (
                        <p className="text-xs text-muted-foreground mt-0.5 ml-6">
                          {ev.sprints.name}{ev.sprints.projects ? ` · ${ev.sprints.projects.name}` : ""}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tasks */}
          {tasks.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Tasks Due ({tasks.length})
              </h4>
              <div className="space-y-2">
                {tasks.map((task) => (
                  <button
                    key={task.id}
                    onClick={() => onTaskClick(task)}
                    className={`w-full text-left px-3 py-2 rounded-lg border transition-colors hover:shadow-sm ${
                      PRIORITY_STYLE[task.priority] || PRIORITY_STYLE.low
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full flex-shrink-0 ${PRIORITY_DOT[task.priority] || "bg-gray-400"}`} />
                      <span className="font-medium text-sm">{task.title}</span>
                      <Badge variant="secondary" className="text-[10px] ml-auto">{STATUS_LABEL[task.status]}</Badge>
                    </div>
                    {task.projects && (
                      <p className="text-xs text-muted-foreground mt-0.5 ml-4">{task.projects.name}</p>
                    )}
                    {isManager && task.assignee && (
                      <p className="text-xs text-muted-foreground mt-0.5 ml-4">
                        {task.assignee.full_name || task.assignee.email}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {tasks.length === 0 && events.length === 0 && sprints.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-4">
              Nothing scheduled for this day
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [tasks, setTasks] = useState<CalendarTask[]>([]);
  const [sprintEvents, setSprintEvents] = useState<SprintEvent[]>([]);
  const [sprints, setSprints] = useState<CalendarSprint[]>([]);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [isManager, setIsManager] = useState(false);

  // Reminders panel
  const [upcomingTasks, setUpcomingTasks] = useState<CalendarTask[]>([]);
  const [overdueTasks, setOverdueTasks] = useState<CalendarTask[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<SprintEvent[]>([]);

  // PM filters
  const [filterMember, setFilterMember] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterType, setFilterType] = useState("all"); // all | tasks | events

  // Day detail dialog
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [dayDialogOpen, setDayDialogOpen] = useState(false);

  // Calendar grid
  const calendarDays = useMemo(() => buildCalendarDays(currentDate), [currentDate]);
  const rangeStart = format(calendarDays[0], "yyyy-MM-dd");
  const rangeEnd = format(calendarDays[calendarDays.length - 1], "yyyy-MM-dd");

  // Detect if user is a manager
  const checkManagerStatus = useCallback(async (userId: string) => {
    const mems = await getManagedProjectMembers(userId);
    setMembers(mems);
    setIsManager(mems.length > 0);
    return mems.length > 0;
  }, []);

  // Fetch all calendar data
  const fetchCalendarData = useCallback(
    async (userId: string, managerMode: boolean) => {
      setLoading(true);
      try {
        const [taskData, eventData, sprintData] = await Promise.all([
          managerMode
            ? getCalendarTasksForManager(userId, rangeStart, rangeEnd)
            : getCalendarTasks(userId, rangeStart, rangeEnd),
          getCalendarSprintEvents(userId, rangeStart, rangeEnd),
          getCalendarSprints(userId, rangeStart, rangeEnd),
        ]);
        setTasks(taskData as CalendarTask[]);
        setSprintEvents(eventData as SprintEvent[]);
        setSprints(sprintData as CalendarSprint[]);
      } catch (err) {
        console.error("Calendar fetch error:", err);
        setTasks([]);
        setSprintEvents([]);
        setSprints([]);
      } finally {
        setLoading(false);
      }
    },
    [rangeStart, rangeEnd]
  );

  // Fetch reminders data
  const fetchReminders = useCallback(async (userId: string) => {
    try {
      const [upcoming, overdue, events] = await Promise.all([
        getUpcomingDeadlines(userId, 7),
        getOverdueTasks(userId),
        getUpcomingSprintEvents(userId, 7),
      ]);
      setUpcomingTasks(upcoming as CalendarTask[]);
      setOverdueTasks(overdue as CalendarTask[]);
      setUpcomingEvents(events as SprintEvent[]);
    } catch {
      // silent fail for reminders
    }
  }, []);

  // Init
  useEffect(() => {
    if (authLoading || !user) return;
    checkManagerStatus(user.id).then((managerMode) => {
      fetchCalendarData(user.id, managerMode);
    });
    fetchReminders(user.id);
  }, [authLoading, user, checkManagerStatus, fetchCalendarData, fetchReminders]);

  // Navigate months
  const goToPrevMonth = () => setCurrentDate((d) => subMonths(d, 1));
  const goToNextMonth = () => setCurrentDate((d) => addMonths(d, 1));
  const goToToday = () => setCurrentDate(new Date());

  // Navigation
  const openTask = (task: CalendarTask) => {
    router.push(`/dashboard/projects/${task.project_id}?tab=kanban`);
  };

  const openEvent = (event: SprintEvent) => {
    if (event.sprints?.project_id) {
      router.push(`/dashboard/projects/${event.sprints.project_id}?tab=sprints`);
    }
  };

  // Filter tasks
  const filteredTasks = useMemo(() => {
    if (filterType === "events") return [];
    return tasks.filter((t) => {
      if (filterMember !== "all" && t.assignee_id !== filterMember) return false;
      if (filterPriority !== "all" && t.priority !== filterPriority) return false;
      return true;
    });
  }, [tasks, filterMember, filterPriority, filterType]);

  // Filter events
  const filteredEvents = useMemo(() => {
    if (filterType === "tasks") return [];
    return sprintEvents;
  }, [sprintEvents, filterType]);

  // Items per day
  const itemsByDate = useMemo(() => {
    const map: Record<string, { tasks: CalendarTask[]; events: SprintEvent[] }> = {};

    filteredTasks.forEach((t) => {
      const key = t.due_date.slice(0, 10);
      if (!map[key]) map[key] = { tasks: [], events: [] };
      map[key].tasks.push(t);
    });

    filteredEvents.forEach((e) => {
      const key = e.event_date.slice(0, 10);
      if (!map[key]) map[key] = { tasks: [], events: [] };
      map[key].events.push(e);
    });

    return map;
  }, [filteredTasks, filteredEvents]);

  // Sprint ranges for highlighting
  const getSprintForDay = useCallback(
    (day: Date): CalendarSprint[] => {
      return sprints.filter((s) => {
        try {
          const start = parseISO(s.start_date);
          const end = parseISO(s.end_date);
          return isWithinInterval(day, { start, end });
        } catch {
          return false;
        }
      });
    },
    [sprints]
  );

  // Day detail dialog data
  const selectedDayTasks = useMemo(() => {
    if (!selectedDay) return [];
    const key = format(selectedDay, "yyyy-MM-dd");
    return itemsByDate[key]?.tasks || [];
  }, [selectedDay, itemsByDate]);

  const selectedDayEvents = useMemo(() => {
    if (!selectedDay) return [];
    const key = format(selectedDay, "yyyy-MM-dd");
    return itemsByDate[key]?.events || [];
  }, [selectedDay, itemsByDate]);

  const selectedDaySprints = useMemo(() => {
    if (!selectedDay) return [];
    return getSprintForDay(selectedDay);
  }, [selectedDay, getSprintForDay]);

  const handleDayClick = (day: Date) => {
    setSelectedDay(day);
    setDayDialogOpen(true);
  };

  const hasActiveFilters = filterMember !== "all" || filterPriority !== "all" || filterType !== "all";
  const clearFilters = () => {
    setFilterMember("all");
    setFilterPriority("all");
    setFilterType("all");
  };

  const totalItems = filteredTasks.length + filteredEvents.length;

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-indigo-600/10 rounded-xl flex items-center justify-center">
            <CalendarDays className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Calendar</h1>
            <p className="text-sm text-muted-foreground">
              {isManager ? "Tasks, events & team view" : "Your tasks & events"}
            </p>
          </div>
        </div>

        {/* Month navigation */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToPrevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={goToNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Reminders Panel */}
      {(overdueTasks.length > 0 || upcomingTasks.length > 0 || upcomingEvents.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Overdue */}
          {overdueTasks.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <span className="text-sm font-semibold text-red-700">Overdue ({overdueTasks.length})</span>
              </div>
              <div className="space-y-1.5">
                {overdueTasks.slice(0, 3).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => openTask(t)}
                    className="w-full text-left text-xs px-2 py-1.5 rounded bg-white/60 hover:bg-white transition-colors border border-red-100"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className={`h-1.5 w-1.5 rounded-full ${PRIORITY_DOT[t.priority]}`} />
                      <span className="truncate font-medium">{t.title}</span>
                    </div>
                    <div className="text-[10px] text-red-500 mt-0.5">
                      Due {format(parseISO(t.due_date), "MMM d")} &middot; {t.projects?.name}
                    </div>
                  </button>
                ))}
                {overdueTasks.length > 3 && (
                  <p className="text-[10px] text-red-500 font-medium">+{overdueTasks.length - 3} more</p>
                )}
              </div>
            </div>
          )}

          {/* Upcoming Deadlines */}
          {upcomingTasks.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Bell className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-semibold text-amber-700">Due This Week ({upcomingTasks.length})</span>
              </div>
              <div className="space-y-1.5">
                {upcomingTasks.slice(0, 3).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => openTask(t)}
                    className="w-full text-left text-xs px-2 py-1.5 rounded bg-white/60 hover:bg-white transition-colors border border-amber-100"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className={`h-1.5 w-1.5 rounded-full ${PRIORITY_DOT[t.priority]}`} />
                      <span className="truncate font-medium">{t.title}</span>
                    </div>
                    <div className="text-[10px] text-amber-600 mt-0.5">
                      {format(parseISO(t.due_date), "EEE, MMM d")} &middot; {t.projects?.name}
                    </div>
                  </button>
                ))}
                {upcomingTasks.length > 3 && (
                  <p className="text-[10px] text-amber-600 font-medium">+{upcomingTasks.length - 3} more</p>
                )}
              </div>
            </div>
          )}

          {/* Upcoming Events */}
          {upcomingEvents.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <CalendarDays className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-semibold text-blue-700">Upcoming Events ({upcomingEvents.length})</span>
              </div>
              <div className="space-y-1.5">
                {upcomingEvents.slice(0, 3).map((ev) => {
                  const config = EVENT_TYPE_CONFIG[ev.event_type] || EVENT_TYPE_CONFIG.other;
                  const Icon = config.icon;
                  return (
                    <button
                      key={ev.id}
                      onClick={() => openEvent(ev)}
                      className="w-full text-left text-xs px-2 py-1.5 rounded bg-white/60 hover:bg-white transition-colors border border-blue-100"
                    >
                      <div className="flex items-center gap-1.5">
                        <Icon className={`h-3 w-3 ${config.color}`} />
                        <span className="truncate font-medium">{ev.title}</span>
                      </div>
                      <div className="text-[10px] text-blue-500 mt-0.5">
                        {format(parseISO(ev.event_date), "EEE, MMM d")}
                        {ev.start_time ? ` at ${ev.start_time}` : ""}
                        {ev.sprints?.projects ? ` · ${ev.sprints.projects.name}` : ""}
                      </div>
                    </button>
                  );
                })}
                {upcomingEvents.length > 3 && (
                  <p className="text-[10px] text-blue-500 font-medium">+{upcomingEvents.length - 3} more</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Month title */}
      <div className="text-center">
        <h2 className="text-xl font-semibold text-foreground">
          {format(currentDate, "MMMM yyyy")}
        </h2>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap bg-white border rounded-xl px-4 py-3 shadow-sm">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Filter className="h-4 w-4" />
          <span className="font-medium">Filter:</span>
        </div>

        {/* Type filter */}
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="h-8 w-32 text-sm">
            <SelectValue placeholder="All items" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All items</SelectItem>
            <SelectItem value="tasks">Tasks only</SelectItem>
            <SelectItem value="events">Events only</SelectItem>
          </SelectContent>
        </Select>

        {isManager && (
          <Select value={filterMember} onValueChange={setFilterMember}>
            <SelectTrigger className="h-8 w-44 text-sm">
              <SelectValue placeholder="All members" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All members</SelectItem>
              {members.map((m) => (
                <SelectItem key={m.user_id} value={m.user_id}>
                  {m.users?.full_name || m.users?.email?.split("@")[0] || "Unknown"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="h-8 w-36 text-sm">
            <SelectValue placeholder="All priorities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs" onClick={clearFilters}>
            <X className="h-3 w-3" />
            Clear
          </Button>
        )}

        <span className="ml-auto text-xs text-muted-foreground">
          {totalItems} item{totalItems !== 1 ? "s" : ""} in view
        </span>
      </div>

      {/* Sprint Range Legend */}
      {sprints.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap text-xs bg-white border rounded-xl px-4 py-2.5 shadow-sm">
          <span className="font-medium text-foreground">Sprints:</span>
          {sprints.map((s, idx) => (
            <div key={s.id} className="flex items-center gap-1.5">
              <div
                className={`h-3 w-8 rounded border ${SPRINT_COLORS[idx % SPRINT_COLORS.length]}`}
              />
              <span className="text-muted-foreground">
                {s.name}
                {s.projects ? ` (${s.projects.name})` : ""}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Calendar Grid */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-b">
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Day cells */}
        {loading ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-center space-y-2">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mx-auto" />
              <p className="text-sm text-muted-foreground">Loading calendar...</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-7 divide-x divide-y">
            {calendarDays.map((day, idx) => {
              const dateKey = format(day, "yyyy-MM-dd");
              const dayData = itemsByDate[dateKey] || { tasks: [], events: [] };
              const dayItems = [...dayData.events, ...dayData.tasks];
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isTodayDate = isToday(day);
              const daySprints = getSprintForDay(day);
              const visibleItems = dayItems.slice(0, MAX_VISIBLE_ITEMS);
              const hiddenCount = dayItems.length - MAX_VISIBLE_ITEMS;

              // Sprint background coloring
              let sprintBg = "";
              if (daySprints.length > 0) {
                const sprintIdx = sprints.findIndex((s) => s.id === daySprints[0].id);
                sprintBg = SPRINT_COLORS[sprintIdx % SPRINT_COLORS.length];
              }

              return (
                <div
                  key={idx}
                  onClick={() => handleDayClick(day)}
                  className={`min-h-[110px] p-1.5 flex flex-col gap-1 cursor-pointer transition-colors hover:bg-muted/20 ${
                    !isCurrentMonth ? "bg-muted/30" : sprintBg ? sprintBg : "bg-white"
                  }`}
                >
                  {/* Date number */}
                  <div className="flex justify-end">
                    <span
                      className={`h-7 w-7 flex items-center justify-center text-sm rounded-full font-medium ${
                        isTodayDate
                          ? "bg-indigo-600 text-white font-bold"
                          : isCurrentMonth
                          ? "text-foreground"
                          : "text-muted-foreground/50"
                      }`}
                    >
                      {format(day, "d")}
                    </span>
                  </div>

                  {/* Items */}
                  <div className="space-y-0.5 flex-1">
                    {visibleItems.map((item: any) => {
                      if (item.event_type) {
                        return (
                          <EventChip
                            key={`ev-${item.id}`}
                            event={item}
                            onClick={() => openEvent(item)}
                          />
                        );
                      }
                      return (
                        <TaskChip
                          key={`task-${item.id}`}
                          task={item}
                          onClick={() => openTask(item)}
                          isManager={isManager}
                        />
                      );
                    })}

                    {hiddenCount > 0 && (
                      <button
                        className="w-full text-left px-1.5 py-0.5 text-[11px] text-indigo-600 hover:text-indigo-700 transition-colors font-medium"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDayClick(day);
                        }}
                      >
                        +{hiddenCount} more
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 flex-wrap text-xs text-muted-foreground bg-white border rounded-xl px-4 py-3 shadow-sm">
        <span className="font-medium text-foreground">Priority:</span>
        {[
          { label: "Urgent", dot: "bg-red-500" },
          { label: "High", dot: "bg-orange-500" },
          { label: "Medium", dot: "bg-yellow-500" },
          { label: "Low", dot: "bg-emerald-500" },
        ].map((p) => (
          <div key={p.label} className="flex items-center gap-1.5">
            <div className={`h-2.5 w-2.5 rounded-full ${p.dot}`} />
            {p.label}
          </div>
        ))}

        <span className="mx-2 text-border">|</span>

        <span className="font-medium text-foreground">Events:</span>
        {["planning", "daily_standup", "review", "meeting", "milestone"].map((type) => {
          const config = EVENT_TYPE_CONFIG[type];
          const Icon = config.icon;
          return (
            <div key={type} className="flex items-center gap-1">
              <Icon className={`h-3 w-3 ${config.color}`} />
              <span>{config.label}</span>
            </div>
          );
        })}

        <span className="ml-4 flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          Click any day for details
        </span>
      </div>

      {/* Empty state */}
      {!loading && totalItems === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <CalendarDays className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No tasks or events this month</p>
          <p className="text-sm mt-1">
            Assign due dates to tasks and create sprint events to see them here
          </p>
        </div>
      )}

      {/* Day Detail Dialog */}
      <DayDetailDialog
        open={dayDialogOpen}
        onOpenChange={setDayDialogOpen}
        date={selectedDay}
        tasks={selectedDayTasks}
        events={selectedDayEvents}
        sprints={selectedDaySprints}
        isManager={isManager}
        onTaskClick={(t) => { setDayDialogOpen(false); openTask(t); }}
        onEventClick={(e) => { setDayDialogOpen(false); openEvent(e); }}
      />
    </div>
  );
}
