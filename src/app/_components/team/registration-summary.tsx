import { type InterviewArea, type RegistrationStatus } from "@prisma/client";

import { ROLE_LABELS, STATUS_LABELS } from "~/lib/registration";

type SummaryMember = {
  id: string;
  order: number;
  name: string;
  email: string;
  role: InterviewArea;
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
  PENDING: "bg-yellow-800",
  ACCEPTED: "bg-green-800",
  REJECTED: "bg-red-800",
};

const STATUS_MESSAGES: Record<RegistrationStatus, string> = {
  PENDING:
    "Tu registro está en revisión. Te avisaremos por correo cuando quede confirmado.",
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
    <div className="space-y-4 font-archivo">
      <div className={`rounded-lg p-6 ${STATUS_STYLES[registration.status]}`}>
        <div className="mb-2 flex flex-wrap items-center gap-3">
          <h3 className="text-xl font-semibold">
            {registration.teamName ?? "Registro individual"}
          </h3>
          <span className="rounded bg-black/30 px-2 py-0.5 text-sm">
            {STATUS_LABELS[registration.status]}
          </span>
        </div>
        <p>{STATUS_MESSAGES[registration.status]}</p>
        {!registration.hasTeam && registration.status !== "REJECTED" && (
          <p className="mt-2 text-sm text-gray-200">
            Te registraste sin equipo, así que nosotros te asignamos uno antes de
            la competencia.
          </p>
        )}
      </div>

      <div className="rounded-lg bg-gray-800 p-6">
        <h4 className="mb-1 text-lg font-semibold">Lo que registraste</h4>
        <p className="mb-4 text-sm text-gray-400">
          {registration.track === "ADVANCED" ? "Avanzados" : "Principiantes"}
          {registration.challenge && ` · ${registration.challenge}`}
        </p>

        <div className="space-y-2">
          {registration.members.map((member) => (
            <div
              key={member.id}
              className="rounded border border-gray-700 bg-gray-900 p-3"
            >
              <p className="font-medium">
                {member.name}{" "}
                <span className="text-roboblue">
                  · {ROLE_LABELS[member.role]}
                </span>
              </p>
              <p className="text-sm text-gray-400">{member.email}</p>
            </div>
          ))}
        </div>

        <p className="mt-4 text-sm text-gray-400">
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
