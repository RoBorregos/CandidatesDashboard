import Header from "../../_components/header";
import Footer from "../../_components/footer";
import { getServerAuthSession } from "~/server/auth";
import CustomLoginText from "../../_components/custom-login-text";
import { api } from "~/trpc/server";
import { User } from "@prisma/client";

export default async function InterviewerPage() {
  const session = await getServerAuthSession();

  if (!session) {
    return (
      <div className="flex h-screen items-center justify-center">
        <CustomLoginText
          text="Please login to view interviews"
          label={"Login"}
        />
      </div>
    );
  }

  // Call server RPC to get interviews for this interviewer
  const mecanics = await api.interviewer.getMecanicsInterviewers();
  const electronics = await api.interviewer.getElectronicsInterviewers();
  const programming = await api.interviewer.getProgrammingInterviewers();
  const interviewers = [
    { area: "mecanics", interview: mecanics },
    { area: "electronics", interview: electronics },
    { area: "programming", interview: programming },
  ];

  const now = new Date();

  // helpers
  const formatTime = (d?: string | Date | null) => {
    if (!d) return "-";
    const date = typeof d === "string" ? new Date(d) : d;
    // show only hour:minute AM/PM
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const areaClasses = (area: string | null | undefined) => {
    switch (area) {
      case "MECHANICS":
        return "text-red-200 bg-red-900/60 border-red-700";
      case "ELECTRONICS":
        return "text-green-200 bg-green-900/60 border-green-700";
      case "PROGRAMMING":
        return "text-blue-200 bg-blue-900/60 border-blue-700";
      default:
        return "text-gray-200 bg-gray-700/40 border-gray-600";
    }
  };

  // per-area lists will be computed where needed below

  return (
    <div className="mt-16 min-h-screen bg-black text-sm text-white md:text-base">
      <div className="md:pb-8">
        <Header title="Interviews" subtitle={"Schedule"} />
      </div>

      <main className="px-4 pb-20 pt-6 md:px-20">
        <div className="space-y-6">
          <div className="rounded-lg bg-gray-800 p-6">
            <h2 className="text-lg font-semibold text-white">
              Scheduled Interviews
            </h2>
          </div>

          <div className="rounded-lg bg-gray-800 p-4">
            {interviewers.map((grp) => {
              const list = grp.interview ?? [];
              const past = list.filter(
                (u: User) =>
                  u.interviewTime && new Date(u.interviewTime) <= now,
              );
              const future = list.filter(
                (u: User) => u.interviewTime && new Date(u.interviewTime) > now,
              );

              return (
                <div key={grp.area} className="mb-6">
                  <h3 className="mb-3 text-sm font-semibold text-gray-200">
                    {grp.area.toUpperCase()} — Upcoming ({future.length})
                  </h3>
                  <div className="mb-4 overflow-x-auto rounded border border-gray-700">
                    <table className="w-full table-auto border-collapse">
                      <thead>
                        <tr className="bg-gray-900 text-left text-sm text-gray-300">
                          <th className="border-l border-gray-700 px-3 py-3 first:border-l-0">
                            Candidate
                          </th>
                          <th className="border-l border-gray-700 px-3 py-3">
                            Team
                          </th>
                          <th className="border-l border-gray-700 px-3 py-3">
                            Time
                          </th>
                          <th className="border-l border-gray-700 px-3 py-3">
                            Interviewer
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {future.map((u) => (
                          <tr
                            key={u.id}
                            className={`border-t border-gray-700 hover:bg-gray-900`}
                          >
                            <td className="border-l border-gray-700 px-3 py-3 first:border-l-0">
                              <div>
                                <div className="font-medium">
                                  {u.name ?? u.email}
                                </div>
                                <div className="text-xs text-gray-400">
                                  {u.email}
                                </div>
                              </div>
                            </td>
                            <td className="border-l border-gray-700 px-3 py-3">
                              {u.team?.name ?? "-"}
                            </td>
                            <td className="border-l border-gray-700 px-3 py-3 font-medium text-green-300">
                              {formatTime(u.interviewTime)}
                            </td>
                            <td className="border-l border-gray-700 px-3 py-3">
                              <span
                                className={`inline-block rounded border px-2 py-1 text-xs font-medium ${areaClasses(u.interviewer?.area)}`}
                              >
                                {u.interviewer?.name ?? "-"}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {future.length === 0 && (
                          <tr>
                            <td
                              colSpan={4}
                              className="px-3 py-4 text-sm text-gray-400"
                            >
                              No upcoming interviews.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <h3 className="mb-3 text-sm font-semibold text-gray-200">
                    Past ({past.length})
                  </h3>
                  <div className="overflow-x-auto rounded border border-gray-700">
                    <table className="w-full table-auto border-collapse">
                      <thead>
                        <tr className="bg-gray-900 text-left text-sm text-gray-300">
                          <th className="border-l border-gray-700 px-3 py-3 first:border-l-0">
                            Candidate
                          </th>
                          <th className="border-l border-gray-700 px-3 py-3">
                            Team
                          </th>
                          <th className="border-l border-gray-700 px-3 py-3">
                            Time
                          </th>
                          <th className="border-l border-gray-700 px-3 py-3">
                            Interviewer
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {past.map((u) => (
                          <tr
                            key={u.id}
                            className={`border-t border-gray-700 hover:bg-gray-900`}
                          >
                            <td className="border-l border-gray-700 px-3 py-3 first:border-l-0">
                              <div>
                                <div className="font-medium">
                                  {u.name ?? u.email}
                                </div>
                                <div className="text-xs text-gray-400">
                                  {u.email}
                                </div>
                              </div>
                            </td>
                            <td className="border-l border-gray-700 px-3 py-3">
                              {u.team?.name ?? "-"}
                            </td>
                            <td className="border-l border-gray-700 px-3 py-3 font-medium text-gray-300">
                              {formatTime(u.interviewTime)}
                            </td>
                            <td className="border-l border-gray-700 px-3 py-3">
                              <span
                                className={`inline-block rounded border px-2 py-1 text-xs font-medium ${u.interviewer?.name}`}
                              >
                                {u.interviewer?.name}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {past.length === 0 && (
                          <tr>
                            <td
                              colSpan={4}
                              className="px-3 py-4 text-sm text-gray-400"
                            >
                              No past interviews.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
