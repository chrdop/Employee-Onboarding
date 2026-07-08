export type UserRole = "hr_central" | "hr_deputy" | "location_manager" | "location_deputy";
export type TaskStatus = "open" | "in_progress" | "done" | "not_required";
export type FeedbackState = "open" | "overdue" | "done";
export type ResourceType = "link" | "document";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  locationId: string | null;
  isDeputyForUserId?: string | null;
  mustChangePassword: boolean;
}

export interface LocationContact {
  id: string;
  role: string;
  name: string;
  email: string | null;
  phone: string | null;
  note: string | null;
}

export interface LocationInterfaceContact {
  id: string;
  type: string;
  name: string | null;
  email: string | null;
  phone: string | null;
}

export interface Location {
  id: string;
  mandantNr: string;
  shortCode: string;
  hotelName: string;
  address: string | null;
  plzOrt: string | null;
  phone: string | null;
  fax: string | null;
  generalEmail: string | null;
  roomCount: number | null;
  billingAddressBlock: string | null;
  legalEntity: string | null;
  vatId: string | null;
  taxNumber: string | null;
  nextEmployeeNumber: number;
  isActive: boolean;
  contacts: LocationContact[];
  interfaceContacts: LocationInterfaceContact[];
}

export interface TaskResource {
  id: string;
  taskTemplateId: string;
  type: ResourceType;
  title: string;
  urlOrFilePath: string;
  uploadedAt: string;
  username: string | null;
  hasCredentials: boolean;
}

export interface TaskTemplate {
  id: string;
  position: number;
  title: string;
  descriptionWhatHow: string | null;
  defaultDueDays: number | null;
  defaultReminderDays: number | null;
  isActive: boolean;
  resources: TaskResource[];
}

export interface TaskEvent {
  id: string;
  timestamp: string;
  eventType: string;
  text: string | null;
  user: { id: string; name: string } | null;
}

export interface FeedbackStatus {
  id: string;
  taskId: string;
  status: FeedbackState;
  magicLinkToken: string | null;
  externalContactName: string | null;
  requestedAt: string | null;
  respondedAt: string | null;
}

export interface Task {
  id: string;
  employeeId: string;
  templateId: string;
  template: TaskTemplate;
  parentTaskId: string | null;
  assignedToUserId: string | null;
  assignedToUser: { id: string; name: string } | null;
  status: TaskStatus;
  notRequiredReason: string | null;
  dueDate: string | null;
  reminderIntervalDays: number | null;
  feedback: FeedbackStatus | null;
  events?: TaskEvent[];
}

export interface EmployeeSummary {
  id: string;
  locationId: string;
  location: { id: string; hotelName: string; shortCode: string };
  employeeNumber: string | null;
  name: string;
  position: string | null;
  startDate: string;
  peopledocReference: string | null;
  overallStatus: "not_started" | "in_progress" | "completed" | "overdue";
  taskCounts: { total: number; open: number; inProgress: number; done: number; notRequired: number };
}

export interface EmployeeDetail extends Omit<EmployeeSummary, "location"> {
  location: Location;
  tasks: Task[];
}

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  relatedTaskId: string | null;
  isRead: boolean;
  createdAt: string;
}
