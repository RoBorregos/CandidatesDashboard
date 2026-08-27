import Header from "../../_components/header";
import Footer from "../../_components/footer";
import { getServerAuthSession } from "~/server/auth";
import CustomLoginText from "../../_components/custom-login-text";
import { api } from "~/trpc/server";

export default async function MentorPage() {
  const session = await getServerAuthSession();

  if (!session) {
    return (
      <div className="flex h-screen items-center justify-center">
        <CustomLoginText
          text="Please login to view your mentor dashboard"
          label={"Login"}
        />
      </div>
    );
  }

  const pair = await api.mentor.getMyPair();
  const assignments = await api.mentor.getMyAssignments();

  const partner =
    pair &&
    (pair.mentorAId === session.user.id ? pair.mentorB : pair.mentorA);

  return (
    <div className="mt-16 min-h-screen bg-black text-sm text-white md:text-base">
      <div className="md:pb-8">
        <Header title="Mentor Dashboard" subtitle={session.user.name ?? ""} />
      </div>

      <main className="space-y-6 px-4 pb-20 pt-6 md:px-20">

        <div className="rounded-lg bg-gray-800 p-4">
          <h2 className="mb-3 text-sm font-semibold text-gray-200">
            My Mentor Pair
          </h2>

          {pair ? (
            <p className="text-sm text-gray-300">
              You're paired with{" "}
              <span className="font-medium text-white">
                {partner?.name ?? partner?.email}
              </span>
              .
            </p>
          ) : (
            <p className="text-sm text-gray-400">
              You don't have a mentor pair assigned yet.
            </p>
          )}
        </div>


        <div className="rounded-lg bg-gray-800 p-4">
          <h2 className="mb-3 text-sm font-semibold text-gray-200">
            My Teams
          </h2>

          {!pair || pair.teams.length === 0 ? (
            <p className="text-sm text-gray-400">
              No beginner teams assigned to your pair yet.
            </p>
          ) : (
            <div className="space-y-4">
              {pair.teams.map(({ team }) => (
                <div
                  key={team.id}
                  className="overflow-x-auto rounded border border-gray-700"
                >
                  <div className="bg-gray-900 px-3 py-2 text-sm font-medium text-white">
                    {team.name}
                  </div>

                  <table className="w-full table-auto border-collapse">
                    <thead>
                      <tr className="bg-gray-900 text-left text-sm text-gray-300">
                        <th className="border-l border-t border-gray-700 px-3 py-3 first:border-l-0">
                          Member
                        </th>
                        <th className="border-l border-t border-gray-700 px-3 py-3">
                          Area
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {team.members.map((member) => (
                        <tr
                          key={member.id}
                          className="border-t border-gray-700 hover:bg-gray-900"
                        >
                          <td className="border-l border-gray-700 px-3 py-3 first:border-l-0">
                            <div className="font-medium">
                              {member.name ?? member.email}
                            </div>
                            <div className="text-xs text-gray-400">
                              {member.email}
                            </div>
                          </td>
                          <td className="border-l border-gray-700 px-3 py-3">
                            {member.interviewArea ?? "-"}
                          </td>
                        </tr>
                      ))}
                      {team.members.length === 0 && (
                        <tr>
                          <td
                            colSpan={2}
                            className="px-3 py-4 text-sm text-gray-400"
                          >
                            No members yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}
        </div>


        <div className="rounded-lg bg-gray-800 p-4">
          <h2 className="mb-3 text-sm font-semibold text-gray-200">
            My Individual Mentees
          </h2>

          <div className="overflow-x-auto rounded border border-gray-700">
            <table className="w-full table-auto border-collapse">
              <thead>
                <tr className="bg-gray-900 text-left text-sm text-gray-300">
                  <th className="border-l border-gray-700 px-3 py-3 first:border-l-0">
                    Candidate
                  </th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((assignment) => {
                  const name =
                    assignment.registrationMember?.name ??
                    assignment.user?.name ??
                    assignment.registrationMember?.email ??
                    assignment.user?.email ??
                    "Unknown candidate";

                  const email =
                    assignment.registrationMember?.email ??
                    assignment.user?.email ??
                    null;

                  return (
                    <tr
                      key={assignment.id}
                      className="border-t border-gray-700 hover:bg-gray-900"
                    >
                      <td className="border-l border-gray-700 px-3 py-3 first:border-l-0">
                        <div className="font-medium">{name}</div>
                        {email && (
                          <div className="text-xs text-gray-400">{email}</div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {assignments.length === 0 && (
                  <tr>
                    <td className="px-3 py-4 text-sm text-gray-400">
                      No individual mentees assigned yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
