"use client";

import { useMemo, useState } from "react";
import { api } from "~/trpc/react";
import Select from "react-select";
import { InterviewArea } from "@prisma/client";
import type { job } from "@prisma/client";

type UserListItem = {
  id: string;
  name: string | null;
  email: string | null;
  image?: string | null;
  isStaff: boolean;
};

type ScheduleItem = {
  id: string;
  createdAt: Date;
  userId: string;
  roundNumber: number;
  job: job;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    interviewArea: InterviewArea | null;
  } | null;
};

export default function StaffManagement() {
  const utils = api.useUtils();
  const { data: users } = api.admin.getAllUsers.useQuery();
  const {
    data: staffUsers,
    isLoading: staffLoading,
    refetch: refetchStaff,
  } = api.admin.getStaffUsers.useQuery();

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const selectedUser = useMemo(
    () => users?.find((u) => u.id === selectedUserId) ?? null,
    [users, selectedUserId],
  );

  const setUserStaff = api.admin.setUserStaff.useMutation({
    onSuccess: async () => {
      await utils.admin.getAllUsers.invalidate();
      await utils.admin.getStaffUsers.invalidate();
    },
  });

  const setStaffArea = api.admin.setStaffArea.useMutation({
    onSuccess: async () => {
      await utils.admin.getAllUsers.invalidate();
      await utils.admin.getStaffUsers.invalidate();
    },
  });

  const { data: unavailability, refetch: refetchUnavailability } =
    api.admin.listUnavailability.useQuery(
      { userId: selectedUserId ?? "" },
      { enabled: !!selectedUserId },
    );

  const addUnavailability = api.admin.addUnavailability.useMutation({
    onSuccess: async () => {
      await refetchUnavailability();
      setStart("");
      setEnd("");
    },
  });

  const deleteUnavailability = api.admin.deleteUnavailability.useMutation({
    onSuccess: async () => {
      await refetchUnavailability();
    },
  });

  // Staff schedule hooks
  const {
    data: schedule,
    refetch: refetchSchedule,
    isLoading: scheduleLoading,
  } = api.admin.getStaffSchedule.useQuery();
  const groupedSchedule = useMemo(() => {
    return ((schedule ?? []) as ScheduleItem[]).reduce<
      Record<number, ScheduleItem[]>
    >((acc, a) => {
      const key = a.roundNumber ?? 0;
      if (!acc[key]) acc[key] = [];
      acc[key].push(a);
      return acc;
    }, {});
  }, [schedule]);
  const generateSchedule = api.admin.generateStaffSchedule.useMutation({
    onSuccess: async () => {
      await refetchSchedule();
    },
  });
  const clearSchedule = api.admin.clearStaffSchedule.useMutation({
    onSuccess: async () => {
      await refetchSchedule();
    },
  });

  const [start, setStart] = useState(""); // time string: HH:MM
  const [end, setEnd] = useState("");

  const timeToMinutes = (t: string) => {
    // expects "HH:MM"
    const [hhStr, mmStr] = t.split(":");
    if (hhStr === undefined || mmStr === undefined) return null;
    const hh = Number(hhStr);
    const mm = Number(mmStr);
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
    return hh * 60 + mm;
  };

  const minutesToTime = (m: number) => {
    const hh = Math.floor(m / 60)
      .toString()
      .padStart(2, "0");
    const mm = (m % 60).toString().padStart(2, "0");
    return `${hh}:${mm}`;
  };

  const userItems: UserListItem[] = useMemo(
    () =>
      (users ?? []).map((u) => ({
        id: u.id,
        name: u.name ?? null,
        email: u.email ?? null,
        image: u.image ?? null,
        isStaff: u.isStaff ?? false,
      })),
    [users],
  );

  const userOptions = useMemo(
    () =>
      userItems.map((u) => ({
        value: u.id,
        label: `${u.name ?? u.email ?? "Unknown"}${u.email ? ` (${u.email})` : ""}`,
      })),
    [userItems],
  );

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-white">Staff Management</h2>

      {/* Find user */}
      <div className="rounded-lg border border-gray-800 p-4">
        <h3 className="mb-3 text-lg font-medium text-white">Find a user</h3>
        <div className="grid gap-3 md:grid-cols-[minmax(240px,_1fr)_auto]">
          <Select
            classNamePrefix="select"
            options={userOptions}
            isClearable
            placeholder="Search user by name or email..."
            onChange={(opt) => setSelectedUserId(opt?.value ?? null)}
            styles={{
              control: (provided) => ({
                ...provided,
                backgroundColor: "black",
                color: "white",
                cursor: "text",
              }),
              menu: (p) => ({ ...p, backgroundColor: "black" }),
              option: (p, state) => ({
                ...p,
                backgroundColor: state.isFocused ? "#333" : "black",
                color: "white",
                cursor: "pointer",
              }),
              singleValue: (p) => ({ ...p, color: "white" }),
              placeholder: (p) => ({ ...p, color: "#9ca3af" }),
              input: (p) => ({ ...p, color: "white" }),
            }}
          />
          <button
            className="rounded-md bg-gray-800 px-3 py-2 text-sm text-gray-100 disabled:opacity-50"
            disabled={!selectedUser}
            onClick={() => setSelectedUserId(null)}
          >
            Clear
          </button>
        </div>
        {selectedUser && (
          <div className="mt-3 flex items-center justify-between rounded-md border border-gray-800 bg-black/40 p-3">
            <div className="text-sm text-gray-200">
              <div className="font-medium text-white">
                {selectedUser.name ?? selectedUser.email}
              </div>
              <div className="text-gray-400">{selectedUser.email}</div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-300">
                {selectedUser.isStaff ? "Staff" : "Not Staff"}
              </span>
              <select
                className="rounded-md border border-gray-700 bg-black p-2 text-gray-100 outline-none focus:border-roboblue"
                value={selectedUser.interviewArea ?? ""}
                onChange={async (e) => {
                  const value = e.target.value as
                    | keyof typeof InterviewArea
                    | "";
                  await setStaffArea.mutateAsync({
                    userId: selectedUser.id,
                    area: value === "" ? null : InterviewArea[value],
                  });
                }}
              >
                <option value="">No area</option>
                {Object.keys(InterviewArea).map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
              <button
                className={`rounded-md px-3 py-1 text-sm ${
                  selectedUser.isStaff
                    ? "bg-red-600/80 text-white hover:bg-red-600"
                    : "bg-roboblue text-black"
                }`}
                onClick={async () => {
                  await setUserStaff.mutateAsync({
                    userId: selectedUser.id,
                    isStaff: !selectedUser.isStaff,
                  });
                  await refetchStaff();
                }}
              >
                {selectedUser.isStaff ? "Remove from Staff" : "Add to Staff"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Staff table */}
      <div className="overflow-hidden rounded-lg border border-gray-800">
        <div className="border-b border-gray-800 bg-gray-900/50 px-4 py-3 text-sm font-medium uppercase tracking-wider text-gray-400">
          Current Staff
        </div>
        <table className="min-w-full divide-y divide-gray-800">
          <thead className="bg-black/40">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                Email
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                Area
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-400">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800 bg-black/40">
            {staffLoading && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-gray-400">
                  Loading staff...
                </td>
              </tr>
            )}
            {!staffLoading && (staffUsers ?? []).length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-gray-400">
                  No staff users.
                </td>
              </tr>
            )}
            {(staffUsers ?? []).map((u) => (
              <tr key={u.id} className="hover:bg-gray-900/30">
                <td className="px-4 py-2 text-sm text-white">
                  {u.name ?? "—"}
                </td>
                <td className="px-4 py-2 text-sm text-gray-300">
                  {u.email ?? "—"}
                </td>
                <td className="px-4 py-2 text-sm text-gray-300">
                  <select
                    className="rounded-md border border-gray-700 bg-black p-1 text-gray-100 outline-none focus:border-roboblue"
                    value={u.interviewArea ?? ""}
                    onChange={async (e) => {
                      const value = e.target.value as
                        | keyof typeof InterviewArea
                        | "";
                      await setStaffArea.mutateAsync({
                        userId: u.id,
                        area: value === "" ? null : InterviewArea[value],
                      });
                      await refetchStaff();
                    }}
                  >
                    <option value="">No area</option>
                    {Object.keys(InterviewArea).map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-2 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      className="rounded-md bg-gray-800 px-3 py-1 text-sm text-gray-200 hover:bg-gray-700"
                      onClick={() => setSelectedUserId(u.id)}
                    >
                      Manage
                    </button>
                    <button
                      className="rounded-md bg-red-600/80 px-3 py-1 text-sm text-white hover:bg-red-600"
                      onClick={async () => {
                        await setUserStaff.mutateAsync({
                          userId: u.id,
                          isStaff: false,
                        });
                        await refetchStaff();
                        await utils.admin.getAllUsers.invalidate();
                        if (selectedUserId === u.id) setSelectedUserId(null);
                      }}
                    >
                      Unstaff
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Staff schedule */}
      <div className="rounded-lg border border-gray-800 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-medium text-white">Staff Schedule</h3>
          <div className="flex items-center gap-2">
            <button
              className="rounded-md bg-roboblue px-3 py-2 text-sm font-medium text-black disabled:opacity-50"
              disabled={generateSchedule.isPending}
              onClick={() => generateSchedule.mutate({ overwrite: true })}
            >
              {generateSchedule.isPending ? "Generating…" : "Generate schedule"}
            </button>
            <button
              className="rounded-md bg-gray-800 px-3 py-2 text-sm text-gray-100 hover:bg-gray-700 disabled:opacity-50"
              disabled={clearSchedule.isPending}
              onClick={() => clearSchedule.mutate({})}
            >
              {clearSchedule.isPending ? "Clearing…" : "Clear"}
            </button>
          </div>
        </div>

        {scheduleLoading ? (
          <div className="text-sm text-gray-400">Loading schedule…</div>
        ) : (schedule ?? []).length === 0 ? (
          <div className="text-sm text-gray-400">No assignments yet.</div>
        ) : (
          <div className="overflow-hidden rounded-md border border-gray-800">
            {Object.entries(groupedSchedule).map(([round, items]) => (
              <div key={round} className="border-b border-gray-800">
                <div className="bg-gray-900/50 px-4 py-2 text-sm font-medium uppercase tracking-wider text-gray-400">
                  Round {round}
                </div>
                <table className="min-w-full divide-y divide-gray-800">
                  <thead className="bg-black/40">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                        Job
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                        User
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                        Area
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800 bg-black/40">
                    {(items).map((a) => (
                      <tr key={a.id} className="hover:bg-gray-900/30">
                        <td className="px-4 py-2 text-sm text-white">
                          {String(a.job)}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-300">
                          {a.user?.name ?? a.user?.email ?? "—"}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-300">
                          {a.user?.interviewArea ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Unavailability editor */}
      <div className="rounded-lg border border-gray-800 p-4">
        <h3 className="mb-4 text-lg font-medium text-white">
          Unavailability
          {selectedUser ? (
            <span className="ml-2 text-gray-400">
              for {selectedUser.name ?? selectedUser.email}
            </span>
          ) : (
            <span className="ml-2 text-gray-500">Select a user to edit</span>
          )}
        </h3>

        <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <input
            type="time"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="rounded-md border border-gray-700 bg-black p-2 text-gray-100 outline-none focus:border-roboblue"
            disabled={!selectedUser}
          />
          <input
            type="time"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="rounded-md border border-gray-700 bg-black p-2 text-gray-100 outline-none focus:border-roboblue"
            disabled={!selectedUser}
          />
          <button
            className="rounded-md bg-roboblue px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
            disabled={
              !selectedUser || !start || !end || addUnavailability.isPending
            }
            onClick={() => {
              if (!selectedUserId) return;
              const sMin = timeToMinutes(start);
              const eMin = timeToMinutes(end);
              if (sMin == null || eMin == null) return;
              addUnavailability.mutate({
                userId: selectedUserId,
                startMin: sMin,
                endMin: eMin,
              });
            }}
          >
            Add
          </button>
        </div>

        <div className="mt-4 divide-y divide-gray-800 overflow-hidden rounded-md border border-gray-800">
          {(unavailability ?? []).length === 0 ? (
            <div className="p-4 text-sm text-gray-400">No entries.</div>
          ) : (
            (unavailability ?? []).map((u) => (
              <div
                key={u.id}
                className="flex items-center justify-between bg-black/40 p-3 hover:bg-gray-900/30"
              >
                <div className="text-sm text-gray-200">
                  <span className="text-white">
                    {minutesToTime(u.startMin)}
                  </span>
                  <span className="mx-2 text-gray-500">→</span>
                  <span className="text-white">{minutesToTime(u.endMin)}</span>
                </div>
                <button
                  className="rounded-md bg-red-600/80 px-3 py-1 text-sm text-white hover:bg-red-600"
                  onClick={() => deleteUnavailability.mutate({ id: u.id })}
                >
                  Delete
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
