"use client";

import { api } from "~/trpc/react";
import { toast } from "sonner";
import { useState } from "react";

interface InterviewManagementProps {
  refetchAll: () => void;
}

export default function InterviewManagement({
  refetchAll,
}: InterviewManagementProps) {
  const [selectedArea, setSelectedArea] = useState<
    "MECHANICS" | "ELECTRONICS" | "PROGRAMMING"
  >("MECHANICS");
  const [interviewerName, setInterviewerName] = useState("");
  const [interviewerEmail, setInterviewerEmail] = useState("");
  const [autoScheduleStart, setAutoScheduleStart] = useState("09:00");
  const [autoScheduleEnd, setAutoScheduleEnd] = useState("17:00");

  const { data: interviewers, refetch: refetchInterviewers } =
    api.admin.getInterviewers.useQuery();
  const { data: interviewSchedule, refetch: refetchSchedule } =
    api.admin.getInterviewSchedule.useQuery();

  const createInterviewer = api.admin.createInterviewer.useMutation({
    onSuccess() {
      toast.success("Interviewer created successfully!");
      setInterviewerName("");
      setInterviewerEmail("");
      void refetchInterviewers();
    },
    onError(error) {
      toast.error(`Error creating interviewer: ${error.message}`);
    },
  });

  const scheduleInterview = api.admin.scheduleInterview.useMutation({
    onSuccess() {
      toast.success("Interview scheduled successfully!");
      void refetchSchedule();
      void refetchAll();
    },
    onError(error) {
      toast.error(`Error scheduling interview: ${error.message}`);
    },
  });

  const clearInterview = api.admin.clearInterview.useMutation({
    onSuccess() {
      toast.success("Interview cleared successfully!");
      void refetchSchedule();
      void refetchAll();
    },
    onError(error) {
      toast.error(`Error clearing interview: ${error.message}`);
    },
  });

  const autoScheduleInterviews = api.admin.autoScheduleInterviews.useMutation({
    onSuccess(data) {
      toast.success(data.message);
      void refetchSchedule();
      void refetchAll();
    },
    onError(error) {
      toast.error(`Error auto-scheduling interviews: ${error.message}`);
    },
  });

  const clearAllInterviews = api.admin.clearAllInterviews.useMutation({
    onSuccess(data) {
      toast.success(data.message);
      void refetchSchedule();
      void refetchAll();
    },
    onError(error) {
      toast.error(`Error clearing interviews: ${error.message}`);
    },
  });

  const handleCreateInterviewer = () => {
    if (!interviewerName.trim() || !interviewerEmail.trim()) {
      toast.error("Please fill in all fields");
      return;
    }
    createInterviewer.mutate({
      name: interviewerName.trim(),
      email: interviewerEmail.trim(),
      area: selectedArea,
    });
  };

  const handleScheduleInterview = (
    userId: string,
    dateTimeString: string,
    interviewerId: string,
  ) => {
    const interviewTime = new Date(dateTimeString);
    if (isNaN(interviewTime.getTime())) {
      toast.error("Invalid date/time");
      return;
    }
    scheduleInterview.mutate({
      userId,
      interviewTime,
      interviewerId,
    });
  };

  const handleAutoSchedule = () => {
    const today = new Date();
    const startTime = new Date(today);
    const [startHour, startMinute] = autoScheduleStart.split(":").map(Number);
    startTime.setHours(startHour ?? 9, startMinute ?? 0, 0, 0);

    const endTime = new Date(today);
    const [endHour, endMinute] = autoScheduleEnd.split(":").map(Number);
    endTime.setHours(endHour ?? 17, endMinute ?? 0, 0, 0);

    autoScheduleInterviews.mutate({
      startTime,
      endTime,
    });
  };

  const getAreaColor = (area: string) => {
    switch (area) {
      case "MECHANICS":
        return "bg-red-900 text-red-200";
      case "ELECTRONICS":
        return "bg-green-900 text-green-200";
      case "PROGRAMMING":
        return "bg-blue-900 text-blue-200";
      default:
        return "bg-gray-900 text-gray-200";
    }
  };

  const formatDateTime = (date: Date) => {
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      {/* Create Interviewer */}
      <div className="rounded-lg bg-gray-800 p-6">
        <h3 className="mb-4 text-xl font-semibold">Create Interviewer</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <input
            type="text"
            placeholder="Interviewer name"
            value={interviewerName}
            onChange={(e) => setInterviewerName(e.target.value)}
            className="rounded border border-gray-600 bg-gray-700 p-2"
          />
          <input
            type="email"
            placeholder="Interviewer email"
            value={interviewerEmail}
            onChange={(e) => setInterviewerEmail(e.target.value)}
            className="rounded border border-gray-600 bg-gray-700 p-2"
          />
          <select
            value={selectedArea}
            onChange={(e) =>
              setSelectedArea(e.target.value as typeof selectedArea)
            }
            className="rounded border border-gray-600 bg-gray-700 p-2"
          >
            <option value="MECHANICS">Mechanics</option>
            <option value="ELECTRONICS">Electronics</option>
            <option value="PROGRAMMING">Programming</option>
          </select>
          <button
            onClick={handleCreateInterviewer}
            disabled={createInterviewer.isPending}
            className="rounded bg-blue-600 px-4 py-2 hover:bg-blue-700 disabled:opacity-50"
          >
            {createInterviewer.isPending ? "Creating..." : "Create"}
          </button>
        </div>
      </div>

      {/* Interviewers List */}
      <div className="rounded-lg bg-gray-800 p-6">
        <h3 className="mb-4 text-xl font-semibold">
          Interviewers ({interviewers?.length ?? 0})
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {["MECHANICS", "ELECTRONICS", "PROGRAMMING"].map((area) => (
            <div key={area} className={`rounded-lg p-4 ${getAreaColor(area)}`}>
              <h4 className="mb-2 font-semibold">{area}</h4>
              <div className="space-y-2">
                {interviewers
                  ?.filter((i) => i.area === area)
                  .map((interviewer) => (
                    <div
                      key={interviewer.id}
                      className="rounded bg-black bg-opacity-20 p-2"
                    >
                      <p className="font-medium">{interviewer.name}</p>
                      <p className="text-xs opacity-75">{interviewer.email}</p>
                    </div>
                  ))}
                {interviewers?.filter((i) => i.area === area).length === 0 && (
                  <p className="text-sm opacity-75">No interviewers assigned</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Auto Schedule */}
      <div className="rounded-lg bg-gray-800 p-6">
        <h3 className="mb-4 text-xl font-semibold">Auto Schedule Interviews</h3>
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm text-gray-400">Start Time</label>
            <input
              type="time"
              value={autoScheduleStart}
              onChange={(e) => setAutoScheduleStart(e.target.value)}
              className="rounded border border-gray-600 bg-gray-700 p-2"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400">End Time</label>
            <input
              type="time"
              value={autoScheduleEnd}
              onChange={(e) => setAutoScheduleEnd(e.target.value)}
              className="rounded border border-gray-600 bg-gray-700 p-2"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleAutoSchedule}
              disabled={autoScheduleInterviews.isPending}
              className="rounded bg-green-600 px-6 py-2 hover:bg-green-700 disabled:opacity-50"
            >
              {autoScheduleInterviews.isPending
                ? "Scheduling..."
                : "Auto Schedule All"}
            </button>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                if (
                  confirm(
                    "Are you sure you want to clear all interviews? This cannot be undone.",
                  )
                ) {
                  clearAllInterviews.mutate();
                }
              }}
              disabled={clearAllInterviews.isPending}
              className="rounded bg-red-600 px-6 py-2 hover:bg-red-700 disabled:opacity-50"
            >
              {clearAllInterviews.isPending
                ? "Clearing..."
                : "Clear All Interviews"}
            </button>
          </div>
        </div>
        <p className="mt-2 text-sm text-gray-400">
          Optimized parallel scheduling: Up to 9 simultaneous interviews (3 per
          area) while avoiding team schedule conflicts
        </p>
      </div>

      {/* Interview Schedule */}
      <div className="rounded-lg bg-gray-800 p-6">
        <h3 className="mb-4 text-xl font-semibold">
          Interview Schedule (
          {interviewSchedule?.filter((u) => u.interviewTime).length ?? 0}{" "}
          scheduled)
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-600">
            <thead>
              <tr className="bg-gray-700">
                <th className="border border-gray-600 p-3 text-left">
                  Student
                </th>
                <th className="border border-gray-600 p-3 text-left">Team</th>
                <th className="border border-gray-600 p-3 text-left">
                  Interview Time
                </th>
                <th className="border border-gray-600 p-3 text-left">Area</th>
                <th className="border border-gray-600 p-3 text-left">
                  Interviewer
                </th>
                <th className="border border-gray-600 p-3 text-left">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {interviewSchedule?.map((user) => (
                <tr key={user.id} className="hover:bg-gray-700">
                  <td className="border border-gray-600 p-3">
                    <div>
                      <p className="font-medium">{user.name || user.email}</p>
                      {user.name && (
                        <p className="text-xs text-gray-400">{user.email}</p>
                      )}
                    </div>
                  </td>
                  <td className="border border-gray-600 p-3">
                    {user.team?.name ?? "No team"}
                  </td>
                  <td className="border border-gray-600 p-3">
                    {user.interviewTime ? (
                      <span className="font-mono text-sm">
                        {formatDateTime(user.interviewTime)}
                      </span>
                    ) : (
                      <span className="text-gray-400">Not scheduled</span>
                    )}
                  </td>
                  <td className="border border-gray-600 p-3">
                    {user.interviewArea ? (
                      <span
                        className={`rounded px-2 py-1 text-xs ${getAreaColor(user.interviewArea)}`}
                      >
                        {user.interviewArea}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="border border-gray-600 p-3">
                    {user.interviewer?.name ?? "None"}
                  </td>
                  <td className="border border-gray-600 p-3">
                    <div className="flex gap-2">
                      {user.interviewTime && (
                        <button
                          onClick={() =>
                            clearInterview.mutate({ userId: user.id })
                          }
                          disabled={clearInterview.isPending}
                          className="rounded bg-red-600 px-2 py-1 text-xs hover:bg-red-700 disabled:opacity-50"
                        >
                          Clear
                        </button>
                      )}
                      <button
                        onClick={() => {
                          const datetime = prompt(
                            "Enter interview date/time (YYYY-MM-DD HH:MM):",
                          );
                          if (!datetime) return;

                          const userArea = user.interviewArea;
                          if (!userArea) {
                            toast.error(
                              "User has no area preference set. Please assign an area first.",
                            );
                            return;
                          }

                          // Find available interviewers for the user's area
                          const availableInterviewers =
                            interviewers?.filter((i) => i.area === userArea) ??
                            [];

                          if (availableInterviewers.length === 0) {
                            toast.error(
                              `No interviewers available for ${userArea} area`,
                            );
                            return;
                          }

                          // Use the first available interviewer (could be enhanced with conflict checking)
                          const interviewerId = availableInterviewers[0]?.id;
                          if (datetime && interviewerId) {
                            handleScheduleInterview(
                              user.id,
                              datetime,
                              interviewerId,
                            );
                          }
                        }}
                        disabled={scheduleInterview.isPending}
                        className="rounded bg-blue-600 px-2 py-1 text-xs hover:bg-blue-700 disabled:opacity-50"
                      >
                        {user.interviewTime ? "Reschedule" : "Schedule"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
        <div className="rounded-lg bg-gray-800 p-4">
          <h4 className="font-semibold">Total Students</h4>
          <p className="text-2xl font-bold">{interviewSchedule?.length ?? 0}</p>
        </div>
        <div className="rounded-lg bg-gray-800 p-4">
          <h4 className="font-semibold">Scheduled Interviews</h4>
          <p className="text-2xl font-bold text-green-400">
            {interviewSchedule?.filter((u) => u.interviewTime).length ?? 0}
          </p>
        </div>
        <div className="rounded-lg bg-gray-800 p-4">
          <h4 className="font-semibold">Pending Interviews</h4>
          <p className="text-2xl font-bold text-orange-400">
            {interviewSchedule?.filter((u) => !u.interviewTime).length ?? 0}
          </p>
        </div>
        <div className="rounded-lg bg-gray-800 p-4">
          <h4 className="font-semibold">Total Interviewers</h4>
          <p className="text-2xl font-bold">{interviewers?.length ?? 0}</p>
        </div>
        <div className="rounded-lg bg-gray-800 p-4">
          <h4 className="font-semibold">Max Parallel Capacity</h4>
          <p className="text-2xl font-bold text-blue-400">
            {Math.min(
              ...["MECHANICS", "ELECTRONICS", "PROGRAMMING"].map(
                (area) =>
                  interviewers?.filter((i) => i.area === area).length ?? 0,
              ),
            ) * 3}
            /slot
          </p>
        </div>
      </div>
    </div>
  );
}
