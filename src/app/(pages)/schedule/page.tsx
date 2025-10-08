import { api } from "rbrgs/trpc/server";
import Header from "../../_components/header";
import Footer from "../../_components/footer";
import PublicScheduleDisplay from "rbrgs/app/_components/public-schedule-display";

export default async function PublicSchedulePage() {
  const teams = await api.team.getPublicSchedule();

  return (
    <div className="mt-[4rem] min-h-screen bg-black text-sm text-white md:text-base">
      <div className="md:pb-20">
        <Header
          title="Horarios de Equipos"
          subtitle="Horarios de Competencia para Todos los Equipos"
        />
      </div>

      <div className="px-4 pb-20 pt-10 md:px-20">
        <div className="mb-8">
          <h1 className="text-xl font-semibold">
            <span className="pr-1 font-normal text-gray-200">&#60; </span>
            Horarios de Competencia
            <span className="pl-1 font-normal text-gray-200">/&#62;</span>
          </h1>
          <div className="mt-4 text-gray-300">
            Aquí puedes encontrar los horarios de todas las rondas de los
            equipos.
            <br />
            Asegúrate de llegar a tiempo a tu horario asignado.
          </div>
        </div>

        <PublicScheduleDisplay teams={teams} />
      </div>

      <Footer />
    </div>
  );
}
