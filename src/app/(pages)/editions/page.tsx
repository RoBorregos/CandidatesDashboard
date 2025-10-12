import React from "react";
import Footer from "../../_components/footer";
import Header from "../../_components/header";
import Image from "next/image";
import ScoreboardTable from "../../_components/ScoreboardTable";


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
      <section className="relative flex min-h-[60vh] flex-col items-center justify-center overflow-hidden">
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
        <div className="flex flex-wrap justify-center gap-8">
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
         <ScoreboardTable year={2024} />
         
        </div>
      </section>

      <Footer />
    </main>
  );
}