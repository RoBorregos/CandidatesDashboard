import Header from "../../_components/header";
import Footer from "../../_components/footer";
import { getServerAuthSession } from "~/server/auth";
import CustomLoginText from "../../_components/custom-login-text";
import { api } from "~/trpc/server";

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
  const interviews = await api.interviewer.getMyInterviews();

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

  const past = interviews.filter(
    (u) => u.interviewTime && new Date(u.interviewTime) <= now,
  );
  const future = interviews.filter(
    (u) => u.interviewTime && new Date(u.interviewTime) > now,
  );
  const pending = interviews.filter((u) => !u.interviewTime);

  return (
    <div className="mt-16 min-h-screen bg-black text-sm text-white md:text-base">
      <div className="md:pb-8">
        <Header title="My Interviews" subtitle={session.user.name ?? ""} />
      </div>

      <main className="px-4 pb-20 pt-6 md:px-20">
        <div className="space-y-6">
          <div className="rounded-lg bg-gray-800 p-6">
            <h2 className="text-lg font-semibold text-white">
              Scheduled Interviews
            </h2>
          </div>

          <div className="rounded-lg bg-gray-800 p-4">
            <section className="mb-6">
              <h3 className="mb-3 text-sm font-semibold text-gray-200">
                Upcoming ({future.length})
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
                        Area
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
                            className={`inline-block rounded border px-2 py-1 text-xs font-medium ${areaClasses(u.interviewArea)}`}
                          >
                            {u.interviewArea ?? "-"}
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
            </section>

            <div className="my-6 h-px w-full bg-gray-700" />

            <section>
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
                        Area
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
                            className={`inline-block rounded border px-2 py-1 text-xs font-medium ${areaClasses(u.interviewArea)}`}
                          >
                            {u.interviewArea ?? "-"}
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
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
