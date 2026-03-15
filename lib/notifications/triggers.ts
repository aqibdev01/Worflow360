import { createNotification } from "./notifications";

// =====================================================
// Notification Trigger Helpers
// =====================================================
// Call these functions from relevant API routes/actions
// to create notifications for specific events.

/**
 * Notify a user that a task has been assigned to them.
 */
export async function notifyTaskAssigned(
  task: { id: string; title: string; project_id: string },
  assigneeId: string,
  assignedBy: { id: string; name: string },
  orgId: string
): Promise<void> {
  // Don't notify if assigning to yourself
  if (assigneeId === assignedBy.id) return;

  await createNotification({
    orgId,
    userId: assigneeId,
    type: "task_assigned",
    title: `${assignedBy.name} assigned you a task`,
    body: task.title,
    link: `/dashboard/projects/${task.project_id}?tab=board&highlight=${task.id}`,
    metadata: {
      taskId: task.id,
      projectId: task.project_id,
      senderId: assignedBy.id,
      senderName: assignedBy.name,
    },
  });
}

/**
 * Notify relevant users that a task status has changed.
 */
export async function notifyStatusChanged(
  task: {
    id: string;
    title: string;
    project_id: string;
    assignee_id: string | null;
    created_by: string;
  },
  newStatus: string,
  changedBy: { id: string; name: string },
  orgId: string
): Promise<void> {
  const statusLabels: Record<string, string> = {
    todo: "To Do",
    in_progress: "In Progress",
    review: "Review",
    done: "Done",
    blocked: "Blocked",
  };

  const statusLabel = statusLabels[newStatus] || newStatus;

  // Notify assignee and creator (but not the person who changed it)
  const notifyUserIds = new Set<string>();
  if (task.assignee_id && task.assignee_id !== changedBy.id) {
    notifyUserIds.add(task.assignee_id);
  }
  if (task.created_by !== changedBy.id) {
    notifyUserIds.add(task.created_by);
  }

  for (const userId of notifyUserIds) {
    await createNotification({
      orgId,
      userId,
      type: "task_status_changed",
      title: `Task moved to ${statusLabel}`,
      body: `${changedBy.name} changed "${task.title}" to ${statusLabel}`,
      link: `/dashboard/projects/${task.project_id}?tab=board&highlight=${task.id}`,
      metadata: {
        taskId: task.id,
        projectId: task.project_id,
        newStatus,
        senderId: changedBy.id,
        senderName: changedBy.name,
      },
    }).catch(() => {});
  }
}

/**
 * Notify a user they were @mentioned in a message.
 */
export async function notifyMentioned(
  mentionedUserId: string,
  context: {
    channelId?: string;
    channelName?: string;
    messagePreview: string;
  },
  mentionedBy: { id: string; name: string },
  orgId: string
): Promise<void> {
  if (mentionedUserId === mentionedBy.id) return;

  await createNotification({
    orgId,
    userId: mentionedUserId,
    type: "mentioned",
    title: `${mentionedBy.name} mentioned you`,
    body: context.messagePreview.slice(0, 100),
    link: context.channelId
      ? `/dashboard/organizations/${orgId}/communication/${context.channelId}`
      : undefined,
    metadata: {
      channelId: context.channelId,
      channelName: context.channelName,
      senderId: mentionedBy.id,
      senderName: mentionedBy.name,
    },
  });
}

/**
 * Notify a recipient that they received an internal mail.
 * (Also called from composeMail / sendDraft in mail.ts)
 */
export async function notifyMailReceived(
  mailId: string,
  recipientId: string,
  senderName: string,
  subject: string,
  orgId: string
): Promise<void> {
  await createNotification({
    orgId,
    userId: recipientId,
    type: "mail_received",
    title: `New mail from ${senderName}`,
    body: subject,
    link: `/dashboard/organizations/${orgId}/mail/${mailId}`,
    metadata: { mailId, senderName },
  });
}

/**
 * Notify a user that a file has been shared with them.
 */
export async function notifyFileShared(
  fileId: string,
  fileName: string,
  sharedWithUserId: string,
  sharedBy: { id: string; name: string },
  orgId: string
): Promise<void> {
  if (sharedWithUserId === sharedBy.id) return;

  await createNotification({
    orgId,
    userId: sharedWithUserId,
    type: "file_shared",
    title: `${sharedBy.name} shared a file with you`,
    body: fileName,
    link: `/dashboard/organizations/${orgId}/files`,
    metadata: {
      fileId,
      fileName,
      senderId: sharedBy.id,
      senderName: sharedBy.name,
    },
  });
}

/**
 * Notify org members that a new member has joined.
 * Typically called when someone joins via invite code.
 */
export async function notifyMemberJoined(
  orgId: string,
  newMember: { id: string; name: string },
  notifyUserIds: string[]
): Promise<void> {
  for (const userId of notifyUserIds) {
    if (userId === newMember.id) continue;

    await createNotification({
      orgId,
      userId,
      type: "member_joined",
      title: "New member joined",
      body: `${newMember.name} has joined the organization`,
      link: `/dashboard/organizations/${orgId}?tab=members`,
      metadata: {
        newMemberId: newMember.id,
        newMemberName: newMember.name,
      },
    }).catch(() => {});
  }
}
