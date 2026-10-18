// Main admin router that combines all modular routers
import { createTRPCRouter } from "../trpc";
import { userManagementRouter } from "./admin/user-management";
import { teamManagementRouter } from "./admin/team-management";
import { scheduleManagementRouter } from "./admin/schedule-management";
import { roundControlRouter } from "./admin/round-control";
import { interviewManagementRouter } from "./admin/interview-management";
import { testingUtilitiesRouter } from "./admin/testing-utilities";
import { staffManagementRouter } from "./admin/staff-management";
import { mentorManagementRouter } from "./admin/mentor-management";
import { mentorPairManagementRouter } from "./admin/mentor-pair-management";
import { registrationWindowRouter } from "./admin/registration-window";
import { advancedDeadlineRouter } from "./admin/advanced-deadline";
import { finalSubmissionRouter } from "./admin/final-submission";
import { challengeMentorManagementRouter } from "./admin/challenge-mentor-management";

export const adminRouter = createTRPCRouter({
  // User Management
  getAllUsers: userManagementRouter.getAllUsers,
  assignUserToTeam: userManagementRouter.assignUserToTeam,
  removeUserFromTeam: userManagementRouter.removeUserFromTeam,
  previewAutoAssign: userManagementRouter.previewAutoAssign,
  autoAssignUsers: userManagementRouter.autoAssignUsers,

  // Team Management
  getAllTeams: teamManagementRouter.getAllTeams,
  createTeam: teamManagementRouter.createTeam,
  getTeams: teamManagementRouter.getTeams,
  toggleTeamStatus: teamManagementRouter.toggleTeamStatus,
  getFinalSubmissionOpen: finalSubmissionRouter.getFinalSubmissionOpen,
  setFinalSubmissionOpen: finalSubmissionRouter.setFinalSubmissionOpen,

  // Schedule Management
  uploadTeamData: scheduleManagementRouter.uploadTeamData,
  regenerateSchedules: scheduleManagementRouter.regenerateSchedules,
  generateSingleRound: scheduleManagementRouter.generateSingleRound,
  getScheduleTables: scheduleManagementRouter.getScheduleTables,
  generateTrackSchedule: scheduleManagementRouter.generateTrackSchedule,
  getTrackScheduleTables: scheduleManagementRouter.getTrackScheduleTables,
  importTrackScheduleCsv: scheduleManagementRouter.importTrackScheduleCsv,
  deleteTrackScheduleTimes: scheduleManagementRouter.deleteTrackScheduleTimes,

  // Round Control
  getConfig: roundControlRouter.getConfig,
  updateConfig: roundControlRouter.updateConfig,
  setScoreboardFreeze: roundControlRouter.setScoreboardFreeze,
  toggleRoundVisibility: roundControlRouter.toggleRoundVisibility,
  getRoundVisibilityStatus: roundControlRouter.getRoundVisibilityStatus,
  revealNextRound: roundControlRouter.revealNextRound,

  // Registration Window
  getRegistrationWindow: registrationWindowRouter.getRegistrationWindow,
  scheduleRegistrationClose: registrationWindowRouter.scheduleRegistrationClose,
  openRegistrationTemporarily:
    registrationWindowRouter.openRegistrationTemporarily,
  closeRegistrationNow: registrationWindowRouter.closeRegistrationNow,
  followRegistrationSchedule:
    registrationWindowRouter.followRegistrationSchedule,

  // Interview Management
  getInterviewers: interviewManagementRouter.getInterviewers,
  createInterviewer: interviewManagementRouter.createInterviewer,
  setInterviewerAreas: interviewManagementRouter.setInterviewerAreas,
  deleteInterviewer: interviewManagementRouter.deleteInterviewer,
  getInterviewSchedule: interviewManagementRouter.getInterviewSchedule,
  scheduleInterview: interviewManagementRouter.scheduleInterview,
  clearInterview: interviewManagementRouter.clearInterview,
  clearAllInterviews: interviewManagementRouter.clearAllInterviews,
  autoScheduleInterviews: interviewManagementRouter.autoScheduleInterviews,

  // Staff Management
  setUserStaff: staffManagementRouter.setUserStaff,
  getStaffUsers: staffManagementRouter.getStaffUsers,
  setStaffArea: staffManagementRouter.setStaffArea,
  listUnavailability: staffManagementRouter.listUnavailability,
  addUnavailability: staffManagementRouter.addUnavailability,
  deleteUnavailability: staffManagementRouter.deleteUnavailability,

  // Testing Utilities
  runTestCase: testingUtilitiesRouter.runTestCase,
  debugTeamSchedules: testingUtilitiesRouter.debugTeamSchedules,

  // Mentor Management
  setUserMentor: mentorManagementRouter.setUserMentor,
  getMentors: mentorManagementRouter.getMentors,
  getMentorEligibleUsers: mentorManagementRouter.getMentorEligibleUsers,

  // Mentor Pair Management
  getPairs: mentorPairManagementRouter.getPairs,
  getUnpairedMentors: mentorPairManagementRouter.getUnpairedMentors,
  getTeamsWithPairs: mentorPairManagementRouter.getTeamsWithPairs,
  createPair: mentorPairManagementRouter.createPair,
  dissolvePair: mentorPairManagementRouter.dissolvePair,
  previewPairAssignment: mentorPairManagementRouter.previewPairAssignment,
  commitPairAssignment: mentorPairManagementRouter.commitPairAssignment,
  assignPairToTeam: mentorPairManagementRouter.assignPairToTeam,
  unassignPairFromTeam: mentorPairManagementRouter.unassignPairFromTeam,
  clearPairTeamConflict: mentorPairManagementRouter.clearPairTeamConflict,
  getMentorWeek: mentorPairManagementRouter.getMentorWeek,
  setMentorWeek: mentorPairManagementRouter.setMentorWeek,

  // Challenge Mentor Management (advanced track)
  getChallengeGroups: challengeMentorManagementRouter.getChallengeGroups,
  setChallengeMentors: challengeMentorManagementRouter.setChallengeMentors,
  getAdvancedDeadline: advancedDeadlineRouter.getAdvancedDeadline,
  setAdvancedDeadline: advancedDeadlineRouter.setAdvancedDeadline,
});
