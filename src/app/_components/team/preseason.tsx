import { type InterviewArea } from "@prisma/client";

import { AREA_LABELS } from "~/lib/registration";
import RegistrationSummary, {
  type RegistrationSummaryData,
} from "./registration-summary";

type TeamMember = {
  id: string;
  name: string | null;
  email: string | null;
  interviewArea: InterviewArea | null;
};

export default function TeamPreseason({
  teamName,
  members,
  registration,
}: {
  teamName: string;
  members: TeamMember[];
  registration: RegistrationSummaryData | null;
}) {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-6 pb-20 font-archivo">
      <div className="rounded-xl bg-gradient-to-tr from-neutral-950 to-neutral-800 p-6 lg:p-8">
        <h3 className="font-archivo text-lg text-neutral-400">Tu equipo</h3>
        <p className="font-jersey_25 text-5xl leading-none text-roboblue">
          {teamName}
        </p>

        <div className="mt-6 space-y-2">
          {members.map((member) => (
            <div
              key={member.id}
              className="rounded-lg border border-neutral-800 bg-black/40 p-3"
            >
              <p className="font-medium text-white">
                {member.name ?? "Sin nombre"}
                {member.interviewArea && (
                  <span className="text-roboblue">
                    {" "}
                    · {AREA_LABELS[member.interviewArea]}
                  </span>
                )}
              </p>
              {member.email && (
                <p className="text-sm text-neutral-400">{member.email}</p>
              )}
            </div>
          ))}
        </div>

        {members.length === 0 && (
          <p className="mt-4 text-sm text-neutral-400">
            Todavía nadie de tu equipo ha iniciado sesión. Aparecerán aquí
            conforme entren con su correo institucional.
          </p>
        )}
      </div>

      <div className="rounded-xl bg-gradient-to-tr from-neutral-950 to-neutral-800 p-6 lg:p-8">
        <h3 className="font-anton text-xl tracking-wide text-white">
          Lo que sigue
        </h3>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-neutral-300">
          <li>
            Pide a tus compañeros que inicien sesión con el mismo correo
            institucional que registraron: así quedan dentro del equipo.
          </li>
          <li>
            Cuando arranque la competencia, aquí mismo aparecerán los horarios de
            tus rondas, tu entrevista y tus resultados.
          </li>
        </ul>
      </div>

      {registration && <RegistrationSummary registration={registration} />}
    </div>
  );
}
