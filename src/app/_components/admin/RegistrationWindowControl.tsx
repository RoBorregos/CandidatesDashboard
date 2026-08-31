"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { api } from "~/trpc/react";
import {
  resolveRegistrationWindow,
  type RegistrationWindow,
} from "~/lib/registration";

const CLOSING_HOUR = 23;
const CLOSING_MINUTE = 59;

/** Presets offered for a temporary reopen, in minutes. */
const REOPEN_PRESETS = [10, 30, 60];

/** Must match the cap `openRegistrationTemporarily` enforces server-side. */
const MAX_REOPEN_MINUTES = 24 * 60;

/**
 * The upcoming Saturday at the given time — today, if it is Saturday and the
 * time has not passed yet. Keeps the "close on Saturday" preset correct for
 * every edition instead of hardcoding one date.
 */
function upcomingSaturday(hour: number, minute: number) {
  const target = new Date();
  target.setHours(hour, minute, 0, 0);

  const daysAhead = (6 - target.getDay() + 7) % 7;
  if (daysAhead > 0 || target <= new Date()) {
    target.setDate(target.getDate() + (daysAhead === 0 ? 7 : daysAhead));
  }

  return target;
}

/** Date -> the "YYYY-MM-DDTHH:mm" that datetime-local expects, in local time. */
function toInputValue(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatDateTime(date: Date) {
  return date.toLocaleString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCountdown(target: Date, now: Date) {
  const totalSeconds = Math.max(0, Math.floor((+target - +now) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (value: number) => String(value).padStart(2, "0");
  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${minutes}:${pad(seconds)}`;
}

function StatusBanner({
  windowState,
  now,
}: {
  windowState: RegistrationWindow;
  now: Date;
}) {
  const { isOpen, state, closesAt, overrideUntil } = windowState;

  const detail = (() => {
    switch (state) {
      case "OPEN":
        return closesAt
          ? `Cierra automáticamente el ${formatDateTime(closesAt)}.`
          : "Sin fecha de cierre programada.";
      case "CLOSED_BY_SCHEDULE":
        return closesAt ? `Cerró el ${formatDateTime(closesAt)}.` : "Cerrado.";
      case "OPEN_TEMPORARILY":
        return overrideUntil
          ? `Apertura temporal · quedan ${formatCountdown(overrideUntil, now)}.`
          : "Apertura manual sin límite de tiempo.";
      case "CLOSED_BY_ADMIN":
        return "Cerrado manualmente. El horario programado no aplica hasta que lo restaures.";
    }
  })();

  return (
    <div
      className={`flex flex-wrap items-center gap-3 rounded-lg p-4 ${
        isOpen ? "bg-green-900/40" : "bg-red-900/40"
      }`}
    >
      <span
        className={`rounded px-2 py-1 text-xs font-semibold ${
          isOpen ? "bg-green-600" : "bg-red-600"
        }`}
      >
        {isOpen ? "REGISTRO ABIERTO" : "REGISTRO CERRADO"}
      </span>
      <span className="text-sm text-gray-200">{detail}</span>
    </div>
  );
}

export default function RegistrationWindowControl() {
  const [closesAtInput, setClosesAtInput] = useState("");
  const [reopenMinutes, setReopenMinutes] = useState(15);
  const [now, setNow] = useState(() => new Date());
  const hydrated = useRef(false);

  const { data: windowConfig, refetch } =
    api.admin.getRegistrationWindow.useQuery();

  // A scheduled close and a temporary reopen both expire on their own, so the
  // panel recomputes locally instead of waiting for a refetch.
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (hydrated.current || !windowConfig) return;
    hydrated.current = true;
    setClosesAtInput(
      windowConfig.registrationClosesAt
        ? toInputValue(windowConfig.registrationClosesAt)
        : "",
    );
  }, [windowConfig]);

  const mutationOptions = (message: string) => ({
    onSuccess() {
      toast.success(message);
      void refetch();
    },
    onError(error: { message: string }) {
      toast.error(error.message);
    },
  });

  const scheduleClose = api.admin.scheduleRegistrationClose.useMutation(
    mutationOptions("Horario de cierre actualizado"),
  );
  const openTemporarily = api.admin.openRegistrationTemporarily.useMutation(
    mutationOptions("Registro reabierto temporalmente"),
  );
  const closeNow = api.admin.closeRegistrationNow.useMutation(
    mutationOptions("Registro cerrado"),
  );
  const followSchedule = api.admin.followRegistrationSchedule.useMutation(
    mutationOptions("Se restauró el horario programado"),
  );

  const isBusy =
    scheduleClose.isPending ||
    openTemporarily.isPending ||
    closeNow.isPending ||
    followSchedule.isPending;

  // Recompute from the ticking clock so an expiring window flips without a refetch.
  const live = windowConfig
    ? resolveRegistrationWindow(windowConfig, now)
    : null;
  const hasOverride =
    live?.state === "OPEN_TEMPORARILY" || live?.state === "CLOSED_BY_ADMIN";

  const handleSchedule = () => {
    if (!closesAtInput) {
      toast.error("Elige una fecha y hora de cierre");
      return;
    }
    scheduleClose.mutate({ closesAt: new Date(closesAtInput) });
  };

  return (
    <div className="space-y-4 rounded-lg bg-gray-900 p-4">
      <div>
        <h3 className="text-lg font-semibold">Registro de candidatos</h3>
        <p className="text-sm text-gray-400">
          Programa el cierre del formulario público y reábrelo cuando alguien
          tenga un problema.
        </p>
      </div>

      {live ? (
        <StatusBanner windowState={live} now={now} />
      ) : (
        <p className="text-sm text-gray-400">Cargando estado...</p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3 rounded-lg bg-gray-800 p-4">
          <h4 className="font-medium">Cierre programado</h4>
          <div>
            <label className="text-xs text-gray-400">Fecha y hora</label>
            <input
              type="datetime-local"
              value={closesAtInput}
              onChange={(e) => setClosesAtInput(e.target.value)}
              className="w-full rounded border border-gray-600 bg-gray-700 p-2 text-sm"
            />
          </div>

          <button
            onClick={() =>
              setClosesAtInput(
                toInputValue(upcomingSaturday(CLOSING_HOUR, CLOSING_MINUTE)),
              )
            }
            className="text-xs text-roboblue hover:underline"
          >
            Usar el próximo sábado a las{" "}
            {`${CLOSING_HOUR}:${String(CLOSING_MINUTE).padStart(2, "0")}`}
          </button>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleSchedule}
              disabled={isBusy}
              className="rounded bg-roboblue px-3 py-2 text-sm font-medium text-black hover:opacity-90 disabled:opacity-50"
            >
              Programar cierre
            </button>
            {windowConfig?.registrationClosesAt && (
              <button
                onClick={() => {
                  setClosesAtInput("");
                  scheduleClose.mutate({ closesAt: null });
                }}
                disabled={isBusy}
                className="rounded bg-gray-700 px-3 py-2 text-sm hover:bg-gray-600 disabled:opacity-50"
              >
                Quitar fecha
              </button>
            )}
          </div>
          <p className="text-xs text-gray-500">
            Programar un cierre también cancela cualquier apertura o cierre
            manual.
          </p>
        </div>

        <div className="space-y-3 rounded-lg bg-gray-800 p-4">
          <h4 className="font-medium">Control manual</h4>

          <div>
            <label className="text-xs text-gray-400">
              Reabrir por (minutos)
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                min={1}
                max={MAX_REOPEN_MINUTES}
                value={reopenMinutes}
                // Clearing the field yields NaN, and `NaN < 1` is false — which
                // would leave the button enabled and send NaN to the server.
                onChange={(e) => {
                  const parsed = Number.parseInt(e.target.value, 10);
                  setReopenMinutes(Number.isNaN(parsed) ? 0 : parsed);
                }}
                className="w-24 rounded border border-gray-600 bg-gray-700 p-2 text-sm"
              />
              <button
                onClick={() =>
                  openTemporarily.mutate({ minutes: reopenMinutes })
                }
                disabled={
                  isBusy ||
                  reopenMinutes < 1 ||
                  reopenMinutes > MAX_REOPEN_MINUTES
                }
                className="rounded bg-green-600 px-3 py-2 text-sm hover:bg-green-700 disabled:opacity-50"
              >
                Abrir {reopenMinutes} min
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {REOPEN_PRESETS.map((minutes) => (
              <button
                key={minutes}
                onClick={() => setReopenMinutes(minutes)}
                className="rounded bg-gray-700 px-2 py-1 text-xs hover:bg-gray-600"
              >
                {minutes} min
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 border-t border-gray-700 pt-3">
            <button
              onClick={() => closeNow.mutate()}
              disabled={isBusy}
              className="rounded bg-red-600 px-3 py-2 text-sm hover:bg-red-700 disabled:opacity-50"
            >
              Cerrar ahora
            </button>
            {hasOverride && (
              <button
                onClick={() => followSchedule.mutate()}
                disabled={isBusy}
                className="rounded bg-gray-700 px-3 py-2 text-sm hover:bg-gray-600 disabled:opacity-50"
              >
                Volver al horario programado
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
