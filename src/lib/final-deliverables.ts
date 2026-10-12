/*
 * The FINAL submission is not a free-form folder like weeks 2-6: every team
 * hands in exactly these four deliverables. Each file is stored under its
 * slot's subfolder, `FINAL/{team}/{slot}/{file}`, so the path alone says which
 * slot it fills. The repository link (which is not a file at all) lives in
 * FINAL_REPOSITORY_FILE.
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
 * Slot manifest older FINAL folders may still hold. Slots now come from the
 * `{slot}/` folder, so it is never read or written — only kept out of
 * listings and size totals.
 */
export const LEGACY_FINAL_MANIFEST_FILE = "ENTREGAS.json";

/**
 * Internal file in `FINAL/{team}/` holding the repository link:
 * `{ "repository": "https://github.com/…" }`. Like COMMENTS.md it is managed
 * server-side only and hidden from listings.
 */
export const FINAL_REPOSITORY_FILE = "repositorio.json";

/**
 * Name shown to people for a FINAL file. Records carry their slot folder
 * (`{slot}/{file}`), or for older uploads the whole object path
 * (`FINAL/{team}/{file}`); the UI only shows `{file}`, like any other delivery.
 */
export function finalDisplayName(name: string): string {
  return name.slice(name.lastIndexOf("/") + 1) || name;
}

/** The slot a stored FINAL file (`{slot}/{file}`) fills, from its folder. */
export function finalSlotOf(name: string): FinalFileDeliverableKey | undefined {
  const folder = name.slice(0, name.indexOf("/"));
  return (FINAL_FILE_DELIVERABLE_KEYS as string[]).includes(folder)
    ? (folder as FinalFileDeliverableKey)
    : undefined;
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
