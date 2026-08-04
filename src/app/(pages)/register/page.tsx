import { type Metadata } from "next";

import Header from "~/app/_components/header";
import RegistrationForm from "~/app/_components/registration-form";
import Footer from "~/app/_components/footer";
import { MIN_TEAM_MEMBERS } from "~/lib/registration";

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

      <div className="container mx-auto max-w-3xl space-y-6 p-4 font-archivo">
        <div className="rounded-lg bg-gray-800 p-6">
          <h2 className="text-xl font-semibold">Antes de empezar</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-gray-300">
            <li>
              Los equipos son de {MIN_TEAM_MEMBERS} o 4 integrantes. Si todavía
              no tienes equipo, regístrate solo y nosotros te asignamos uno.
            </li>
            <li>
              Usa tu correo institucional. Un mismo correo solo puede aparecer en
              un registro.
            </li>
            <li>
              Solo una persona por equipo debe llenar el formulario, con los
              datos de todos los integrantes.
            </li>
          </ul>
        </div>

        <RegistrationForm />
      </div>

      <Footer />
    </main>
  );
}
