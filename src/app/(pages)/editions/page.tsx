import React from "react";
import Footer from "../../_components/footer";
import Header from "../../_components/header";
import Image from "next/image";

import scoreboardData from "../../../data/PastEditions.json";

type Edition = {
  year: number;
  winner: string;
  imageUrl: string;
};

const pastEditions: Edition[] = [
  {
    year: 2024,
    winner: "Foreños",
    imageUrl: "/images/forexos.jpg",
  },
];

export default function HistoryPage() {
  return (
    <main className="bg-black text-white">
      {/* HERO SECTION */}
      <section className="relative flex min-h-[60vh] flex-col items-center justify-center overflow-hidden text-center">
        <Header title="PAST EDITIONS" />
        <p className="mt-[-2vw] font-anton text-[6vw] text-white lg:text-[3vw]">
          A Legacy of Innovation
        </p>
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black via-black to-transparent" />
        <Image
          src="/images/fronPic.jpg"
          alt="Archive background"
          layout="fill"
          objectFit="cover"
          className="-z-20 opacity-20"
        />
      </section>

      {/* CONTENT SECTION */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        {/* GRID DE EDICIONES ANTERIORES */}
        <div className="flex flex-wrap justify-center gap-8">
          {/* We map over the data array to create a card for each edition */}
          {pastEditions.map((edition) => (
            <div
              key={edition.year}
              className="group w-full max-w-sm overflow-hidden rounded-lg bg-gray-900 shadow-lg transition-transform duration-300 hover:scale-105 md:w-1/2 lg:w-1/3"
            >
              <div className="relative h-56 w-full">
                <Image
                  src={edition.imageUrl}
                  alt={`Competition of ${edition.year}`}
                  layout="fill"
                  objectFit="cover"
                  className="transition-opacity duration-300 group-hover:opacity-80"
                />
              </div>
              <div className="p-6">
                <h2 className="font-jersey_25 text-5xl text-roboblue">
                  {edition.year}
                </h2>
                <p className="mt-2 font-anton text-2xl text-white">
                  Winner: {edition.winner}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <h3 className="mb-4 font-jersey_25 text-4xl text-roboblue">
            Scoreboard 2024
          </h3>
          
          <div className="space-y-4 md:hidden">
            {scoreboardData.map((team, index) => (
              <div key={team.nombreEquipo} className="rounded-lg bg-gray-800 p-4 border border-gray-700">
                <div className="flex justify-between items-center mb-4">
                  <span className="font-bold text-gray-400">#{index + 1}</span>
                  <h3 className="font-anton text-2xl text-white">{team.nombreEquipo}</h3>
                  <span className="font-bold text-2xl text-roboblue">{team.puntajeFinal}</span>
                </div>
                <div className="flex justify-around text-center border-t border-gray-600 pt-2">
                  <div><p className="text-xs uppercase text-gray-400">Pista A</p><p className="text-lg font-semibold">{team.puntajePistaA}</p></div>
                  <div><p className="text-xs uppercase text-gray-400">Pista B</p><p className="text-lg font-semibold">{team.puntajePistaB}</p></div>
                  <div><p className="text-xs uppercase text-gray-400">Pista C</p><p className="text-lg font-semibold">{team.puntajePistaC}</p></div>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden md:block overflow-x-auto rounded-lg border border-gray-700">
            <table className="w-full text-left">
              <thead className="bg-gray-800 text-sm uppercase tracking-wider text-roboblue">
                <tr>
                  <th scope="col" className="p-4 text-center font-anton">#</th>
                  <th scope="col" className="p-4 font-anton">Equipo</th>
                  <th scope="col" className="p-4 text-center font-anton">Pista A</th>
                  <th scope="col" className="p-4 text-center font-anton">Pista B</th>
                  <th scope="col" className="p-4 text-center font-anton">Pista C</th>
                  <th scope="col" className="p-4 text-center font-anton">Puntaje Final</th>
                </tr>
              </thead>
              <tbody>
                {scoreboardData.map((team, index) => (
                  <tr key={team.nombreEquipo} className="border-b border-gray-700 transition-colors hover:bg-gray-800/50">
                    <td className="p-4 text-center font-bold text-gray-400">{index + 1}</td>
                    <td className="p-4 font-anton text-xl font-bold text-white">{team.nombreEquipo}</td>
                    <td className="p-4 text-center text-lg text-gray-300">{team.puntajePistaA}</td>
                    <td className="p-4 text-center text-lg text-gray-300">{team.puntajePistaB}</td>
                    <td className="p-4 text-center text-lg text-gray-300">{team.puntajePistaC}</td>
                    <td className="p-4 text-center text-xl font-bold text-roboblue">{team.puntajeFinal}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}