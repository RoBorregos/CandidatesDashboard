import React from "react";
import Footer from "../../_components/footer";
import Header from "../../_components/header";
import Title from "../../_components/title";
import { api } from "~/trpc/react";
import { Round } from "../../../lib/round";
import RandomText from "../../_components/random-text";
import Image from "next/image";


type Edition = {
  year: number;
  winner: string;
  imageUrl: string;
};

const pastEditions: Edition[] = [
{
  year: 2024,
  winner: "Foreños",
  imageUrl: "/images/forexos.jpg", // Example path, replace with your actual images
},
{
  year: 2023,
  winner: "--------",
  imageUrl: "/images/fronPic.jpg", // Example path, replace with your actual images
},
];

export default function HistoryPage() {
  return (
    <main className="bg-black text-white">
      {/* HERO SECTION: Title of the page */}
      <section className="relative flex min-h-[60vh] flex-col items-center justify-center overflow-hidden text-center">
        <h1 className="font-jersey_25 text-[15vw] leading-none text-roboblue lg:text-[10vw]">
          PAST EDITIONS
        </h1>
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

      {/* GRID SECTION: Displays the list of past editions */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {/* We map over the data array to create a card for each edition */}
          {pastEditions.map((edition) => (
            <div
              key={edition.year} // The 'key' must be unique for each item
              className="group overflow-hidden rounded-lg bg-gray-900 shadow-lg transition-transform duration-300 hover:scale-105"
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
                {/* <p className="mt-1 text-lg text-gray-400">
                  Winner: {edition.winner}
                </p> */}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-12 text-center">
          {/* Lista de candidates del año pasado */}
          
          {/* Example candidates data */}
          {[
            {
              year: 2024,
              candidates: [
                { name: "Foreños", score: 95 },
                { name: "-----", score: 88 },
                { name: "-----", score: 80 },
              ],
            },
            {
              year: 2023,
              candidates: [
                { name: "------", score: 92 },
                { name: "---", score: 85 },
                { name: "----", score: 78 },
              ],
            },
          ].map((edition) => (
            <div key={edition.year} className="mb-8">
              <h3 className="font-jersey_25 text-3xl text-roboblue mb-2">
                Candidates {edition.year}
              </h3>
              <ul className="mx-auto max-w-md text-left">
                {edition.candidates.map((candidate) => (
                  <li
                    key={candidate.name}
                    className="flex justify-between py-2 border-b border-gray-700"
                  >
                    <span className="font-anton text-xl">{candidate.name}</span>
                    <span className="text-roboblue font-bold">{candidate.score}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          
        </div>

        {/* Lista de equipos con cada 4 miembros */}
        <div className="mt-16">
          <h3 className="font-jersey_25 text-3xl text-roboblue mb-4 text-center">
            Teams & Members
          </h3>
          {/* Example teams data */}
          {[
            {
              team: "Foreños",
              members: ["Ana", "Luis", "Carlos", "María", "Pedro", "Sofía", "Juan", "Lucía"],
            },
            {
              team: "------",
              members: ["Miguel", "Elena", "Raúl", "Valeria", "Andrés", "Paola"],
            },
            {
              team: "-----",
              members: ["Jorge", "Camila", "Roberto", "Fernanda"],
            },
          ].map(({ team, members }) => (
            <div key={team} className="mb-8">
              <h4 className="font-anton text-2xl text-white mb-2">{team}</h4>
              <ul className="mx-auto max-w-md text-left">
                {Array.from({ length: Math.ceil(members.length / 4) }).map((_, idx) => (
                  <li key={idx} className="py-2 border-b border-gray-700 flex flex-wrap gap-4">
                    {members.slice(idx * 4, idx * 4 + 4).map((member) => (
                      <span key={member} className="font-anton text-lg text-roboblue">
                        {member}
                      </span>
                    ))}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>


  



      <Footer />
    </main>
  );
}