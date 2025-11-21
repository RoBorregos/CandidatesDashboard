import React from "react";
import Footer from "../../_components/footer";
import Header from "../../_components/header";
import Image from "next/image";
import ScoreboardTable from "../../_components/ScoreboardTable";
import PastEditionsWinners from "../../_components/PastEditionWinners";

type Edition = {
  year: number;
  winner: string;
  imageUrl: string;
};

export default function HistoryPage() {
  return (
    <main className="bg-black text-white">
      {/* HERO SECTION */}
      <section className="relative flex min-h-[60vh] flex-col items-center justify-center overflow-hidden">
        <Header title="Past Editions" />
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
        <div>
          <PastEditionsWinners />
        </div>

        <div className="mt-12 text-center">
          <ScoreboardTable year={"LARC 2025"} />
          <ScoreboardTable year={2025} />
          <ScoreboardTable year={2024} />
        </div>
      </section>

      <Footer />
    </main>
  );
}
