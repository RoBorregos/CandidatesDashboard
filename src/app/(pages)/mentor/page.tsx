import Link from "next/link";
import Header from "../../_components/header";
import Footer from "../../_components/footer";
import { getServerAuthSession } from "~/server/auth";
import CustomLoginText from "../../_components/custom-login-text";
import { api } from "~/trpc/server";
import TeamConflictPrompt from "../../_components/mentor/TeamConflictPrompt";

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
  const challengeGroups = await api.mentor.getMyChallengeCandidates();

  const isMentorA = pair?.mentorAId === session.user.id;
  const partner = pair && (isMentorA ? pair.mentorB : pair.mentorA);

  const pendingConflictTeam = pair?.teams.find(
    (t) =>
      (isMentorA ? t.mentorAKnowsTeam : t.mentorBKnowsTeam) === null,
  );

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
              You&apos;re paired with{" "}
              <span className="font-medium text-white">
                {partner?.name ?? partner?.email}
              </span>
              .
            </p>
          ) : (
            <p className="text-sm text-gray-400">
              You don&apos;t have a mentor pair assigned yet.
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
              {pair.teams.map((assignment) => {
                const { team } = assignment;
                const myAnswer = isMentorA
                  ? assignment.mentorAKnowsTeam
                  : assignment.mentorBKnowsTeam;
                const confirmed =
                  assignment.mentorAKnowsTeam === false &&
                  assignment.mentorBKnowsTeam === false;

                return (
                  <div
                    key={team.id}
                    className="overflow-x-auto rounded border border-gray-700"
                  >
                    <div className="flex items-center justify-between gap-2 bg-gray-900 px-3 py-2 text-sm font-medium text-white">
                      <span>{team.name}</span>

                      <span className="flex items-center gap-2">
                        {confirmed ? (
                          <span className="inline-flex rounded-full bg-green-900/60 px-2.5 py-1 text-xs font-medium text-green-300">
                            Confirmed
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-yellow-900/60 px-2.5 py-1 text-xs font-medium text-yellow-300">
                            {myAnswer === null
                              ? "Awaiting your confirmation"
                              : "Awaiting your partner"}
                          </span>
                        )}

                        <Link
                          href={`/mentor/team/${team.id}`}
                          className="rounded-md bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700"
                        >
                          Seguimiento semanal
                        </Link>
                      </span>
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
                          <th className="border-l border-t border-gray-700 px-3 py-3">
                            Email
                          </th>
                          <th className="border-l border-t border-gray-700 px-3 py-3">
                            Phone
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {team.members.map((member) => (
                          <tr
                            key={member.id}
                            className="border-t border-gray-700 hover:bg-gray-900"
                          >
                            <td className="border-l border-gray-700 px-3 py-3 font-medium first:border-l-0">
                              {member.name ?? member.email ?? "—"}
                            </td>
                            <td className="border-l border-gray-700 px-3 py-3">
                              {member.interviewArea ?? "-"}
                            </td>
                            <td className="border-l border-gray-700 px-3 py-3">
                              {member.email ? (
                                <a
                                  href={`mailto:${member.email}`}
                                  className="text-blue-400 hover:underline"
                                >
                                  {member.email}
                                </a>
                              ) : (
                                "-"
                              )}
                            </td>
                            <td className="border-l border-gray-700 px-3 py-3">
                              {member.phone ? (
                                <a
                                  href={`tel:${member.phone}`}
                                  className="text-blue-400 hover:underline"
                                >
                                  {member.phone}
                                </a>
                              ) : (
                                "-"
                              )}
                            </td>
                          </tr>
                        ))}
                        {team.members.length === 0 && (
                          <tr>
                            <td
                              colSpan={4}
                              className="px-3 py-4 text-sm text-gray-400"
                            >
                              No members yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {pendingConflictTeam && (
          <TeamConflictPrompt
            teamId={pendingConflictTeam.team.id}
            teamName={pendingConflictTeam.team.name}
            myKnowsTeam={
              isMentorA
                ? pendingConflictTeam.mentorAKnowsTeam
                : pendingConflictTeam.mentorBKnowsTeam
            }
          />
        )}


        {challengeGroups.length > 0 && (
          <div className="rounded-lg bg-gray-800 p-4">
            <h2 className="mb-3 text-sm font-semibold text-gray-200">
              My Challenge Candidates
            </h2>

            <div className="space-y-4">
              {challengeGroups.map((group) => (
                <div
                  key={group.challenge}
                  className="overflow-x-auto rounded border border-gray-700"
                >
                  <div className="bg-gray-900 px-3 py-2 text-sm font-medium text-white">
                    {group.challenge}
                  </div>

                  <table className="w-full table-auto border-collapse">
                    <thead>
                      <tr className="bg-gray-900 text-left text-sm text-gray-300">
                        <th className="border-t border-gray-700 px-3 py-3">
                          Candidate
                        </th>
                        <th className="border-l border-t border-gray-700 px-3 py-3">
                          Area
                        </th>
                        <th className="border-l border-t border-gray-700 px-3 py-3">
                          Email
                        </th>
                        <th className="border-l border-t border-gray-700 px-3 py-3">
                          Phone
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.candidates.map((candidate) => (
                        <tr
                          key={candidate.id}
                          className="border-t border-gray-700 hover:bg-gray-900"
                        >
                          <td className="px-3 py-3 font-medium">
                            {candidate.name}
                          </td>
                          <td className="border-l border-gray-700 px-3 py-3">
                            {candidate.interviewArea ?? "-"}
                          </td>
                          <td className="border-l border-gray-700 px-3 py-3">
                            <a
                              href={`mailto:${candidate.email}`}
                              className="text-blue-400 hover:underline"
                            >
                              {candidate.email}
                            </a>
                          </td>
                          <td className="border-l border-gray-700 px-3 py-3">
                            <a
                              href={`tel:${candidate.phone}`}
                              className="text-blue-400 hover:underline"
                            >
                              {candidate.phone}
                            </a>
                          </td>
                        </tr>
                      ))}
                      {group.candidates.length === 0 && (
                        <tr>
                          <td
                            colSpan={4}
                            className="px-3 py-4 text-sm text-gray-400"
                          >
                            No candidates registered for this challenge yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </div>
        )}

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
                  <th className="border-l border-gray-700 px-3 py-3">Area</th>
                  <th className="border-l border-gray-700 px-3 py-3">Email</th>
                  <th className="border-l border-gray-700 px-3 py-3">Phone</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((assignment) => (
                  <tr
                    key={assignment.id}
                    className="border-t border-gray-700 hover:bg-gray-900"
                  >
                    <td className="border-l border-gray-700 px-3 py-3 font-medium first:border-l-0">
                      {assignment.name}
                    </td>
                    <td className="border-l border-gray-700 px-3 py-3">
                      {assignment.interviewArea ?? "-"}
                    </td>
                    <td className="border-l border-gray-700 px-3 py-3">
                      {assignment.email ? (
                        <a
                          href={`mailto:${assignment.email}`}
                          className="text-blue-400 hover:underline"
                        >
                          {assignment.email}
                        </a>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="border-l border-gray-700 px-3 py-3">
                      {assignment.phone ? (
                        <a
                          href={`tel:${assignment.phone}`}
                          className="text-blue-400 hover:underline"
                        >
                          {assignment.phone}
                        </a>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                ))}
                {assignments.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-4 text-sm text-gray-400">
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
