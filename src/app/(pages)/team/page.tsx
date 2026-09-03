import { api } from "~/trpc/server";
import Header from "../../_components/header";
import Footer from "../../_components/footer";
import { getServerAuthSession } from "~/server/auth";
import CustomLoginText from "../../_components/custom-login-text";
import TeamInfo from "../../_components/team/team";
import TeamPreseason from "../../_components/team/preseason";
import RegistrationSummary from "../../_components/team/registration-summary";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Role } from "@prisma/client";

export default async function TeamPage({
  params,
}: {
  params: { teampage: string };
}) {
  const session = await getServerAuthSession();
  if (!session) {
    return (
      <div className="flex h-screen items-center justify-center">
        <CustomLoginText
          text="Please login to view your team information"
          label={"Login"}
        />
      </div>
    );
  }

  const isInterviewer = await api.interviewer.isInterviewer();
  if (isInterviewer) {
    redirect("/interviewer");
  }

  const team = await api.team.getTeam();
  const registration = await api.registration.getMine();


  if (!team) {
    const staffDestination =
      session.user.role === Role.ADMIN
        ? { href: "/admin", label: "Ir al panel de administración" }
        : session.user.role === Role.JUDGE
          ? { href: "/judge", label: "Ir a calificar" }
          : null;

    if (staffDestination) {
      return (
        <div className="min-h-screen bg-black text-sm text-white md:text-base">
          <div className="pt-16 lg:pt-0">
            <Header title="Team" subtitle="Sin equipo" />
          </div>
          <div className="mx-auto max-w-3xl px-6 pb-20 font-archivo">
            <div className="rounded-xl bg-gradient-to-tr from-neutral-950 to-neutral-800 p-6 lg:p-8">
              <h3 className="font-anton text-xl tracking-wide text-white">
                No estás en ningún equipo
              </h3>
              <p className="mt-2 text-neutral-300">
                Esta página es para los equipos concursantes. Los equipos se
                arman desde el panel de administración.
              </p>
              <Link
                href={staffDestination.href}
                className="mt-4 inline-block rounded-lg bg-roboblue px-4 py-2 font-medium text-white transition-opacity hover:opacity-90"
              >
                {staffDestination.label}
              </Link>
            </div>
          </div>
          <Footer />
        </div>
      );
    }

    if (!registration) {
      return (
        <div className="min-h-screen bg-black text-sm text-white md:text-base">
          <div className="pt-16 lg:pt-0">
            <Header title="Team" subtitle="Sin equipo" />
          </div>
          <div className="mx-auto max-w-3xl px-6 pb-20 font-archivo">
            <div className="rounded-xl bg-gradient-to-tr from-neutral-950 to-neutral-800 p-6 lg:p-8">
              <h3 className="font-anton text-xl tracking-wide text-white">
                Todavía no tienes equipo
              </h3>
              <p className="mt-2 text-neutral-300">
                No encontramos un registro con este correo. Si te registraste,
                asegúrate de haber iniciado sesión con el mismo correo
                institucional que usaste en el formulario.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  href="/register"
                  className="rounded-lg bg-roboblue px-4 py-2 font-medium text-white transition-opacity hover:opacity-90"
                >
                  Ir al registro
                </Link>
                <a
                  href="mailto:roborregosteam@gmail.com"
                  className="rounded-lg border border-neutral-700 px-4 py-2 font-medium text-neutral-300 transition-colors hover:border-neutral-500"
                >
                  Escríbenos
                </a>
              </div>
            </div>
          </div>
          <Footer />
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-black text-sm text-white md:text-base">
        <div className="pt-16 lg:pt-0">
          <Header title="Team" subtitle="Tu registro" />
        </div>
        <div className="mx-auto max-w-3xl px-6 pb-20">
          <RegistrationSummary registration={registration} />
        </div>
        <Footer />
      </div>
    );
  }

  const competitionStarted = await api.config.isCompetitionStarted();


  if (!competitionStarted) {
    return (
      <div className="min-h-screen bg-black text-sm text-white md:text-base">
        <div className="pt-16 lg:pt-0">
          <Header title="Team" subtitle={team.name} />
        </div>
        <TeamPreseason
          teamName={team.name}
          userName={session.user.name ?? ""}
          members={team.members}
          registration={registration}
        />
        <Footer />
      </div>
    );
  }

  const me = await api.team.getCurrentUser();

  return (
    <div className="mt-[4rem] h-96 bg-black text-sm text-white md:text-base">
      <div className="md:pb-20">
        <Header title="Team" subtitle={team?.name ?? ""} />
      </div>

      <div className="px-20 pb-20 pt-10">
        <h1 className="text-xl font-semibold">
          <span className="pr-1 font-normal text-gray-200">&#60; </span> Welcome{" "}
          <span className="font-jersey_25 text-3xl text-blue-700">
            {session.user.name}
          </span>{" "}
          ! <span className="pl-1 font-normal text-gray-200">/&#62;</span>
        </h1>
        <div>
          Here you will find the schedules for your rounds and interviews as
          well as results for each round.
          <br />
          Please make sure to be on time for rounds and interviews.
          <br />
          Don&apos;t forget to add the link to your documents down below.
          <br />A link to a google drive folder is fine, but remember we can see
          the last time it was updated/created. (Ensure permissions are correct
          for us to access the docs)
        </div>
      </div>

      <TeamInfo team={team} userInterviewTime={me?.interviewTime ?? null} />

      <Footer />
    </div>
  );
}
