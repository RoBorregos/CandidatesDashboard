import { type InterviewArea, type RegistrationStatus } from "@prisma/client";

import { ROLE_LABELS, STATUS_LABELS } from "~/lib/registration";

type SummaryMember = {
  id: string;
  order: number;
  name: string;
  email: string;
  role: InterviewArea | null;
};

export type RegistrationSummaryData = {
  status: RegistrationStatus;
  hasTeam: boolean;
  teamName: string | null;
  track: string;
  challenge: string | null;
  members: SummaryMember[];
};

const STATUS_STYLES: Record<RegistrationStatus, string> = {
  PENDING: "border-yellow-600/50",
  ACCEPTED: "border-roboblue/50",
  REJECTED: "border-red-600/50",
};

const STATUS_BADGES: Record<RegistrationStatus, string> = {
  PENDING: "bg-yellow-700",
  ACCEPTED: "bg-roboblue",
  REJECTED: "bg-red-700",
};

const STATUS_MESSAGES: Record<RegistrationStatus, string> = {
  PENDING: "Tu registro está en revisión.",
  ACCEPTED: "¡Tu registro fue aceptado! Ya eres parte de Candidates 2026.",
  REJECTED:
    "Tu registro no fue aceptado en esta edición. Si crees que es un error, escríbenos.",
};

export default function RegistrationSummary({
  registration,
}: {
  registration: RegistrationSummaryData;
}) {
  return (
    <div className="space-y-6 font-archivo">
      <div
        className={`rounded-xl border bg-gradient-to-tr from-neutral-950 to-neutral-800 p-6 lg:p-8 ${STATUS_STYLES[registration.status]}`}
      >
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <h3 className="font-jersey_25 text-4xl leading-none text-roboblue">
            {registration.teamName ?? "Registro individual"}
          </h3>
          <span
            className={`rounded px-2 py-0.5 text-sm text-white ${STATUS_BADGES[registration.status]}`}
          >
            {STATUS_LABELS[registration.status]}
          </span>
        </div>
        <p className="text-neutral-300">
          {STATUS_MESSAGES[registration.status]}
        </p>
        {!registration.hasTeam && registration.status !== "REJECTED" && (
          <p className="mt-2 text-sm text-neutral-400">
            Te registraste sin equipo, así que nosotros te asignamos uno antes de
            la competencia.
          </p>
        )}
      </div>

      <div className="rounded-xl bg-gradient-to-tr from-neutral-950 to-neutral-800 p-6 lg:p-8">
        <h4 className="font-anton text-xl tracking-wide text-white">
          Lo que registraste
        </h4>
        <p className="mb-4 mt-1 text-sm text-neutral-400">
          {registration.track === "ADVANCED" ? "Avanzados" : "Principiantes"}
          {registration.challenge && ` · ${registration.challenge}`}
        </p>

        <div className="space-y-2">
          {registration.members.map((member) => (
            <div
              key={member.id}
              className="rounded-lg border border-neutral-800 bg-black/40 p-3"
            >
              <p className="font-medium text-white">
                {member.name}
                {member.role && (
                  <span className="text-roboblue">
                    {" "}
                    · {ROLE_LABELS[member.role]}
                  </span>
                )}
              </p>
              <p className="text-sm text-neutral-400">{member.email}</p>
            </div>
          ))}
        </div>

        <p className="mt-4 text-sm text-neutral-400">
          ¿Algún dato está mal? Escríbenos a{" "}
          <a
            href="mailto:roborregosteam@gmail.com"
            className="text-roboblue hover:underline"
          >
            roborregosteam@gmail.com
          </a>
          .
        </p>
      </div>
    </div>
  );
}
