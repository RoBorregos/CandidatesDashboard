import React from "react";
import Image from "next/image";
import pastEditionsData from "../../../public/PastEditionsWinners.json";

const PastEditions = () => {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16">
      <div className="flex flex-wrap justify-center gap-8">
        {pastEditionsData.map((edition) => (
          <div
            key={edition.year}
            className="group w-full max-w-sm overflow-hidden rounded-lg bg-gray-900 shadow-lg transition-transform duration-300 hover:scale-105 md:w-1/2 lg:w-1/3"
          >
            <div className="relative h-56 w-full">
              <Image
                src={edition.imageUrl}
                alt={`Competition of ${edition.year}`}
                fill
                className="object-cover transition-opacity duration-300 group-hover:opacity-80"
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
    </section>
  );
};

export default PastEditions;
