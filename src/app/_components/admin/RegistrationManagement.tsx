"use client";

import { useState } from "react";
import { toast } from "sonner";
import { type RegistrationStatus } from "@prisma/client";

import { api } from "~/trpc/react";
import {
  CURRENT_EDITION,
  ORIGIN_LABELS,
  ROLE_LABELS,
  STATUS_LABELS,
} from "~/lib/registration";

const STATUS_STYLES: Record<RegistrationStatus, string> = {
  PENDING: "bg-yellow-700",
  ACCEPTED: "bg-green-700",
  REJECTED: "bg-red-700",
};

export default function RegistrationManagement() {
  const [statusFilter, setStatusFilter] = useState<RegistrationStatus | "ALL">(
    "ALL",
  );
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: registrations, refetch } = api.registration.getAll.useQuery({
    edition: CURRENT_EDITION,
    ...(statusFilter === "ALL" ? {} : { status: statusFilter }),
  });

  const updateStatus = api.registration.updateStatus.useMutation({
    onSuccess() {
      toast.success("Estado actualizado");
      void refetch();
    },
    onError(error) {
      toast.error(error.message);
    },
  });

  const acceptRegistration = api.registration.accept.useMutation({
    onSuccess(data) {
      toast.success(
        data.teamCreated
          ? `Equipo "${data.teamName}" creado. Sus integrantes entran solos al iniciar sesión.`
          : data.teamName
            ? `Registro aceptado. El equipo "${data.teamName}" ya existía.`
            : "Registro aceptado. Esperando a ser asignado a un equipo.",
      );
      void refetch();
    },
    onError(error) {
      toast.error(error.message);
    },
  });

  const deleteRegistration = api.registration.delete.useMutation({
    onSuccess() {
      toast.success("Registro eliminado");
      void refetch();
    },
    onError(error) {
      toast.error(error.message);
    },
  });

  const exportCsv = () => {
    if (!registrations?.length) {
      toast("No hay registros para exportar");
      return;
    }

    const header = [
      "equipo",
      "competencia",
      "reto",
      "estado",
      "origen",
      "miembro",
      "nombre",
      "correo",
      "telefono",
      "carrera",
      "semestre",
      "rol",
    ];

    const escape = (value: string) => `"${value.replaceAll('"', '""')}"`;

    const rows = registrations.flatMap((registration) =>
      registration.members.map((member) =>
        [
          registration.teamName ?? "Sin equipo",
          registration.track,
          registration.challenge ?? "",
          registration.status,
          registration.origin ?? "",
          String(member.order),
          member.name,
          member.email,
          member.phone,
          member.career,
          String(member.semester),
          ROLE_LABELS[member.role],
        ]
          .map(escape)
          .join(","),
      ),
    );

    const csv = [header.join(","), ...rows].join("\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8;" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `registros-${CURRENT_EDITION}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const teamCount = registrations?.filter((r) => r.hasTeam).length ?? 0;
  const soloCount = (registrations?.length ?? 0) - teamCount;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg bg-gray-900 p-4">
        <div>
          <h3 className="text-lg font-semibold">
            Registros {CURRENT_EDITION} ({registrations?.length ?? 0})
          </h3>
          <p className="text-sm text-gray-400">
            {teamCount} con equipo · {soloCount} buscando equipo
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as RegistrationStatus | "ALL")
            }
            className="rounded border border-gray-600 bg-gray-700 p-2 text-sm"
          >
            <option value="ALL">Todos</option>
            {(
              Object.keys(STATUS_LABELS) as Array<keyof typeof STATUS_LABELS>
            ).map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status]}
              </option>
            ))}
          </select>
          <button
            onClick={exportCsv}
            className="rounded bg-roboblue px-3 py-2 text-sm font-medium text-black hover:opacity-90"
          >
            Exportar CSV
          </button>
        </div>
      </div>

      {!registrations?.length && (
        <p className="text-gray-400">Todavía no hay registros.</p>
      )}

      <div className="space-y-3">
        {registrations?.map((registration) => (
          <div key={registration.id} className="rounded-lg bg-gray-900 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold">
                    {registration.teamName ?? "Sin equipo"}
                  </h4>
                  <span
                    className={`rounded px-2 py-0.5 text-xs ${STATUS_STYLES[registration.status]}`}
                  >
                    {STATUS_LABELS[registration.status]}
                  </span>
                  {registration.teamId && (
                    <span className="rounded bg-gray-700 px-2 py-0.5 text-xs text-roboblue">
                      equipo creado
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-400">
                  {registration.track === "ADVANCED"
                    ? "Avanzados"
                    : "Principiantes"}
                  {registration.challenge && ` · ${registration.challenge}`}
                  {registration.origin &&
                    ` · ${ORIGIN_LABELS[registration.origin]}`}
                  {` · ${registration.members.length} ${
                    registration.members.length === 1 ? "persona" : "personas"
                  }`}
                </p>
                <p className="text-sm text-gray-500">
                  {registration.contactEmail}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() =>
                    acceptRegistration.mutate({ id: registration.id })
                  }
                  disabled={acceptRegistration.isPending}
                  className="rounded bg-green-600 px-2 py-1 text-xs hover:bg-green-700 disabled:opacity-50"
                >
                  {registration.hasTeam ? "Aceptar y crear equipo" : "Aceptar"}
                </button>
                <button
                  onClick={() =>
                    updateStatus.mutate({
                      id: registration.id,
                      status: "REJECTED",
                    })
                  }
                  disabled={updateStatus.isPending}
                  className="rounded bg-red-600 px-2 py-1 text-xs hover:bg-red-700 disabled:opacity-50"
                >
                  Rechazar
                </button>
                <button
                  onClick={() =>
                    setExpanded(
                      expanded === registration.id ? null : registration.id,
                    )
                  }
                  className="rounded bg-gray-700 px-2 py-1 text-xs hover:bg-gray-600"
                >
                  {expanded === registration.id ? "Ocultar" : "Ver detalles"}
                </button>
              </div>
            </div>

            {expanded === registration.id && (
              <div className="mt-4 space-y-3 border-t border-gray-700 pt-4">
                {registration.members.map((member) => (
                  <div key={member.id} className="rounded bg-gray-800 p-3">
                    <p className="font-medium">
                      {member.order}. {member.name} —{" "}
                      <span className="text-roboblue">
                        {ROLE_LABELS[member.role]}
                      </span>
                    </p>
                    <p className="text-sm text-gray-400">{member.email}</p>
                    <p className="text-sm text-gray-400">{member.phone}</p>
                    <p className="text-sm text-gray-400">
                      {member.career} · Semestre {member.semester}
                    </p>
                  </div>
                ))}

                {registration.hasTeam && (
                  <p className="text-sm text-gray-400">
                    ¿Quiere un miembro extra?{" "}
                    {registration.wantsExtraMember ? "Sí" : "No"}
                    {registration.wantsExtraMember &&
                      ` · ¿Ya lo conoce? ${
                        registration.knowsExtraMember ? "Sí" : "No"
                      }`}
                  </p>
                )}

                {registration.funFacts && (
                  <div className="rounded bg-gray-800 p-3">
                    <p className="text-sm font-medium">Fun facts</p>
                    <p className="text-sm text-gray-400">
                      {registration.funFacts}
                    </p>
                  </div>
                )}

                <button
                  onClick={() => {
                    if (
                      confirm(
                        "¿Eliminar este registro? La acción no se puede deshacer.",
                      )
                    ) {
                      deleteRegistration.mutate({ id: registration.id });
                    }
                  }}
                  disabled={deleteRegistration.isPending}
                  className="rounded bg-red-800 px-2 py-1 text-xs hover:bg-red-900 disabled:opacity-50"
                >
                  Eliminar registro
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
