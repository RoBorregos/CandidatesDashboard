/*
 * The FINAL submission is not a free-form folder like weeks 2-6: every team
 * hands in exactly these four deliverables. Each file is stored under its
 * slot's subfolder, `FINAL/{team}/{slot}/{file}` — which slot each one fills is recorded in the
 * folder's FINAL_MANIFEST_FILE, and the repository link (which is not a file
 * at all) in FINAL_REPOSITORY_FILE.
 */

export const FINAL_DELIVERABLES = [
  {
    key: "CAD",
    kind: "file",
    label: "CAD",
    description: "Modelo 3D completo del robot.",
    formats: "STEP, STL, F3D, SLDASM, ZIP…",
    accept: ".step,.stp,.stl,.f3d,.f3z,.sldprt,.sldasm,.iges,.igs,.3mf,.obj,.zip",
  },
  {
    key: "SCHEMATIC",
    kind: "file",
    label: "Esquemático",
    description: "Diagrama eléctrico / electrónico del robot.",
    formats: "PDF, Eprj, KiCad, Fritzing, SVG, ZIP…",
    accept: ".pdf,.eprj,.kicad_sch,.kicad_pro,.sch,.fzz,.svg,.zip",
  },
  {
    key: "REPOSITORY",
    kind: "link",
    label: "Repositorio",
    description: "Enlace al repositorio con el código del robot.",
    formats: "GitHub, GitLab…",
    accept: "",
  },
  {
    key: "LOGBOOK",
    kind: "file",
    label: "Bitácora unificada",
    description: "Bitácora de todo el equipo en un solo documento.",
    formats: "PDF, DOCX",
    accept: ".pdf,.docx",
  },
] as const;

export type FinalDeliverable = (typeof FINAL_DELIVERABLES)[number];
export type FinalDeliverableKey = FinalDeliverable["key"];
export type FinalFileDeliverableKey = Extract<
  FinalDeliverable,
  { kind: "file" }
>["key"];

export const FINAL_FILE_DELIVERABLE_KEYS = FINAL_DELIVERABLES.filter(
  (d): d is Extract<FinalDeliverable, { kind: "file" }> => d.kind === "file",
).map((d) => d.key) as [FinalFileDeliverableKey, ...FinalFileDeliverableKey[]];

/**
 * Internal file in `FINAL/{team}/` mapping each uploaded file to its slot.
 * Like COMMENTS.md it is managed server-side only and hidden from listings.
 */
export const FINAL_MANIFEST_FILE = "ENTREGAS.json";

/**
 * Internal file in `FINAL/{team}/` holding the repository link:
 * `{ "repository": "https://github.com/…" }`. Kept apart from the manifest so
 * saving the link never touches the uploaded files' slots.
 */
export const FINAL_REPOSITORY_FILE = "repositorio.json";

export type FinalManifest = {
  repository: string | null;
  /** Stored file name → the deliverable it fills. */
  files: Record<string, FinalFileDeliverableKey>;
};

export const EMPTY_FINAL_MANIFEST = (): FinalManifest => ({
  repository: null,
  files: {},
});

/**
 * Name shown to people for a FINAL file. Records carry their slot folder
 * (`{slot}/{file}`), or for older uploads the whole object path
 * (`FINAL/{team}/{file}`); the UI only shows `{file}`, like any other delivery.
 */
export function finalDisplayName(name: string): string {
  return name.slice(name.lastIndexOf("/") + 1) || name;
}

/** Parse a stored repositorio.json, tolerating a missing or malformed file. */
export function parseFinalRepository(text: string | null | undefined): string | null {
  if (!text) return null;
  try {
    const raw = JSON.parse(text) as Partial<{ repository: unknown }>;
    return typeof raw.repository === "string" && raw.repository.length > 0
      ? raw.repository
      : null;
  } catch {
    return null;
  }
}

/** Parse a stored manifest, tolerating a missing or malformed file. */
export function parseFinalManifest(text: string | null | undefined): FinalManifest {
  const manifest = EMPTY_FINAL_MANIFEST();
  if (!text) return manifest;
  try {
    const raw = JSON.parse(text) as Partial<{
      repository: unknown;
      files: unknown;
    }>;
    if (typeof raw.repository === "string" && raw.repository.length > 0) {
      manifest.repository = raw.repository;
    }
    if (raw.files && typeof raw.files === "object") {
      for (const [name, key] of Object.entries(raw.files)) {
        if ((FINAL_FILE_DELIVERABLE_KEYS as string[]).includes(key as string)) {
          manifest.files[name] = key as FinalFileDeliverableKey;
        }
      }
    }
  } catch {
    // A corrupt manifest just means no slot is filled yet.
  }
  return manifest;
}
