// Main admin router that combines all modular routers
import { createTRPCRouter } from "../trpc";
import { userManagementRouter } from "./admin/user-management";
import { teamManagementRouter } from "./admin/team-management";
import { requestManagementRouter } from "./admin/request-management";
import { scheduleManagementRouter } from "./admin/schedule-management";
import { roundControlRouter } from "./admin/round-control";
import { interviewManagementRouter } from "./admin/interview-management";
import { testingUtilitiesRouter } from "./admin/testing-utilities";

export const adminRouter = createTRPCRouter({
  // User Management
  getAllUsers: userManagementRouter.getAllUsers,
  assignUserToTeam: userManagementRouter.assignUserToTeam,
  removeUserFromTeam: userManagementRouter.removeUserFromTeam,

  // Team Management
  getAllTeams: teamManagementRouter.getAllTeams,
  createTeam: teamManagementRouter.createTeam,
  getTeams: teamManagementRouter.getTeams,
  toggleTeamStatus: teamManagementRouter.toggleTeamStatus,

  // Request Management
  getPendingRequests: requestManagementRouter.getPendingRequests,
  approveTeamRequest: requestManagementRouter.approveTeamRequest,
  rejectTeamRequest: requestManagementRouter.rejectTeamRequest,

  // Schedule Management
  uploadTeamData: scheduleManagementRouter.uploadTeamData,
  regenerateSchedules: scheduleManagementRouter.regenerateSchedules,
  generateSingleRound: scheduleManagementRouter.generateSingleRound,
  getScheduleTables: scheduleManagementRouter.getScheduleTables,

  // Round Control
  getConfig: roundControlRouter.getConfig,
  updateConfig: roundControlRouter.updateConfig,
  toggleRoundVisibility: roundControlRouter.toggleRoundVisibility,
  getRoundVisibilityStatus: roundControlRouter.getRoundVisibilityStatus,
  revealNextRound: roundControlRouter.revealNextRound,

  // Interview Management
  getInterviewers: interviewManagementRouter.getInterviewers,
  createInterviewer: interviewManagementRouter.createInterviewer,
  getInterviewSchedule: interviewManagementRouter.getInterviewSchedule,
  scheduleInterview: interviewManagementRouter.scheduleInterview,
  clearInterview: interviewManagementRouter.clearInterview,
  clearAllInterviews: interviewManagementRouter.clearAllInterviews,
  autoScheduleInterviews: interviewManagementRouter.autoScheduleInterviews,

  // Testing Utilities
  runTestCase: testingUtilitiesRouter.runTestCase,
  debugTeamSchedules: testingUtilitiesRouter.debugTeamSchedules,
});
