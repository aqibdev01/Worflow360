"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Target,
  Clock,
  Users,
  MessageSquare,
  Flag,
  Calendar,
  Play,
  Square,
  CheckCircle2,
  Pencil,
} from "lucide-react";
import { format, differenceInDays, isWithinInterval, isBefore, isAfter, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

interface SprintEvent {
  id: string;
  title: string;
  description: string | null;
  event_type: string;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
}

interface Sprint {
  id: string;
  name: string;
  goal: string | null;
  start_date: string;
  end_date: string;
  status: string;
}

interface SprintTimelineProps {
  sprint: Sprint;
  events: SprintEvent[];
  isProjectManager: boolean;
  onStartSprint?: () => void;
  onStopSprint?: () => void;
  onEditSprint?: () => void;
  onAddEvent?: () => void;
  onEditEvent?: (event: SprintEvent) => void;
}

const eventTypeConfig: Record<string, { icon: any; color: string; bgColor: string }> = {
  planning: { icon: Target, color: "text-blue-600", bgColor: "bg-blue-100 dark:bg-blue-900/30" },
  daily_standup: { icon: Users, color: "text-green-600", bgColor: "bg-green-100 dark:bg-green-900/30" },
  review: { icon: MessageSquare, color: "text-purple-600", bgColor: "bg-purple-100 dark:bg-purple-900/30" },
  retrospective: { icon: Clock, color: "text-orange-600", bgColor: "bg-orange-100 dark:bg-orange-900/30" },
  meeting: { icon: Users, color: "text-indigo-600", bgColor: "bg-indigo-100 dark:bg-indigo-900/30" },
  milestone: { icon: Flag, color: "text-red-600", bgColor: "bg-red-100 dark:bg-red-900/30" },
  other: { icon: Calendar, color: "text-gray-600", bgColor: "bg-gray-100 dark:bg-gray-900/30" },
};

const statusConfig: Record<string, { label: string; color: string }> = {
  planned: { label: "Planned", color: "bg-blue-500/10 text-blue-700 border-blue-500/20" },
  active: { label: "Active", color: "bg-green-500/10 text-green-700 border-green-500/20" },
  completed: { label: "Completed", color: "bg-purple-500/10 text-purple-700 border-purple-500/20" },
  cancelled: { label: "Cancelled", color: "bg-gray-500/10 text-gray-700 border-gray-500/20" },
};

export function SprintTimeline({
  sprint,
  events,
  isProjectManager,
  onStartSprint,
  onStopSprint,
  onEditSprint,
  onAddEvent,
  onEditEvent,
}: SprintTimelineProps) {
  const today = new Date();
  const startDate = parseISO(sprint.start_date);
  const endDate = parseISO(sprint.end_date);

  const totalDays = differenceInDays(endDate, startDate) + 1;
  const elapsedDays = sprint.status === "active"
    ? Math.max(0, Math.min(totalDays, differenceInDays(today, startDate) + 1))
    : sprint.status === "completed"
      ? totalDays
      : 0;
  const progressPercentage = Math.round((elapsedDays / totalDays) * 100);
  const daysRemaining = Math.max(0, differenceInDays(endDate, today));

  // Sort events by date
  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) =>
      new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
    );
  }, [events]);

  // Group events by date
  const eventsByDate = useMemo(() => {
    const grouped: Record<string, SprintEvent[]> = {};
    sortedEvents.forEach(event => {
      const dateKey = format(parseISO(event.event_date), "yyyy-MM-dd");
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(event);
    });
    return grouped;
  }, [sortedEvents]);

  const config = statusConfig[sprint.status] || statusConfig.planned;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-3">
              <CardTitle className="text-xl">{sprint.name}</CardTitle>
              <Badge variant="outline" className={cn("border", config.color)}>
                {config.label}
              </Badge>
            </div>
            {sprint.goal && (
              <div className="flex items-start gap-2 text-sm text-muted-foreground mt-2">
                <Target className="h-4 w-4 mt-0.5 shrink-0" />
                <p>{sprint.goal}</p>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isProjectManager && sprint.status === "planned" && (
              <Button size="sm" onClick={onStartSprint} className="gap-1">
                <Play className="h-4 w-4" />
                Start Sprint
              </Button>
            )}
            {isProjectManager && sprint.status === "active" && (
              <Button size="sm" variant="outline" onClick={onStopSprint} className="gap-1">
                <Square className="h-4 w-4" />
                Complete Sprint
              </Button>
            )}
            {isProjectManager && (
              <Button size="sm" variant="ghost" onClick={onEditSprint}>
                <Pencil className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Timeline Progress Bar */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{format(startDate, "MMM d, yyyy")}</span>
            </div>
            <div className="flex items-center gap-2">
              <span>{format(endDate, "MMM d, yyyy")}</span>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>

          <div className="relative">
            {/* Background bar */}
            <div className="h-3 bg-secondary rounded-full overflow-hidden">
              {/* Progress fill */}
              <div
                className={cn(
                  "h-full transition-all duration-500 rounded-full",
                  sprint.status === "completed"
                    ? "bg-green-500"
                    : sprint.status === "active"
                      ? "bg-primary"
                      : "bg-muted-foreground/20"
                )}
                style={{ width: `${progressPercentage}%` }}
              />
            </div>

            {/* Today marker */}
            {sprint.status === "active" && isWithinInterval(today, { start: startDate, end: endDate }) && (
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-primary border-2 border-background rounded-full shadow-sm"
                style={{ left: `${progressPercentage}%`, transform: 'translate(-50%, -50%)' }}
              />
            )}

            {/* Event markers on timeline */}
            {sortedEvents.map((event) => {
              const eventDate = parseISO(event.event_date);
              if (isBefore(eventDate, startDate) || isAfter(eventDate, endDate)) return null;

              const eventPosition = ((differenceInDays(eventDate, startDate)) / totalDays) * 100;
              const typeConfig = eventTypeConfig[event.event_type] || eventTypeConfig.other;

              return (
                <div
                  key={event.id}
                  className="absolute top-1/2 -translate-y-1/2 group"
                  style={{ left: `${eventPosition}%`, transform: 'translate(-50%, -50%)' }}
                >
                  <div className={cn(
                    "w-2 h-2 rounded-full cursor-pointer transition-transform hover:scale-150",
                    typeConfig.bgColor
                  )} />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap border z-50">
                    {event.title}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{totalDays} days total</span>
            {sprint.status === "active" && (
              <span className="font-medium text-primary">
                {daysRemaining} days remaining
              </span>
            )}
            {sprint.status === "completed" && (
              <span className="flex items-center gap-1 text-green-600">
                <CheckCircle2 className="h-3 w-3" />
                Sprint completed
              </span>
            )}
          </div>
        </div>

        {/* Events Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Sprint Events & Milestones
            </h4>
            {isProjectManager && (
              <Button size="sm" variant="outline" onClick={onAddEvent} className="h-7 text-xs">
                Add Event
              </Button>
            )}
          </div>

          {sortedEvents.length === 0 ? (
            <div className="text-center py-6 text-sm text-muted-foreground bg-muted/30 rounded-lg">
              No events scheduled for this sprint.
              {isProjectManager && (
                <Button
                  variant="link"
                  size="sm"
                  onClick={onAddEvent}
                  className="ml-1 h-auto p-0"
                >
                  Add one now
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {Object.entries(eventsByDate).map(([dateKey, dateEvents]) => {
                const eventDate = parseISO(dateKey);
                const isToday = format(today, "yyyy-MM-dd") === dateKey;
                const isPast = isBefore(eventDate, today) && !isToday;

                return (
                  <div key={dateKey} className="relative">
                    <div className={cn(
                      "text-xs font-medium mb-1 flex items-center gap-2",
                      isToday ? "text-primary" : isPast ? "text-muted-foreground" : ""
                    )}>
                      {format(eventDate, "EEE, MMM d")}
                      {isToday && (
                        <Badge variant="default" className="text-xs py-0 h-4">
                          Today
                        </Badge>
                      )}
                    </div>
                    <div className="space-y-1.5 ml-2 pl-3 border-l-2 border-muted">
                      {dateEvents.map((event) => {
                        const typeConfig = eventTypeConfig[event.event_type] || eventTypeConfig.other;
                        const IconComponent = typeConfig.icon;

                        return (
                          <div
                            key={event.id}
                            className={cn(
                              "flex items-start gap-2 p-2 rounded-md transition-colors cursor-pointer hover:bg-accent/50",
                              isPast && "opacity-60"
                            )}
                            onClick={() => onEditEvent?.(event)}
                          >
                            <div className={cn("p-1 rounded", typeConfig.bgColor)}>
                              <IconComponent className={cn("h-3 w-3", typeConfig.color)} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm truncate">
                                  {event.title}
                                </span>
                                {event.start_time && (
                                  <span className="text-xs text-muted-foreground shrink-0">
                                    {event.start_time}
                                    {event.end_time && ` - ${event.end_time}`}
                                  </span>
                                )}
                              </div>
                              {event.description && (
                                <p className="text-xs text-muted-foreground truncate">
                                  {event.description}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
