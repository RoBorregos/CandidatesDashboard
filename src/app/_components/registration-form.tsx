"use client";

import { useState } from "react";
import { toast } from "sonner";

import { api } from "~/trpc/react";
import {
  ADVANCED_CHALLENGES,
  MAX_TEAM_MEMBERS,
  MEMBER_ROLES,
  MIN_TEAM_MEMBERS,
  ORIGIN_LABELS,
  ROLE_LABELS,
  TRACKS,
  registrationSchema,
} from "~/lib/registration";

type Track = (typeof TRACKS)[number]["value"];
type Role = (typeof MEMBER_ROLES)[number];
type OriginValue = keyof typeof ORIGIN_LABELS;

type MemberDraft = {
  name: string;
  email: string;
  phone: string;
  careerAndSemester: string;
  role: Role | "";
};

const EMPTY_MEMBER: MemberDraft = {
  name: "",
  email: "",
  phone: "",
  careerAndSemester: "",
  role: "",
};

const inputClass =
  "w-full rounded border border-gray-600 bg-gray-700 p-3 text-white placeholder-gray-400 focus:border-roboblue focus:outline-none";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-sm text-red-400">{message}</p>;
}

function Section({
  step,
  title,
  hint,
  children,
}: {
  step: number;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg bg-gray-800 p-6">
      <h3 className="text-xl font-semibold">
        <span className="mr-2 text-roboblue">{step}.</span>
        {title}
      </h3>
      {hint && <p className="mt-1 text-sm text-gray-400">{hint}</p>}
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function RadioOption({
  name,
  checked,
  onChange,
  label,
  description,
}: {
  name: string;
  checked: boolean;
  onChange: () => void;
  label: string;
  description?: string;
}) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded border p-3 transition-colors ${
        checked
          ? "border-roboblue bg-gray-700"
          : "border-gray-600 hover:border-gray-500"
      }`}
    >
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onChange}
        className="mt-1 accent-roboblue"
      />
      <span>
        <span className="block font-medium">{label}</span>
        {description && (
          <span className="block text-sm text-gray-400">{description}</span>
        )}
      </span>
    </label>
  );
}

function MemberFields({
  title,
  member,
  index,
  errors,
  onChange,
}: {
  title: string;
  member: MemberDraft;
  index: number;
  errors: Record<string, string>;
  onChange: (patch: Partial<MemberDraft>) => void;
}) {
  const errorFor = (field: keyof MemberDraft) =>
    errors[`members.${index}.${field}`];

  return (
    <div className="rounded border border-gray-700 bg-gray-900 p-4">
      <h4 className="mb-3 font-semibold text-roboblue">{title}</h4>
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-sm font-medium">
            Nombre completo *
          </label>
          <input
            type="text"
            value={member.name}
            onChange={(e) => onChange({ name: e.target.value })}
            className={inputClass}
          />
          <FieldError message={errorFor("name")} />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">
            Correo electrónico institucional *
          </label>
          <input
            type="email"
            value={member.email}
            onChange={(e) => onChange({ email: e.target.value })}
            placeholder="a01234567@tec.mx"
            className={inputClass}
          />
          <FieldError message={errorFor("email")} />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">
            Número de teléfono (WhatsApp) *
          </label>
          <input
            type="tel"
            value={member.phone}
            onChange={(e) => onChange({ phone: e.target.value })}
            placeholder="8112345678"
            className={inputClass}
          />
          <FieldError message={errorFor("phone")} />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">
            Carrera y semestre *
          </label>
          <input
            type="text"
            value={member.careerAndSemester}
            onChange={(e) => onChange({ careerAndSemester: e.target.value })}
            placeholder="IRS, 5to semestre"
            className={inputClass}
          />
          <FieldError message={errorFor("careerAndSemester")} />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Rol *</label>
          <select
            value={member.role}
            onChange={(e) => onChange({ role: e.target.value as Role })}
            className={inputClass}
          >
            <option value="">Selecciona un rol...</option>
            {MEMBER_ROLES.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role]}
              </option>
            ))}
          </select>
          <FieldError message={errorFor("role")} />
        </div>
      </div>
    </div>
  );
}

export default function RegistrationForm() {
  const [track, setTrack] = useState<Track | "">("");
  const [challenge, setChallenge] = useState("");
  const [hasTeam, setHasTeam] = useState<boolean | null>(null);
  const [teamName, setTeamName] = useState("");
  const [members, setMembers] = useState<MemberDraft[]>([{ ...EMPTY_MEMBER }]);
  const [wantsExtraMember, setWantsExtraMember] = useState<boolean | null>(null);
  const [knowsExtraMember, setKnowsExtraMember] = useState<boolean | null>(null);
  const [origin, setOrigin] = useState<OriginValue | "">("");
  const [funFacts, setFunFacts] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const utils = api.useUtils();
  const createRegistration = api.registration.create.useMutation({
    onSuccess() {
      toast.success("¡Registro enviado!");
      void utils.registration.invalidate();
    },
    onError(error) {
      toast.error(error.message);
    },
  });

  const resizeMembers = (count: number) => {
    setMembers((prev) => {
      const next = prev.slice(0, count);
      while (next.length < count) next.push({ ...EMPTY_MEMBER });
      return next;
    });
  };

  const chooseHasTeam = (value: boolean) => {
    setHasTeam(value);
    setErrors({});
    resizeMembers(value ? MIN_TEAM_MEMBERS : 1);
    if (!value) {
      setTeamName("");
      setWantsExtraMember(null);
      setKnowsExtraMember(null);
    } else {
      setOrigin("");
      setFunFacts("");
    }
  };

  const chooseWantsExtraMember = (value: boolean) => {
    setWantsExtraMember(value);
    setKnowsExtraMember(null);
    resizeMembers(MIN_TEAM_MEMBERS);
  };

  const chooseKnowsExtraMember = (value: boolean) => {
    setKnowsExtraMember(value);
    resizeMembers(value ? MAX_TEAM_MEMBERS : MIN_TEAM_MEMBERS);
  };

  const updateMember = (index: number, patch: Partial<MemberDraft>) => {
    setMembers((prev) =>
      prev.map((member, i) => (i === index ? { ...member, ...patch } : member)),
    );
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    // Las preguntas de si/no no las cubre zod: null no es un booleano valido.
    const pending: Record<string, string> = {};
    if (hasTeam === null) pending.hasTeam = "Selecciona una opción";
    if (hasTeam && wantsExtraMember === null) {
      pending.wantsExtraMember = "Selecciona una opción";
    }
    if (hasTeam && wantsExtraMember && knowsExtraMember === null) {
      pending.knowsExtraMember = "Selecciona una opción";
    }

    const parsed = registrationSchema.safeParse({
      track,
      challenge: track === "ADVANCED" ? challenge || undefined : undefined,
      hasTeam: hasTeam ?? false,
      teamName: hasTeam ? teamName : undefined,
      members,
      wantsExtraMember: hasTeam ? (wantsExtraMember ?? false) : undefined,
      knowsExtraMember: hasTeam ? (knowsExtraMember ?? false) : undefined,
      origin: hasTeam === false ? origin || undefined : undefined,
      funFacts: hasTeam === false ? funFacts : undefined,
    });

    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const key = issue.path.join(".");
        pending[key] ??= issue.message;
      }
    }

    if (Object.keys(pending).length > 0) {
      setErrors(pending);
      toast.error("Revisa los campos marcados en rojo");
      return;
    }

    setErrors({});
    if (parsed.success) {
      createRegistration.mutate(parsed.data);
    }
  };

  if (createRegistration.isSuccess) {
    return (
      <div className="rounded-lg bg-green-800 p-6 text-center">
        <h3 className="mb-2 text-2xl font-semibold">¡Registro enviado!</h3>
        <p>
          Recibimos tu solicitud para Candidates 2026. Nos pondremos en contacto
          por correo y WhatsApp con los siguientes pasos.
        </p>
        {createRegistration.data?.teamName && (
          <p className="mt-2 text-sm text-green-200">
            Equipo registrado: <strong>{createRegistration.data.teamName}</strong>
          </p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Section step={1} title="¿A qué competencia quieres aplicar? *">
        <div className="space-y-3">
          {TRACKS.map((option) => (
            <RadioOption
              key={option.value}
              name="track"
              checked={track === option.value}
              onChange={() => {
                setTrack(option.value);
                if (option.value === "BEGINNER") setChallenge("");
              }}
              label={option.label}
              description={option.description}
            />
          ))}
        </div>
        <FieldError message={errors.track} />
      </Section>

      {track === "ADVANCED" && (
        <Section step={2} title="¿En qué reto estás interesado? *">
          <select
            value={challenge}
            onChange={(e) => setChallenge(e.target.value)}
            className={inputClass}
          >
            <option value="">Selecciona un reto...</option>
            {ADVANCED_CHALLENGES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <FieldError message={errors.challenge} />
        </Section>
      )}

      {track !== "" && (
        <Section step={track === "ADVANCED" ? 3 : 2} title="¿Ya tienes equipo? *">
          <div className="space-y-3">
            <RadioOption
              name="hasTeam"
              checked={hasTeam === true}
              onChange={() => chooseHasTeam(true)}
              label="Sí"
              description={`Registra a los ${MIN_TEAM_MEMBERS} miembros de tu equipo.`}
            />
            <RadioOption
              name="hasTeam"
              checked={hasTeam === false}
              onChange={() => chooseHasTeam(false)}
              label="No"
              description="No te preocupes, te conseguiremos un equipo."
            />
          </div>
          <FieldError message={errors.hasTeam} />
        </Section>
      )}

      {hasTeam === true && (
        <>
          <Section
            step={track === "ADVANCED" ? 4 : 3}
            title="Registro de equipo"
            hint={`Necesitamos los datos de ${MIN_TEAM_MEMBERS} miembros. El miembro 1 eres tú.`}
          >
            <div>
              <label className="mb-1 block text-sm font-medium">
                Nombre del equipo *
              </label>
              <input
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                className={inputClass}
              />
              <FieldError message={errors.teamName} />
            </div>

            {members.slice(0, MIN_TEAM_MEMBERS).map((member, index) => (
              <MemberFields
                key={index}
                index={index}
                title={index === 0 ? "Miembro 1 (tú)" : `Miembro ${index + 1}`}
                member={member}
                errors={errors}
                onChange={(patch) => updateMember(index, patch)}
              />
            ))}
            <FieldError message={errors.members} />
          </Section>

          <Section
            step={track === "ADVANCED" ? 5 : 4}
            title="¿Te gustaría tener alguien más en tu equipo? *"
          >
            <div className="space-y-3">
              <RadioOption
                name="wantsExtraMember"
                checked={wantsExtraMember === true}
                onChange={() => chooseWantsExtraMember(true)}
                label="Sí"
              />
              <RadioOption
                name="wantsExtraMember"
                checked={wantsExtraMember === false}
                onChange={() => chooseWantsExtraMember(false)}
                label="No"
              />
            </div>
            <FieldError message={errors.wantsExtraMember} />

            {wantsExtraMember === true && (
              <div className="mt-4 space-y-3 border-t border-gray-700 pt-4">
                <p className="font-medium">¿Ya conoces al otro miembro? *</p>
                <RadioOption
                  name="knowsExtraMember"
                  checked={knowsExtraMember === true}
                  onChange={() => chooseKnowsExtraMember(true)}
                  label="Sí"
                />
                <RadioOption
                  name="knowsExtraMember"
                  checked={knowsExtraMember === false}
                  onChange={() => chooseKnowsExtraMember(false)}
                  label="No (asignaremos a alguien en tu equipo)"
                />
                <FieldError message={errors.knowsExtraMember} />
              </div>
            )}

            {wantsExtraMember === true &&
              knowsExtraMember === true &&
              members.map((member, index) =>
                index === MIN_TEAM_MEMBERS ? (
                  <MemberFields
                    key={index}
                    index={index}
                    title="Miembro 4"
                    member={member}
                    errors={errors}
                    onChange={(patch) => updateMember(index, patch)}
                  />
                ) : null,
              )}
          </Section>
        </>
      )}

      {hasTeam === false && (
        <Section
          step={track === "ADVANCED" ? 4 : 3}
          title="Tus datos"
          hint="No te preocupes, te conseguiremos un equipo."
        >
          {members.map((member, index) =>
            index === 0 ? (
              <MemberFields
                key={index}
                index={index}
                title="Datos personales"
                member={member}
                errors={errors}
                onChange={(patch) => updateMember(index, patch)}
              />
            ) : null,
          )}

          <div>
            <label className="mb-1 block text-sm font-medium">
              ¿De dónde eres? *
            </label>
            <div className="space-y-3">
              {(
                Object.keys(ORIGIN_LABELS) as Array<keyof typeof ORIGIN_LABELS>
              ).map((option) => (
                <RadioOption
                  key={option}
                  name="origin"
                  checked={origin === option}
                  onChange={() => setOrigin(option)}
                  label={ORIGIN_LABELS[option]}
                />
              ))}
            </div>
            <FieldError message={errors.origin} />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Menciona algunos fun facts sobre ti *
            </label>
            <textarea
              value={funFacts}
              onChange={(e) => setFunFacts(e.target.value)}
              placeholder="Nos ayuda a armar equipos que se lleven bien."
              className={`${inputClass} h-28`}
            />
            <FieldError message={errors.funFacts} />
          </div>
        </Section>
      )}

      {hasTeam !== null && (
        <button
          type="submit"
          disabled={createRegistration.isPending}
          className="w-full rounded bg-roboblue py-3 font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {createRegistration.isPending ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              <span>Enviando...</span>
            </div>
          ) : (
            "Enviar registro"
          )}
        </button>
      )}
    </form>
  );
}
