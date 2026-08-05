"use client";

import { useState } from "react";
import { toast } from "sonner";

import { api } from "~/trpc/react";
import {
  ADVANCED_CHALLENGES,
  CAREER_SUGGESTIONS,
  MAX_TEAM_MEMBERS,
  MEMBER_ROLES,
  MIN_TEAM_MEMBERS,
  ORIGIN_LABELS,
  ROLE_LABELS,
  TRACKS,
  registrationSchema,
  semesterOptionsFor,
} from "~/lib/registration";

type Track = (typeof TRACKS)[number]["value"];
type Role = (typeof MEMBER_ROLES)[number];
type OriginValue = keyof typeof ORIGIN_LABELS;

type MemberDraft = {
  name: string;
  email: string;
  phone: string;
  career: string;
  semester: string;
  role: Role | "";
};

const EMPTY_MEMBER: MemberDraft = {
  name: "",
  email: "",
  phone: "",
  career: "",
  semester: "",
  role: "",
};

const inputClass =
  "w-full rounded-lg border border-neutral-700 bg-neutral-900 p-3 font-archivo text-white placeholder-neutral-500 transition-colors focus:border-roboblue focus:outline-none focus:ring-1 focus:ring-roboblue";

const labelClass = "mb-1 block font-archivo text-sm text-neutral-300";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 font-archivo text-sm text-red-400">{message}</p>;
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
    <section className="rounded-xl bg-gradient-to-tr from-neutral-950 to-neutral-800 p-6 lg:p-8">
      <h3 className="flex items-baseline gap-3 font-archivo text-lg font-semibold text-white lg:text-xl">
        <span className="font-jersey_25 text-3xl leading-none text-roboblue">
          {step}
        </span>
        {title}
      </h3>
      {hint && (
        <p className="mt-2 font-archivo text-sm text-neutral-400">{hint}</p>
      )}
      <div className="mt-5 space-y-4">{children}</div>
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
      className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 font-archivo transition-colors ${
        checked
          ? "border-roboblue bg-roboblue/10"
          : "border-neutral-700 hover:border-neutral-500"
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
        <span className="block font-medium text-white">{label}</span>
        {description && (
          <span className="block text-sm text-neutral-400">{description}</span>
        )}
      </span>
    </label>
  );
}

function MemberFields({
  title,
  member,
  index,
  track,
  errors,
  onChange,
}: {
  title: string;
  member: MemberDraft;
  index: number;
  track: Track;
  errors: Record<string, string>;
  onChange: (patch: Partial<MemberDraft>) => void;
}) {
  const errorFor = (field: keyof MemberDraft) =>
    errors[`members.${index}.${field}`];

  return (
    <div className="rounded-lg border border-neutral-800 bg-black/40 p-4">
      <h4 className="mb-4 font-anton text-lg tracking-wide text-roboblue">
        {title}
      </h4>

      <div className="space-y-3">
        <div>
          <label className={labelClass}>Nombre completo *</label>
          <input
            type="text"
            value={member.name}
            onChange={(e) => onChange({ name: e.target.value })}
            className={inputClass}
          />
          <FieldError message={errorFor("name")} />
        </div>

        <div>
          <label className={labelClass}>
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

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Teléfono (WhatsApp) *</label>
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
            <label className={labelClass}>Carrera *</label>
            <input
              type="text"
              value={member.career}
              onChange={(e) => onChange({ career: e.target.value })}
              placeholder="IRS"
              list="carreras-tec"
              className={inputClass}
            />
            <FieldError message={errorFor("career")} />
          </div>

          <div>
            <label className={labelClass}>Semestre *</label>
            <select
              value={member.semester}
              onChange={(e) => onChange({ semester: e.target.value })}
              className={inputClass}
            >
              <option value="">Selecciona...</option>
              {semesterOptionsFor(track).map((semester) => (
                <option key={semester} value={semester}>
                  {semester}
                </option>
              ))}
            </select>
            <FieldError message={errorFor("semester")} />
          </div>

          {track === "BEGINNER" && (
            <div>
              <label className={labelClass}>Rol *</label>
              <select
                value={member.role}
                onChange={(e) => onChange({ role: e.target.value as Role })}
                className={inputClass}
              >
                <option value="">Selecciona...</option>
                {MEMBER_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </option>
                ))}
              </select>
              <FieldError message={errorFor("role")} />
            </div>
          )}
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

  const chooseTrack = (value: Track) => {
    setTrack(value);
    setErrors({});
    resizeMembers(1);
    setTeamName("");
    setWantsExtraMember(null);
    setKnowsExtraMember(null);

    if (value === "ADVANCED") {
  
      setHasTeam(false);
      setFunFacts("");
    } else {
      setChallenge("");
      setHasTeam(null);
    }
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

    // Zod cannot cover the yes/no questions: null is not a valid boolean.
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
      // Role stays empty for advanced, where it is not asked.
      members: members.map((member) => ({
        ...member,
        role: member.role || undefined,
      })),
      wantsExtraMember: hasTeam ? (wantsExtraMember ?? false) : undefined,
      knowsExtraMember: hasTeam ? (knowsExtraMember ?? false) : undefined,
      origin: hasTeam === false ? origin || undefined : undefined,
      funFacts:
        track === "BEGINNER" && hasTeam === false ? funFacts : undefined,
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
      <div className="rounded-xl border border-roboblue/40 bg-gradient-to-tr from-neutral-950 to-neutral-800 p-8 text-center">
        <h3 className="font-jersey_25 text-5xl leading-none text-roboblue">
          ¡Registro enviado!
        </h3>
        <p className="mt-4 font-archivo text-neutral-300">
          Recibimos tu solicitud para Candidates 2026. Nos pondremos en contacto
          por WhatsApp con los siguientes pasos.
        </p>
        {createRegistration.data?.teamName && (
          <p className="mt-4 font-anton text-xl tracking-wide text-white">
            {createRegistration.data.teamName}
          </p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Compartido por los campos de carrera de todos los miembros. */}
      <datalist id="carreras-tec">
        {CAREER_SUGGESTIONS.map((career) => (
          <option key={career} value={career} />
        ))}
      </datalist>

      <Section step={1} title="¿A qué competencia quieres aplicar? *">
        <div className="space-y-3">
          {TRACKS.map((option) => (
            <RadioOption
              key={option.value}
              name="track"
              checked={track === option.value}
              onChange={() => chooseTrack(option.value)}
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

      {track === "BEGINNER" && (
        <Section step={2} title="¿Ya tienes equipo? *">
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

      {track === "BEGINNER" && hasTeam === true && (
        <>
          <Section
            step={3}
            title="Registro de equipo"
            hint={`Necesitamos los datos de ${MIN_TEAM_MEMBERS} miembros. El miembro 1 eres tú.`}
          >
            <div>
              <label className={labelClass}>Nombre del equipo *</label>
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
                track={track}
                errors={errors}
                onChange={(patch) => updateMember(index, patch)}
              />
            ))}
            <FieldError message={errors.members} />
          </Section>

          <Section
            step={4}
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
              <div className="mt-4 space-y-3 border-t border-neutral-700 pt-4">
                <p className="font-archivo font-medium text-white">
                  ¿Ya conoces al otro miembro? *
                </p>
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
                    track={track}
                    errors={errors}
                    onChange={(patch) => updateMember(index, patch)}
                  />
                ) : null,
              )}
          </Section>
        </>
      )}

      {track !== "" && hasTeam === false && (
        <Section
          step={3}
          title="Tus datos"
          hint={
            track === "ADVANCED"
              ? "El reto avanzado se compite de forma individual."
              : "No te preocupes, te conseguiremos un equipo."
          }
        >
          {members.map((member, index) =>
            index === 0 ? (
              <MemberFields
                key={index}
                index={index}
                title="Datos personales"
                member={member}
                track={track}
                errors={errors}
                onChange={(patch) => updateMember(index, patch)}
              />
            ) : null,
          )}

          <div>
            <label className={labelClass}>¿De dónde eres? *</label>
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

          {/* Los fun facts nos sirven para armar equipos, asi que no aplican
              a la rama avanzada, que es individual. */}
          {track === "BEGINNER" && (
            <div>
              <label className={labelClass}>
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
          )}
        </Section>
      )}

      {hasTeam !== null && (
        <button
          type="submit"
          disabled={createRegistration.isPending}
          className="w-full rounded-xl bg-roboblue py-4 font-anton text-xl tracking-wide text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
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
