import { createTRPCRouter } from "~/server/api/trpc";
import { userManagementRouter } from "./user-management";
import { teamManagementRouter } from "./team-management";
import { roundControlRouter } from "./round-control";
import { scheduleManagementRouter } from "./schedule-management";
import { interviewManagementRouter } from "./interview-management";
import { testingUtilitiesRouter } from "./testing-utilities";
import { staffManagementRouter } from "./staff-management";
import { mentorManagementRouter } from "./mentor-management";

export const adminRouter = createTRPCRouter({
  // User Management
  ...userManagementRouter._def.procedures,

  // Team Management
  ...teamManagementRouter._def.procedures,

  // Round Control
  ...roundControlRouter._def.procedures,

  // Schedule Management
  ...scheduleManagementRouter._def.procedures,

  // Interview Management
  ...interviewManagementRouter._def.procedures,

  // Staff Management
  ...staffManagementRouter._def.procedures,

  // Mentor Management
  ...mentorManagementRouter._def.procedures,

  // Testing Utilities
  ...testingUtilitiesRouter._def.procedures,
});
