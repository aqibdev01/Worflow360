# Workflow360 — Comprehensive Testing Guide

**Date**: March 15, 2026
**Version**: 2.0.0
**Coverage**: All implemented features — Auth, Orgs, Projects, Tasks, Sprints, Analytics, Calendar, Communication Hub, Files, Mail, Notifications

---

## 1. AUTHENTICATION

### 1.1 Login (`/auth/login`)

| # | Test Case | How to Test | Expected |
|---|-----------|-------------|----------|
| 1 | Valid login | Enter correct email + password, click Login | Redirect to `/dashboard` |
| 2 | Invalid email format | Type `notanemail` in email field | Real-time X icon, "Please enter a valid email" |
| 3 | Wrong password | Enter valid email + wrong password | Error toast from Supabase |
| 4 | Unconfirmed email | Login with email that hasn't verified OTP | Redirect to `/auth/verify-email?email=...` |
| 5 | Empty password | Leave password blank, submit | "Please enter your password" |
| 6 | Show/hide password | Click eye icon in password field | Toggles visibility |

### 1.2 Signup (`/auth/signup`)

| # | Test Case | How to Test | Expected |
|---|-----------|-------------|----------|
| 1 | Full name < 2 chars | Type single letter in name field | Validation error, can't submit |
| 2 | Invalid email | Type `abc` in email field | Real-time X icon, blocked |
| 3 | Weak password (< 8 chars) | Type `abc123` | Strength bar shows "Weak", blocked |
| 4 | Password missing uppercase | Type `password1!` | Missing requirement highlighted |
| 5 | Password missing special char | Type `Password1` | Missing requirement highlighted |
| 6 | Password strength ≥ 3/5 | Type `MyPass1!` | Strength bar green, allowed |
| 7 | Passwords don't match | Type different text in confirm field | Error "Passwords do not match", X icon |
| 8 | Security question blank | Leave security answer empty | Can't submit |
| 9 | Security answer < 2 chars | Type single letter | Validation error |
| 10 | Successful signup | Fill all valid fields, submit | Success page, auto-redirect to dashboard in 1.5s |
| 11 | Duplicate email | Use already-registered email | Supabase error shown |

**Password Strength Rules (5 points)**:
- ≥ 8 characters
- Contains uppercase letter
- Contains lowercase letter
- Contains number
- Contains special character (`!@#$%^&*()...`)
- Need ≥ 3 to pass

### 1.3 Password Reset (`/auth/forgot-password`)

| # | Test Case | How to Test | Expected |
|---|-----------|-------------|----------|
| 1 | Step 1: Valid email | Enter registered email, click Next | Shows security question (Step 2) |
| 2 | Step 1: Unknown email | Enter non-existent email | Error "Failed to find account" |
| 3 | Step 2: Correct security answer | Answer security question correctly (case-insensitive) | Proceed to Step 3 |
| 4 | Step 2: Wrong security answer | Answer incorrectly | Error, stays on Step 2 |
| 5 | Step 2: Legacy account (no question) | Email exists but no security Q set | Shows full name verification fallback |
| 6 | Step 3: Valid new password | Enter strong password + confirm | Password reset, redirect to login |
| 7 | Step 3: Weak new password | Enter `abc` | Validation errors shown |
| 8 | Step 3: Mismatched confirm | Different passwords | Error shown |
| 9 | Legacy user forced to set question | Complete reset as legacy user | Must choose security question + answer |
| 10 | Back button | Click back on steps 2/3 | Returns to previous step |

---

## 2. ORGANIZATIONS

### 2.1 Create Organization (`/dashboard/organizations/new`)

| # | Test Case | How to Test | Expected |
|---|-----------|-------------|----------|
| 1 | Name < 2 chars | Type 1 character, try to proceed | Validation error, Next button blocked |
| 2 | Valid name only | Type "My Org", skip description | Org created, creator is "admin" |
| 3 | Add team members | Search by email on Step 2, add members | Members added with "member" role |
| 4 | Search no results | Search for non-existent email | "No users found" message |
| 5 | Can't add self | Search for own email | Self filtered out of results |
| 6 | Can't add duplicate | Add same member twice | Error toast or prevented |
| 7 | Invite code generated | Complete creation | Invite code shown on org page |
| 8 | Step navigation | Click Back/Next through all 4 steps | Steps work correctly |

### 2.2 Join Organization (`/dashboard/organizations/join`)

| # | Test Case | How to Test | Expected |
|---|-----------|-------------|----------|
| 1 | Valid invite code | Enter valid 6+ char code | Join succeeds, redirect to org dashboard |
| 2 | Invalid code | Enter random text | Error "Invalid invite code" |
| 3 | Code < 6 chars | Type `abc` | Validation "Invite code must be at least 6 characters" |
| 4 | Revoked code | Use a code that admin has revoked | Rejected |
| 5 | Expired code | Use a code past its expiry date | Rejected |
| 6 | Max uses exceeded | Use code that has reached max_uses | Rejected |
| 7 | Already a member | Try joining org you're already in | Error or graceful handling |
| 8 | Notification sent | Join with valid code | Other org members receive "Member joined" notification |

### 2.3 Invite Code Management (Org page → Members tab, admin only)

| # | Test Case | How to Test | Expected |
|---|-----------|-------------|----------|
| 1 | Create code (defaults) | Click Create, use defaults | Code created: unlimited uses, no expiry, "member" role |
| 2 | Create with max uses | Set max uses to 5 | Shows "0 / 5" in table |
| 3 | Create with expiry | Set expiry date (future) | Shows expiry date in table |
| 4 | Create with role | Select "manager" role | New joiners get "manager" role |
| 5 | Copy invite link | Click copy icon on code row | Clipboard has full URL, toast "Invite link copied!" |
| 6 | Revoke code | Click Revoke on active code | Status changes to "Revoked" |
| 7 | Status: Maxed | Code used max_uses times | Status shows "Maxed" |
| 8 | Status: Expired | Code past expires_at | Status shows "Expired" |
| 9 | Non-admin access | Login as "member" role user | Members tab not visible |

### 2.4 Organization Member Management

| # | Test Case | How to Test | Expected |
|---|-----------|-------------|----------|
| 1 | Change role admin→member | Edit role dropdown | Role updated immediately |
| 2 | Change role member→manager | Edit role dropdown | Role updated |
| 3 | Remove member | Click remove on a member | Member removed from org |
| 4 | Remove last admin | Try removing the only admin | Error or prevented |
| 5 | Non-admin can't manage | Login as member | Edit/remove buttons hidden |

---

## 3. PROJECTS

### 3.1 Create Project (`/dashboard/organizations/[orgId]/projects/new`)

| # | Test Case | How to Test | Expected |
|---|-----------|-------------|----------|
| 1 | Step 1: Select blank template | Click "Blank Project" | No tasks pre-populated |
| 2 | Step 1: Select system template | Click "Software Sprint" template | Shows task count preview |
| 3 | Step 2: Name < 3 chars | Type "AB" | Validation "Project name must be at least 3 characters" |
| 4 | Step 2: Valid name | Type "My Project" | Proceeds to next step |
| 5 | Step 2: End date before start date | Pick start=Mar 20, end=Mar 15 | Validation error |
| 6 | Step 2: Status selection | Change from "planning" to "active" | Status saved correctly |
| 7 | Step 3: Add team member | Select org member, assign role | Member shown in list |
| 8 | Step 3: Custom role creation | Type new role name, click add | Role appears in dropdown |
| 9 | Step 3: Duplicate custom role | Try adding role that already exists | Error "Role already exists" |
| 10 | Step 4: Review and Create | Verify all info shown, click Create | Project created, redirect |
| 11 | Template applied | Create with template selected | Tasks from template auto-created in project |
| 12 | Creator is owner | Check project members after creation | Current user has "owner" role |

### 3.2 Edit Project (Settings tab)

| # | Test Case | How to Test | Expected |
|---|-----------|-------------|----------|
| 1 | Edit name | Change project name in dialog | Name updates |
| 2 | Edit status | Change to "completed" | Status badge updates |
| 3 | Edit dates | Set new start/end dates | Dates update (end ≥ start enforced) |
| 4 | Non-manager edits | Login as contributor | Edit option hidden or disabled |

### 3.3 Delete Project (Danger Zone)

| # | Test Case | How to Test | Expected |
|---|-----------|-------------|----------|
| 1 | Delete with confirmation | Type confirmation text, click Delete | Project deleted, redirect to org |
| 2 | Cancel delete | Open dialog, click Cancel | Nothing deleted |
| 3 | Non-manager deletes | Login as contributor | Delete button not shown |

### 3.4 Project Member Management

| # | Test Case | How to Test | Expected |
|---|-----------|-------------|----------|
| 1 | Add org member to project | Select member, assign role | Member added |
| 2 | Change member role | Edit role dropdown | Role updates |
| 3 | Remove member | Click remove | Member removed |
| 4 | Assign custom role | Select custom role for member | Custom role saved |

---

## 4. KANBAN BOARD & TASKS

### 4.1 Task Creation

| # | Test Case | How to Test | Expected |
|---|-----------|-------------|----------|
| 1 | Title empty | Leave title blank, click Save | Error "Title is required" |
| 2 | Title > 200 chars | Paste 201+ characters | Error "Title is too long" |
| 3 | Description > 2000 chars | Paste 2001+ characters | Error |
| 4 | Title only (minimum) | Enter just a title | Task created with status "todo", priority "medium" |
| 5 | All fields filled | Title + description + assignee + priority + sprint + due date | Task created with all fields |
| 6 | Assign to member | Select member from dropdown | Task shows assignee, notification sent |
| 7 | Set priority "urgent" | Select urgent from dropdown | Task card shows urgent badge |
| 8 | Set due date | Pick a future date | Due date shown on card |
| 9 | Assign to sprint | Select sprint from dropdown | Task associated with sprint |

### 4.2 Task Editing

| # | Test Case | How to Test | Expected |
|---|-----------|-------------|----------|
| 1 | Click task card | Click any task on kanban | Task dialog opens with pre-filled data |
| 2 | Change title | Edit title, save | Title updates on card |
| 3 | Change assignee | Select different member | Notification sent to new assignee |
| 4 | Change status via dropdown | Change status in dialog | Task moves to new column |
| 5 | Change priority | Select different priority | Priority badge updates |
| 6 | Clear assignee | Set assignee to "Unassigned" | Assignee removed, no notification |
| 7 | Add description | Type description, save | Description saved |

### 4.3 Task Deletion

| # | Test Case | How to Test | Expected |
|---|-----------|-------------|----------|
| 1 | Delete task (manager) | Click delete in task dialog | Task removed from board |
| 2 | Delete task (non-manager) | Login as contributor | Delete button not shown |

### 4.4 Drag and Drop

| # | Test Case | How to Test | Expected |
|---|-----------|-------------|----------|
| 1 | Drag todo → in_progress | Drag task card between columns | Status updates, card moves |
| 2 | Drag in_progress → done | Drag to Done column | Status updates, `completed_at` set |
| 3 | Drag done → todo | Drag back to Todo | Status reverts, `completed_at` cleared |
| 4 | Drag triggers notification | Drag task with assignee | `notifyStatusChanged` fires for assignee + creator |
| 5 | Self-change no notification | Drag your own assigned task | No notification to yourself |

### 4.5 Task Attachments

| # | Test Case | How to Test | Expected |
|---|-----------|-------------|----------|
| 1 | Upload file < 25 MB | Click attach, select file | File uploaded, shown in task |
| 2 | Upload file > 25 MB | Select large file | Error "File too large" |
| 3 | Multiple attachments | Upload 3 files | All shown in attachments list |
| 4 | Download attachment | Click download icon | File downloads correctly |
| 5 | Delete attachment | Click remove on attachment | File removed |
| 6 | Kanban paperclip badge | Add attachment to task | Paperclip icon + count shown on kanban card |

---

## 5. SPRINT MANAGEMENT

### 5.1 Create Sprint

| # | Test Case | How to Test | Expected |
|---|-----------|-------------|----------|
| 1 | Name empty | Leave name blank | Validation error |
| 2 | Name > 100 chars | Paste 101+ characters | Error |
| 3 | Start date in past | Try selecting yesterday | Calendar disables past dates |
| 4 | End date before start | Pick end date earlier than start | Error "End date must be after start date" |
| 5 | Valid 2-week sprint | Set start today, end in 14 days | Shows "Sprint Duration: 2 weeks" |
| 6 | Goal text | Enter goal text (< 1000 chars) | Goal saved |
| 7 | Goal > 1000 chars | Paste 1001+ characters | Error |
| 8 | Non-manager creates | Login as contributor | "Only project managers can create sprints" message |
| 9 | Default end date | Set start date, check end date | Auto-set to 14 days after start |

### 5.2 Sprint Lifecycle

| # | Test Case | How to Test | Expected |
|---|-----------|-------------|----------|
| 1 | Status: planned → active | Edit sprint, change status | Sprint shown as active (green) |
| 2 | Status: active → completed | Change to completed | Sprint grayed out |
| 3 | Delete planned sprint | Delete button on planned sprint | Sprint deleted |
| 4 | Delete active sprint | Try deleting active sprint | Prevented or warning |
| 5 | Assign task to sprint | In task dialog, select sprint | Task appears under sprint |

### 5.3 Sprint Events

| # | Test Case | How to Test | Expected |
|---|-----------|-------------|----------|
| 1 | Create planning event | Select type "planning", fill title + date | Event created |
| 2 | Create standup | Select "daily_standup" type | Event created |
| 3 | Set start/end time | Enter HH:MM for both | Times displayed |
| 4 | End time before start time | Set end earlier than start | Error |
| 5 | Event in past | Try setting date to yesterday | Validation error |
| 6 | View in timeline | Check sprint timeline component | Event shown on correct date |

### 5.4 Sprint Deadline Notifications

| # | Test Case | How to Test | Expected |
|---|-----------|-------------|----------|
| 1 | Sprint ending in 48h | Create sprint ending in 2 days, call cron | All project members get notification |
| 2 | Sprint ending in 72h | Sprint ends in 3 days, call cron | No notification (outside 48h window) |
| 3 | Already notified today | Call cron twice same day | No duplicate notifications |
| 4 | Cron auth check | Call `/api/cron/sprint-deadlines` without auth header | 401 Unauthorized |
| 5 | Cron with valid auth | Call with `Authorization: Bearer <CRON_SECRET>` | 200 OK with results |

---

## 6. ANALYTICS & REPORTING

### 6.1 Personal Reports (`/dashboard/analytics`)

| # | Test Case | How to Test | Expected Output |
|---|-----------|-------------|-----------------|
| 1 | Total assigned count | Check "Total Assigned" card | Should equal count of tasks where `assignee_id = current_user` across all projects |
| 2 | Completed count | Check "Completed" card | Should equal count of tasks with `status = 'done'` assigned to you |
| 3 | Completion rate | Check percentage | Should be `(completed / total_assigned) * 100` — if 5 done out of 10, shows 50% |
| 4 | In Progress count | Check "In Progress" card | Tasks with `status = 'in_progress'` assigned to you |
| 5 | Blocked + Overdue count | Check combined card | Blocked: `status = 'blocked'`; Overdue: `due_date < today AND status != 'done'` |
| 6 | Avg Completion Time | Check KPI card | Average of `(completed_at - created_at)` in days for all your done tasks. If 3 tasks took 2, 4, 6 days → shows "4.0 days" |
| 7 | On-Time Delivery Rate | Check KPI card | `(tasks completed on/before due_date) / (tasks with due_date that are done) * 100`. If 3 of 4 were on time → 75% |
| 8 | Tasks per Sprint | Check KPI card | `(total done tasks in sprints) / (number of completed/active sprints)`. If 10 done across 2 sprints → 5.0 |
| 9 | Overdue count | Check KPI card | Tasks where `due_date < today AND status != 'done'` |
| 10 | Burndown chart | Select a sprint from dropdown | X-axis: days of sprint. Blue area = actual remaining tasks. Gray dashed line = ideal linear burndown from total→0. If sprint has 10 tasks over 14 days, ideal drops ~0.7/day |
| 11 | Project breakdown | Check per-project cards | Each project shows: total tasks, done, in progress, blocked, completion rate bar |
| 12 | CSV export | Click "Export CSV" | Downloads file with columns: Title, Project, Status, Priority, Due Date, Completed At, Created At. Row count = your total tasks |
| 13 | No tasks | User with 0 assigned tasks | Shows 0 for all metrics, empty burndown, "No projects" message |

### 6.2 Project Analytics — My Contribution (all members)

| # | Test Case | How to Test | Expected Output |
|---|-----------|-------------|-----------------|
| 1 | My assigned in project | Open project → Analytics tab → My Contribution | Count of tasks assigned to you in THIS project only |
| 2 | My completed | Check completed card | Tasks with `status = 'done'` and `assignee_id = you` in this project |
| 3 | My completion rate | Check percentage | `(my_completed / my_assigned) * 100` |
| 4 | Status pie chart | Check donut chart | Segments for todo/in_progress/review/done/blocked for YOUR tasks. Hover shows count + percentage |
| 5 | Priority bar chart | Check horizontal bars | Bars for urgent/high/medium/low showing YOUR task counts |
| 6 | Chart/Table toggle | Click table icon on any chart | Switches to table view with progress bars and counts |

### 6.3 Project Analytics — Team Analytics (PM/Lead/Owner only)

| # | Test Case | How to Test | Expected Output |
|---|-----------|-------------|-----------------|
| 1 | Access as contributor | Login as contributor, go to Analytics tab | "Team Analytics" section NOT visible |
| 2 | Access as lead | Login as lead/owner | Team Analytics section visible below My Contribution |
| 3 | Overview cards | Check Total/Completed/In Progress/Blocked | Counts across ALL project tasks (respects active filters) |
| 4 | Filter by member | Select a specific member from dropdown | All stats/charts filter to that member's tasks only. "Matching filters: X of Y tasks" shown |
| 5 | Filter by role | Select "contributor" from role dropdown | Shows only contributors' tasks |
| 6 | Filter by sprint | Select a sprint | Shows only tasks in that sprint. "Backlog" option shows tasks with no sprint |
| 7 | Filter by status | Select "blocked" | Shows only blocked tasks across all charts |
| 8 | Filter by priority | Select "urgent" | Shows only urgent priority tasks |
| 9 | Multiple filters | Select member + sprint + status | Filters combine (AND logic). Count shows filtered/total |
| 10 | Clear all filters | Click "Clear all" | All filters reset, shows all tasks |
| 11 | Avg Completion Time KPI | Check card value | `average(completed_at - created_at)` in days for done tasks matching filters. Example: 3 tasks took 1, 3, 5 days → "3.0 days". No done tasks → "—" |
| 12 | On-Time Delivery KPI | Check card value | `(done tasks where completed_at ≤ due_date) / (done tasks with due_date) * 100`. Example: 2 of 3 on time → "66.7%". No tasks with due dates → "—" |
| 13 | Avg Velocity KPI | Check card value | `(total done tasks across sprints) / (completed + active sprints)`. Example: 15 done across 3 sprints → "5.0 tasks/sprint" |
| 14 | Overdue KPI | Check card value | Count of tasks where `due_date < today AND status ≠ 'done'`. Red colored if > 0 |
| 15 | Status distribution chart | Check horizontal bar chart | Bars for each status with counts. Colors: todo=orange, in_progress=blue, review=purple, done=green, blocked=red |
| 16 | Priority distribution chart | Check pie/donut chart | Segments for urgent/high/medium/low with percentages |
| 17 | Member contributions chart | Check stacked bar chart | X-axis: each member name. Stacked bars show Done/In Progress/Review/To Do/Blocked per member |
| 18 | Member contributions table | Toggle to table view | Table rows: Member (avatar+name+email), Role, Total, Done (green), Active (blue), Review (purple), Blocked (red), Completion rate bar |
| 19 | Sprint velocity chart | Check stacked bar chart | X-axis: sprint names. Stacked bars show task status breakdown per sprint. Below: completion % per sprint |
| 20 | Sprint velocity table | Toggle to table view | Rows per sprint: badge (active/completed), name, done/active/blocked counts, completion % |
| 21 | Burndown chart | Select sprint from dropdown | Blue area = actual remaining undone tasks per day. Gray dashed line = ideal straight line from total→0. Auto-selects active sprint |
| 22 | CSV export | Click Export CSV (PM only) | Downloads CSV with columns: Task, Status, Priority, Assignee, Sprint, Due Date, Completed At, Created At. Respects current filters |
| 23 | No tasks in project | Empty project analytics | All counts = 0, charts empty, "No data" states |

**How to verify data accuracy**:
- Go to Supabase Dashboard → Table Editor → `tasks` table
- Filter by `project_id` = your project
- Manually count statuses and compare with analytics cards
- For completion time: check `created_at` and `completed_at` columns on done tasks, calculate average manually
- For on-time: compare `completed_at` vs `due_date` on done tasks that have due dates

---

## 7. CALENDAR & SCHEDULING

### 7.1 Calendar View (`/dashboard/calendar`)

| # | Test Case | How to Test | Expected |
|---|-----------|-------------|----------|
| 1 | Sprint dates highlighted | Create sprint with date range | Sprint dates show colored background on calendar |
| 2 | Sprint event on date | Create sprint event for specific date | Event dot/indicator shown on that day |
| 3 | Click date | Click any calendar date | Day detail panel opens showing events + tasks due |
| 4 | Month navigation | Click prev/next month arrows | Calendar updates |
| 5 | Filter by event type | Use type filter checkboxes | Only selected types shown |
| 6 | Tasks due today | Have tasks with today's due date | Shown in day detail |
| 7 | Active sprint highlight | Have an active sprint | Sprint range visually distinct |
| 8 | Empty day | Click day with no events | "No events" message |

---

## 8. COMMUNICATION HUB

### 8.1 Channels

| # | Test Case | How to Test | Expected |
|---|-----------|-------------|----------|
| 1 | Create public channel | Click +, fill name, select Public | Channel created, all org members auto-added |
| 2 | Create private channel | Select Private type | Channel created, empty membership |
| 3 | Channel name slugification | Type "My Cool Channel" | Preview shows `#my-cool-channel` |
| 4 | Channel name > 80 chars | Paste very long name | Truncated or error |
| 5 | Description > 250 chars | Paste long description | Error or truncated |
| 6 | Duplicate channel name | Create channel with existing name | Error or auto-suffix |
| 7 | Project-scoped channel | Select specific project | Only project members see channel |

### 8.2 Messaging

| # | Test Case | How to Test | Expected |
|---|-----------|-------------|----------|
| 1 | Send text message | Type message, press Ctrl+Enter or click Send | Message appears in channel |
| 2 | Empty message | Try sending blank | Send button disabled or nothing happens |
| 3 | @mention member | Type `@` then select member | Mention highlighted, notification sent |
| 4 | @mention self | Mention yourself | No notification sent (self-mention filtered) |
| 5 | Bold formatting | Select text, click B toolbar | Text rendered bold |
| 6 | Italic formatting | Select text, click I toolbar | Text rendered italic |
| 7 | Code formatting | Click code toolbar | Code block rendered |
| 8 | Attach file | Click paperclip, select file | File preview shown in message |
| 9 | Reference task | Click clipboard icon, select task | Task card embedded in message |
| 10 | Message appears realtime | Send from User A | User B sees it instantly without refresh |
| 11 | Typing indicator | Start typing in channel | Other users see "X is typing..." |
| 12 | Typing indicator timeout | Stop typing for 3+ seconds | Indicator disappears |

### 8.3 Direct Messages

| # | Test Case | How to Test | Expected |
|---|-----------|-------------|----------|
| 1 | Start new DM | Click New DM, select member | DM thread created |
| 2 | Send DM | Type and send message | Message appears in DM thread |
| 3 | DM notification | Send DM to user | Recipient sees in DM list |
| 4 | Group DM | Select 2+ members | Group thread created |
| 5 | DM appears in sidebar | Send DM | Thread listed in DM section of sidebar |

### 8.4 Threads

| # | Test Case | How to Test | Expected |
|---|-----------|-------------|----------|
| 1 | Reply to message | Click reply icon on message | Thread panel opens |
| 2 | Send reply | Type in thread, send | Reply appears under parent |
| 3 | Reply count | Add 3 replies to a message | Parent message shows "3 replies" |
| 4 | @mention in thread | Mention someone in reply | Notification sent |
| 5 | Close thread panel | Click X on thread panel | Panel closes |

### 8.5 Reactions

| # | Test Case | How to Test | Expected |
|---|-----------|-------------|----------|
| 1 | Add reaction | Click emoji button on message, select emoji | Reaction appears below message |
| 2 | Same emoji by 2 users | Both react with same emoji | Count shows 2 |
| 3 | Remove own reaction | Click your reaction again | Reaction removed, count decrements |
| 4 | Multiple emojis | Add 3 different emojis | All 3 shown with counts |

---

## 9. FILE MANAGEMENT

### 9.1 File Upload

| # | Test Case | How to Test | Expected |
|---|-----------|-------------|----------|
| 1 | Upload < 25 MB | Drag file into upload zone | Upload completes, file shown |
| 2 | Upload > 25 MB | Try uploading large file | Error "File too large" |
| 3 | Multiple files | Drop 3 files | All queued and processed sequentially |
| 4 | Upload progress | Watch during upload | Progress bar fills |
| 5 | Cancel upload | Click cancel during upload | Upload stopped |
| 6 | Retry failed upload | Network error, click retry | Re-attempts upload |

### 9.2 File Manager

| # | Test Case | How to Test | Expected |
|---|-----------|-------------|----------|
| 1 | Create folder | Click New Folder, enter name | Folder appears in sidebar |
| 2 | Navigate to folder | Click folder in sidebar | Files in that folder shown |
| 3 | Nested folder | Create folder inside folder | Tree structure in sidebar |
| 4 | Search files | Type filename in search box | Matching files shown |
| 5 | Sort by name | Click sort by name | Alphabetical order |
| 6 | Sort by date | Click sort by date | Newest/oldest first |
| 7 | Sort by size | Click sort by size | Largest/smallest first |
| 8 | Download file | Click download icon | File downloads correctly |
| 9 | Delete file | Click delete on file | File removed |
| 10 | Star file | Click star icon | Star filled, appears in starred view |
| 11 | Unstar file | Click filled star | Star removed |

### 9.3 File Sharing

| # | Test Case | How to Test | Expected |
|---|-----------|-------------|----------|
| 1 | Share with member | Select member in share dialog | Member can access file, notification sent |
| 2 | Share with org | Select "Entire organization" | All org members can access |
| 3 | Notification on share | Share file with member | `notifyFileShared` fires, recipient sees notification |
| 4 | Self-share | Try sharing with yourself | No notification (self-share filtered) |

### 9.4 File Versions

| # | Test Case | How to Test | Expected |
|---|-----------|-------------|----------|
| 1 | Upload new version | Upload file with same name | Version number increments |
| 2 | View version history | Click versions on file | List of all versions shown |
| 3 | Download old version | Click download on previous version | Correct version downloads |

---

## 10. INTERNAL MAIL

### 10.1 Compose & Send

| # | Test Case | How to Test | Expected |
|---|-----------|-------------|----------|
| 1 | Send to 1 recipient | Select member in To field, type subject + body, click Send | Mail sent, recipient gets it in inbox |
| 2 | Send to multiple | Add 3 members to To field | All 3 receive mail |
| 3 | Add CC recipients | Click "+ CC", add members | CC recipients receive mail, shown as CC |
| 4 | Empty To field | Try sending without recipients | Error or send button disabled |
| 5 | Empty subject | Leave subject blank | Error "Subject is required" or prompt |
| 6 | Type: Direct | Select "Direct" type toggle | Sent to selected recipients only |
| 7 | Type: Announcement | Select "Announcement" type | To field shows "All org members (N)" non-editable, sent to all |
| 8 | Type: Newsletter | Select "Newsletter" type | To field allows member selection |
| 9 | Rich text: Bold | Select text, click B | Text bolded in body |
| 10 | Rich text: Italic | Select text, click I | Text italicized |
| 11 | Rich text: Underline | Select text, click U | Text underlined |
| 12 | Rich text: Bullet list | Click list button | Bullet list created |
| 13 | Attach file | Click paperclip, select file | File chip shown with name + size |
| 14 | Attach file > 25 MB | Select large file | Error toast |
| 15 | Remove attachment | Click X on attachment chip | Attachment removed |
| 16 | Notification on send | Send mail | Each recipient gets `mail_received` notification |
| 17 | Member picker search | Type in To field | Dropdown filters members by name/email |
| 18 | Can't add same recipient twice | Add member, try adding again | Filtered out of dropdown |

### 10.2 Drafts

| # | Test Case | How to Test | Expected |
|---|-----------|-------------|----------|
| 1 | Save draft | Fill subject + body, click "Save Draft" | Draft saved, toast confirmation |
| 2 | Auto-save draft | Type content, wait 30 seconds | Draft auto-saved (interval) |
| 3 | Open draft | Click draft in Drafts folder | ComposeMailForm opens with pre-filled content |
| 4 | Edit draft | Modify subject/body, save again | Draft updated |
| 5 | Send draft | Open draft, click Send | Draft converted to sent mail |
| 6 | Discard draft | Click Discard | Auto-save cleared, navigate to inbox |
| 7 | Drafts count | Have 3 drafts | Sidebar shows "Drafts (3)" badge |

### 10.3 Reply & Forward

| # | Test Case | How to Test | Expected |
|---|-----------|-------------|----------|
| 1 | Reply | Open mail, click Reply | Compose opens with `Re: [subject]`, replyTo user pre-filled, quoted body |
| 2 | Already has Re: prefix | Reply to a reply | Subject stays `Re: [subject]` (not `Re: Re:`) |
| 3 | Forward | Open mail, click Forward | Compose opens with `Fwd: [subject]`, quoted body, empty To field |
| 4 | Already has Fwd: prefix | Forward a forwarded mail | Subject stays `Fwd: [subject]` |
| 5 | Quoted body format | Check reply/forward body | Shows `--- Original Message ---` with sender name and original body |

### 10.4 Mail Folders

| # | Test Case | How to Test | Expected |
|---|-----------|-------------|----------|
| 1 | Inbox | Navigate to Inbox folder | Shows all received, non-archived, non-trashed mail |
| 2 | Unread indicator | Have unread mail | Blue left border + bold subject + blue dot |
| 3 | Mark as read | Click on unread mail | Blue border/dot disappears, marked as read |
| 4 | Star mail | Click star icon on mail row | Star fills amber, mail appears in Starred folder |
| 5 | Unstar mail | Click filled star | Star empties, removed from Starred |
| 6 | Archive mail | Select mail, click Archive | Removed from inbox, appears in Archived folder |
| 7 | Trash mail | Select mail, click Trash | Removed from inbox, appears in Trash folder |
| 8 | Delete permanently | In Trash folder, select mail, click "Delete Forever" | Permanently deleted |
| 9 | Sent folder | Send a mail | Appears in Sent folder with "To: [recipients]" |
| 10 | Announcements folder | Have announcement-type mail | Filtered from inbox, shown in Announcements |
| 11 | Bulk mark read | Select multiple, click "Mark Read" | All marked as read |
| 12 | Bulk archive | Select multiple, click "Archive" | All moved to Archived |
| 13 | Bulk trash | Select multiple, click "Trash" | All moved to Trash |
| 14 | Select all checkbox | Click "Select all" | All mail rows selected |
| 15 | Empty folder state | Open folder with no mail | "No mail here" with contextual message |
| 16 | Unread count badge | Have 5 unread mails | Sidebar Inbox shows red badge "5" |

### 10.5 Mail Detail View

| # | Test Case | How to Test | Expected |
|---|-----------|-------------|----------|
| 1 | View mail | Click mail in list | Full mail shown: subject, sender info, To/CC, body, attachments |
| 2 | HTML body rendering | Mail with formatted text | HTML rendered (bold, italic, lists etc.) |
| 3 | Script tags sanitized | Mail with `<script>` tag | Script stripped, not executed |
| 4 | Event handlers sanitized | Mail with `onclick` etc. | Handlers replaced with `data-removed` |
| 5 | Download attachment | Click attachment in detail view | File downloads via signed URL |
| 6 | Multiple attachments | Mail with 3 attachments | 2-column grid with file icon, name, size |
| 7 | Back button | Click Back | Returns to folder list |
| 8 | Auto-mark read | Open unread mail | Automatically marked as read |

---

## 11. NOTIFICATIONS

### 11.1 Notification Bell (Navbar)

| # | Test Case | How to Test | Expected |
|---|-----------|-------------|----------|
| 1 | Unread badge | Have unread notifications | Red badge with count on bell icon |
| 2 | Badge max | Have 100+ unread | Shows "99+" |
| 3 | Click bell | Click bell icon | Popover opens with notification list |
| 4 | All tab | View All tab in popover | Shows all recent notifications |
| 5 | Unread tab | Switch to Unread tab | Shows only unread notifications |
| 6 | Click notification | Click a notification item | Marks as read + navigates to `notification.link` + closes popover |
| 7 | Delete notification | Click X on notification hover | Notification removed |
| 8 | Mark all read | Click "Mark all read" in header | All notifications marked as read, badge clears |
| 9 | Empty state | No notifications | Shows "You're all caught up!" |
| 10 | View all link | Click "View all notifications" footer | Navigates to full notifications page |

### 11.2 Notifications Page (`/dashboard/organizations/[orgId]/notifications`)

| # | Test Case | How to Test | Expected |
|---|-----------|-------------|----------|
| 1 | Filter: All | Select "All" pill | Shows all notifications |
| 2 | Filter: Unread | Select "Unread" pill | Shows only unread |
| 3 | Filter: Tasks | Select "Tasks" pill | Shows task_assigned + task_status_changed only |
| 4 | Filter: Mentions | Select "Mentions" pill | Shows mentioned type only |
| 5 | Filter: Mail | Select "Mail" pill | Shows mail_received only |
| 6 | Filter: Files | Select "Files" pill | Shows file_shared only |
| 7 | Filter: Members | Select "Members" pill | Shows member_joined only |
| 8 | Bulk select | Check multiple notification checkboxes | Selection count shown |
| 9 | Bulk mark read | Select 3, click "Mark Read" | All 3 marked as read |
| 10 | Bulk delete | Select 3, click "Delete" | All 3 deleted |
| 11 | Infinite scroll | Have 30+ notifications, scroll to bottom | More loaded automatically |

### 11.3 Realtime Notifications

| # | Test Case | How to Test | Expected |
|---|-----------|-------------|----------|
| 1 | New notification toast | Have another user assign a task to you | Sonner toast pops up with notification content |
| 2 | Toast "View" action | Click "View" on toast | Navigates to notification link |
| 3 | Bell badge updates | Receive new notification | Badge count increments without refresh |
| 4 | Read updates realtime | Mark notification read on another tab | Badge decrements on current tab |

### 11.4 All Trigger Points

| # | Trigger | How to Test | Expected Notification |
|---|---------|-------------|---------------------|
| 1 | Task assigned | Create/edit task, assign to another member | Assignee gets: "[Your name] assigned you a task" with task title |
| 2 | Self-assign | Assign task to yourself | NO notification (self-assign filtered) |
| 3 | Task status changed | Drag task to new column | Assignee + creator get: "Task moved to [status]" (not the changer) |
| 4 | @mention | Send message with @[Name](userId) | Mentioned user gets: "[Your name] mentioned you" |
| 5 | Self-mention | @mention yourself in message | NO notification |
| 6 | Mail received | Send mail to member | Recipient gets: "New mail from [Your name]" |
| 7 | File shared | Share file with member | Recipient gets: "[Your name] shared a file with you" |
| 8 | Self-share | Share file with yourself | NO notification |
| 9 | Member joined | Join org via invite code | All existing members get: "[Name] has joined the organization" |
| 10 | Sprint deadline | Sprint ending within 48h, run cron | All project members get: "Sprint ending soon: [name]" |

### 11.5 Auto-Cleanup

| # | Test Case | How to Test | Expected |
|---|-----------|-------------|----------|
| 1 | Cleanup cron auth | Call `/api/cron/cleanup-notifications` without auth | 401 Unauthorized |
| 2 | Cleanup with auth | Call with valid `Authorization: Bearer <CRON_SECRET>` | 200 OK, old notifications deleted |
| 3 | 60-day threshold | Have notifications from 61+ days ago | Deleted by cleanup |
| 4 | Recent notifications safe | Have notifications from 30 days ago | NOT deleted |

---

## 12. DASHBOARD & NAVIGATION

### 12.1 Sidebar Navigation

| # | Test Case | How to Test | Expected |
|---|-----------|-------------|----------|
| 1 | Home link | Click Home/Dashboard | Navigate to `/dashboard` |
| 2 | Organizations link | Click Organizations | Navigate to org list |
| 3 | Org-specific links | Select an org | Mail, Communication Hub, Files links use correct orgId |
| 4 | Calendar link | Click Calendar | Navigate to `/dashboard/calendar` |
| 5 | Analytics link | Click Reports | Navigate to `/dashboard/analytics` |
| 6 | Mail link | Click Mail (when org selected) | Navigate to `/dashboard/organizations/[orgId]/mail/inbox` |
| 7 | Active link highlight | Navigate to a page | Corresponding sidebar link highlighted |

### 12.2 Breadcrumbs

| # | Test Case | How to Test | Expected |
|---|-----------|-------------|----------|
| 1 | Org page breadcrumb | Go to org dashboard | "Organizations > [Org Name]" |
| 2 | Project page breadcrumb | Go to project | "Organizations > [Org Name] > [Project Name]" |
| 3 | Click parent breadcrumb | Click "Organizations" in breadcrumb | Navigate to org list |
| 4 | Mail breadcrumb | Go to mail | "Organizations > Mail" |

### 12.3 Organization Dashboard

| # | Test Case | How to Test | Expected |
|---|-----------|-------------|----------|
| 1 | Projects count card | Have 3 projects | Card shows "3" with "Active projects" |
| 2 | Team Members count | Have 5 members | Card shows "5" with "Team members" |
| 3 | Active Tasks count | Have tasks in todo/in_progress/review | Card shows dynamic count with "Across all projects" |
| 4 | Active Tasks = 0 | No tasks in any project | Card shows "0" with "No tasks yet" |
| 5 | Invite code card | Org has invite code | Shows code + "Copy code" button |
| 6 | Copy invite code | Click Copy code | Clipboard has code, toast "Invite code copied!" |
| 7 | Communication Hub link | Click Communication Hub tab | Navigates to `/communication` |
| 8 | Members tab (admin) | Click Members tab as admin | Shows InviteCodeManager + OrgMemberTable + TemplateManager |
| 9 | Members tab (member) | Login as member | Members tab NOT shown |

---

## 13. CROSS-CUTTING CONCERNS

### 13.1 Role-Based Access Summary

| Feature | Admin | Manager | Member | Lead | Contributor | Viewer |
|---------|-------|---------|--------|------|-------------|--------|
| Manage org invite codes | Yes | Yes | No | — | — | — |
| Manage org members | Yes | Yes | No | — | — | — |
| Members tab on org page | Yes | Yes | No | — | — | — |
| Create project | Yes | Yes | Yes | — | — | — |
| Edit project settings | — | — | — | Yes | No | No |
| Delete project | — | — | — | Yes (owner) | No | No |
| Create sprint | — | — | — | Yes | No | No |
| Delete sprint | — | — | — | Yes | No | No |
| Delete task | — | — | — | Yes | No | No |
| Team Analytics tab | — | — | — | Yes | No | No |
| CSV export (project) | — | — | — | Yes | No | No |
| Create/edit tasks | — | — | — | Yes | Yes | No |
| View tasks | — | — | — | Yes | Yes | Yes |

### 13.2 Empty States to Verify

| Location | Condition | Expected Message |
|----------|-----------|------------------|
| Org dashboard | No projects | "Ready to Create Your First Project?" CTA |
| Kanban board | No tasks | Empty column state |
| Inbox | No mail | "Your inbox is empty" |
| Drafts | No drafts | "No saved drafts" |
| Other mail folder | No mail | "No mail in [folder]" |
| Notifications bell | No notifications | "You're all caught up!" |
| File manager | No files | Upload CTA |
| Sprint list | No sprints | Create sprint CTA |
| DM sidebar | No DMs | Empty state |

### 13.3 Database Cascade Deletes

| Delete | Cascades To |
|--------|-------------|
| Organization | organization_members, projects (→ tasks, sprints, etc.), channels, files |
| Project | project_members, tasks, sprints, sprint_events, custom_roles |
| Sprint | sprint_events |
| User | All memberships, tasks (assignee nulled or cascaded), messages |
| Channel | channel_members, messages, reactions |
| File | file_versions, file_shares, file_stars |
| Mail message | mail_recipients, mail_attachments |

### 13.4 Realtime Subscriptions

| Table | Event | Where Used |
|-------|-------|-----------|
| notifications | INSERT | useNotifications — toast + badge update |
| notifications | UPDATE | useNotifications — mark read sync |
| notifications | DELETE | useNotifications — remove from list |
| mail_recipients | INSERT | useMailUnread — increment unread |
| mail_recipients | UPDATE | useMailUnread — read/unread toggle |
| mail_recipients | DELETE | useMailUnread — decrement if unread |

---

## 14. CRON JOB TESTING

### Manual cron testing (local)

```bash
# Sprint deadline checker (daily at 9am in production)
curl http://localhost:3000/api/cron/sprint-deadlines \
  -H "Authorization: Bearer wf360-cron-secret-k8x9m2p7q4"

# Notification cleanup (weekly in production)
curl http://localhost:3000/api/cron/cleanup-notifications \
  -H "Authorization: Bearer wf360-cron-secret-k8x9m2p7q4"
```

| # | Test | Expected Response |
|---|------|-------------------|
| 1 | No auth header | `{"error": "Unauthorized"}` (401) |
| 2 | Wrong secret | `{"error": "Unauthorized"}` (401) |
| 3 | Valid auth, no sprints ending soon | `{"message": "No sprints ending soon", "notified": 0}` |
| 4 | Valid auth, sprint ending in 24h | `{"sprints": 1, "notified": N}` where N = project member count |
| 5 | Run twice same day | Second run: `"notified": 0` (deduplication) |
| 6 | Cleanup with old notifications | `{"deleted": N}` where N > 0 |
| 7 | Cleanup with no old notifications | `{"deleted": 0}` |
