// Central role + permission registry.
// Source of truth for what each role is allowed to do across the staff dashboard.

export type AppRole =
  | "superadmin"
  | "admin"
  | "faculty"
  | "event_manager"
  | "content_editor"
  | "moderator"
  | "member"
  | "guest";

export const ROLE_LABELS: Record<AppRole, string> = {
  superadmin: "Super Admin",
  admin: "Admin",
  faculty: "Faculty / Mentor",
  event_manager: "Event Manager",
  content_editor: "Content Editor",
  moderator: "Moderator",
  member: "Member",
  guest: "Guest",
};

// Staff = anyone who can access the management dashboard
export const STAFF_ROLES: AppRole[] = [
  "superadmin",
  "admin",
  "faculty",
  "event_manager",
  "content_editor",
  "moderator",
];

export type StaffTab =
  | "overview"
  | "moderation"
  | "events"
  | "registrations"
  | "broadcasts"
  | "directory"
  | "resources"
  | "blog"
  | "reports"
  | "jobs"
  | "settings";

// Per-tab access: 'write' = can edit, 'read' = view only, false = hidden.
type Access = "write" | "read" | false;

const PERMS: Record<AppRole, Partial<Record<StaffTab, Access>>> = {
  superadmin: {
    overview: "write", moderation: "write", events: "write",
    registrations: "write", broadcasts: "write", directory: "write",
    resources: "write", blog: "write", reports: "write", jobs: "write", settings: "write",
  },
  admin: {
    overview: "write", moderation: "write", events: "write",
    registrations: "write", broadcasts: "write", directory: "write",
    resources: "write", blog: "write", reports: "write", jobs: "write", settings: "write",
  },
  faculty: {
    overview: "write", directory: "write", reports: "write", jobs: "write",
    moderation: "read", events: "read", registrations: "read",
    broadcasts: "read", resources: "read", blog: "read",
  },
  event_manager: {
    overview: "read", events: "write", registrations: "write",
    broadcasts: "write", directory: "write", jobs: "write", moderation: "read",
    resources: "read", blog: "read", reports: "read",
  },
  content_editor: {
    overview: "read", blog: "write", resources: "write", jobs: "write",
    broadcasts: "write", events: "read", registrations: "read",
    moderation: "read", directory: "read", reports: "read",
  },
  moderator: {
    overview: "read", moderation: "write", directory: "write", jobs: "read",
    events: "read", registrations: "read", broadcasts: "read",
    resources: "read", blog: "read", reports: "read",
  },
  member: {},
  guest: {},
};

export function isStaff(role: AppRole | string | null | undefined): boolean {
  return !!role && STAFF_ROLES.includes(role as AppRole);
}

export function tabAccess(role: AppRole | string | null | undefined, tab: StaffTab): Access {
  if (!role) return false;
  return PERMS[role as AppRole]?.[tab] ?? false;
}

export function canWrite(role: AppRole | string | null | undefined, tab: StaffTab) {
  return tabAccess(role, tab) === "write";
}

export function canRead(role: AppRole | string | null | undefined, tab: StaffTab) {
  const a = tabAccess(role, tab);
  return a === "write" || a === "read";
}
