import type { FinalDeliverableKey } from "~/lib/final-deliverables";

/**
 * Symbol for each FINAL deliverable, so a team can tell at a glance what goes
 * in every slot: a dimensioned 3D part (CAD), a circuit (schematic), a git
 * branch graph (repository) and a ring-bound notebook (logbook).
 */
export default function FinalDeliverableIcon({
  deliverable,
  className = "h-10 w-10",
}: {
  deliverable: FinalDeliverableKey;
  className?: string;
}) {
  const common = {
    viewBox: "0 0 48 48",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    "aria-hidden": true,
  };

  switch (deliverable) {
    case "CAD":
      return (
        <svg {...common}>
          {/* Isometric block */}
          <path d="M24 8 38 16v16L24 40 10 32V16Z" />
          <path d="M10 16l14 8 14-8M24 24v16" />
          {/* Bore on the top face */}
          <ellipse cx="24" cy="16" rx="4" ry="2.2" />
          {/* Dimension line along the left edge */}
          <path d="M5 19v15M3.5 19h3M3.5 34h3" strokeWidth={1.5} />
        </svg>
      );
    case "SCHEMATIC":
      return (
        <svg {...common}>
          {/* Battery */}
          <path d="M8 20v8M12 22v4" />
          {/* Wires */}
          <path d="M8 24H4v-14h12M12 24h4M4 24v14h40V24h-4" />
          {/* Resistor */}
          <path d="M16 10l2-3 3 6 3-6 3 6 3-6 2 3h12v8" />
          {/* LED */}
          <path d="M16 24l8-5v10l-8-5ZM24 19v10M24 24h16M27 16l3-3M31 18l3-3" />
          {/* Junctions */}
          <circle cx="44" cy="24" r="1.2" fill="currentColor" />
          <circle cx="4" cy="24" r="1.2" fill="currentColor" />
        </svg>
      );
    case "REPOSITORY":
      return (
        <svg {...common}>
          {/* main branch */}
          <path d="M14 8v32" />
          <circle cx="14" cy="10" r="3" fill="currentColor" />
          <circle cx="14" cy="38" r="3" fill="currentColor" />
          {/* feature branch merged back */}
          <path d="M14 18c0 6 20 2 20 10v0c0 6-20 4-20 10" />
          <circle cx="34" cy="26" r="3" fill="currentColor" />
          {/* code brackets */}
          <path d="M38 8l-4 4 4 4M42 8l4 4-4 4" strokeWidth={1.5} />
        </svg>
      );
    case "LOGBOOK":
      return (
        <svg {...common}>
          {/* Cover */}
          <rect x="12" y="6" width="28" height="36" rx="2" />
          {/* Rings */}
          <path d="M8 12h8M8 20h8M8 28h8M8 36h8" />
          {/* Written lines */}
          <path d="M20 14h14M20 20h14M20 26h10" strokeWidth={1.5} />
          {/* Team: several people sign the same book */}
          <circle cx="24" cy="34" r="2" />
          <circle cx="31" cy="34" r="2" />
        </svg>
      );
  }
}
