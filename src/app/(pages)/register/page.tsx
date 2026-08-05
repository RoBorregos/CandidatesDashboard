import { type Metadata } from "next";

import Header from "~/app/_components/header";
import RegistrationForm from "~/app/_components/registration-form";
import Footer from "~/app/_components/footer";
import {
  MAX_TEAM_MEMBERS,
  MIN_TEAM_MEMBERS,
  TRACKS,
} from "~/lib/registration";

export const metadata: Metadata = {
  title: "Registro | Candidates 2026",
  description:
    "Regístrate a Candidates 2026, la competencia de robótica de RoBorregos.",
};

export default function RegisterPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="pt-16 lg:pt-0">
        <Header title="REGISTRO" subtitle="Candidates 2026" />
      </div>

      <div className="mx-auto max-w-3xl px-[5vw] text-center font-archivo lg:px-4">
        <span className="text-[1.5rem] font-bold lg:text-[2rem]">
          Antes de{" "}
        </span>
        <span className="font-jersey_25 text-[3rem] text-roboblue lg:text-[4rem]">
          empezar
        </span>
      </div>

      <div className="container mx-auto max-w-3xl space-y-6 p-4 font-archivo">
        <div className="grid gap-4 sm:grid-cols-2">
          {TRACKS.map((track) => (
            <div
              key={track.value}
              className="rounded-xl border border-roboblue/30 bg-gradient-to-tr from-neutral-950 to-neutral-800 p-5"
            >
              <h3 className="font-anton text-xl tracking-wide text-roboblue">
                {track.label}
              </h3>
              <p className="mt-2 text-sm text-neutral-300">
                {track.description}
              </p>
              <p className="mt-3 font-anton tracking-wide text-white">
                {track.value === "BEGINNER"
                  ? `Equipos de ${MIN_TEAM_MEMBERS} o ${MAX_TEAM_MEMBERS}`
                  : "Registro individual"}
              </p>
            </div>
          ))}
        </div>

        <ul className="grid gap-4 sm:grid-cols-3">
          {[
            `Los equipos de principiantes son de ${MIN_TEAM_MEMBERS} o ${MAX_TEAM_MEMBERS} integrantes. Si todavía no tienes equipo, regístrate solo y nosotros te asignamos uno.`,
            "Usa tu correo institucional. Un mismo correo solo puede aparecer en un registro.",
            "Solo una persona por equipo llena el formulario, con los datos de todos los integrantes.",
          ].map((text, index) => (
            <li
              key={index}
              className="rounded-xl bg-gradient-to-tr from-neutral-950 to-neutral-800 p-4 text-sm text-neutral-300"
            >
              <span className="mb-2 block font-jersey_25 text-2xl leading-none text-roboblue">
                0{index + 1}
              </span>
              {text}
            </li>
          ))}
        </ul>

        <RegistrationForm />
      </div>

      <Footer />
    </main>
  );
}
