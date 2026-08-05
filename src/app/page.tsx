import Image from "next/image";
import Link from "next/link";
import { HydrateClient } from "rbrgs/trpc/server";
import robologo from "../../public/images/white-logo.png";
import acuityBrands from "../../public/images/sponsors/AcuityBrandsLogo.webp";
import digikey from "../../public/images/sponsors/DigiKey.png";
import enerman from "../../public/images/sponsors/EnermanLogo.png";
import vitro from "../../public/images/sponsors/vitro.png";
import ball from "../../public/images/ball.jpg";
import maze from "../../public/images/maze.jpg";
import line from "../../public/images/line.jpg";
import Footer from "./_components/footer";
import EventTimeline from "./_components/timeline";
import ImageFade from "./_components/imageFade";

/**
 * Secciones que se esconden mientras no se anuncian los retos ni el programa
 * de 2026. El contenido sigue aqui: para volver a mostrarlo pon la bandera en
 * true, no hace falta reescribir nada.
 */
const SHOW_CHALLENGES = false;
const SHOW_EVENT_SCHEDULE = false;

export default async function Home() {
  const sponsors = [
    { src: acuityBrands, alt: "Acuity Brands" },
    { src: digikey, alt: "DigiKey" },
    {
      src: enerman,
      alt: "Enerman",
      backdrop: "bg-neutral-900",
      zoom: "scale-150",
    },
    { src: vitro, alt: "Vitro" },
  ];

  return (
    <HydrateClient>
      <main>
        <section className="relative flex min-h-[150vw] flex-col items-center justify-start overflow-hidden lg:min-h-screen lg:justify-center">
          <div className="z-10 mt-[30vw] text-center lg:mt-0">
            <h1 className="font-jersey_25 text-[17vw] leading-none text-roboblue lg:text-[12vw]">
              CANDIDATES
            </h1>
            <p className="mt-[-2vw] font-anton text-[6vw] text-white lg:text-[3vw]">
              By RoBorregos
            </p>
            <Link
              href="/register"
              className="mt-[4vw] inline-block rounded-full bg-roboblue px-[6vw] py-[2vw] font-archivo text-[4vw] font-semibold text-white transition-opacity hover:opacity-90 lg:mt-[1.5vw] lg:px-[3vw] lg:py-[0.8vw] lg:text-[1.5vw]"
            >
              Register
            </Link>
          </div>
          <div className="absolute left-1/2 top-[80vw] -z-10 -translate-x-1/2 -translate-y-1/2 transform lg:top-1/2">
            <Image
              src={robologo}
              alt=""
              className="w-[70vw] object-cover opacity-50 lg:w-[40vw]"
            />
          </div>
          <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black to-transparent" />
          <ImageFade className="-z-20" />
        </section>

        <section className="mx-[10vw] text-center font-archivo text-white lg:mx-[10rem]">
          <div>
            <span className="text-[1.5rem] font-bold lg:text-[2rem]">
              See you soon at the{" "}
            </span>
            <span className="font-jersey_25 text-[3rem] text-roboblue lg:text-[4rem]">
              initial meeting
            </span>
          </div>

          <div className="mx-auto mt-[2rem] max-w-2xl rounded-xl bg-gradient-to-tr from-neutral-950 to-neutral-800 p-8">
            <p className="font-anton text-[2rem] leading-tight text-white lg:text-[2.5rem]">
              August 28
            </p>
            <p className="mt-2 text-[1.1rem] text-neutral-300 lg:text-[1.25rem]">
              7:00 PM · Auditorio de Biblioteca
            </p>
          </div>
        </section>

        {SHOW_CHALLENGES && (
          <div className="mx-[10vw] mt-[5rem] text-center font-archivo text-[1rem] text-white lg:mx-[10rem] lg:text-[1.5rem]">
            <span className="text-[2rem] font-bold">Meet the </span>
            <span className="font-jersey_25 text-[4rem] text-roboblue">
              challenges
            </span>
            <div className="mt-[10vw] lg:mx-[8vw] lg:mt-[1vw]">
              Distributed in three different arenas, teams will have three
              opportunities to demonstrate their skills and creativity in each
              one of them by scoring points in the unique tests.
            </div>
          </div>
        )}

        {SHOW_CHALLENGES && (
          <section className="mx-[5vw] mt-[5rem] grid gap-[5rem] text-[1.25rem] lg:mx-[5rem] lg:mt-[10rem] lg:grid-cols-3">
            <div className="relative rounded-xl bg-gradient-to-tr from-neutral-950 to-neutral-800">
              <div className="group relative">
                <Image
                  src={maze}
                  alt=""
                  className={`h-[15rem] w-full rounded-xl object-cover blur-[0.1rem] transition duration-300 ease-in-out group-hover:blur-none lg:ml-5 lg:mt-5`}
                />
                <div className="absolute top-0 h-[15rem] w-full content-center bg-gradient-to-t from-black to-roboblue bg-clip-text text-center font-anton text-[5rem] text-transparent transition duration-300 group-hover:opacity-0 lg:left-5">
                  MAZE
                </div>
              </div>
              <p className="m-[1rem] text-justify font-archivo text-white">
                Navigate a grid of tiles, detect ground colors, and score as you
                explore the maze. Find the exit to complete the route and win
                bonus points you must return from where you came from.
              </p>
            </div>

            <div className="rounded-xl bg-gradient-to-tr from-neutral-950 to-neutral-800">
              <div className="group relative">
                <Image
                  src={line}
                  alt=""
                  className={`h-[15rem] w-full rounded-xl object-cover blur-[0.1rem] transition duration-300 ease-in-out group-hover:blur-none lg:ml-5 lg:mt-5`}
                />
                <div className="absolute top-0 h-[15rem] w-full content-center bg-gradient-to-t from-black to-roboblue bg-clip-text text-center font-anton text-[5rem] text-transparent transition duration-300 group-hover:opacity-0 lg:left-5">
                  LINE
                </div>
              </div>
              <p className="m-[1rem] text-justify font-archivo text-white">
                The classic line follower returns with a twist. Teams pick their
                difficulty by choosing track modules and taking the riskier path
                to the end if they&apos; re looking to win!
              </p>
            </div>
            <div className="rounded-xl bg-gradient-to-tr from-neutral-950 to-neutral-800">
              <div className="group relative">
                <Image
                  src={ball}
                  alt=""
                  className={`h-[15rem] w-full rounded-xl object-cover blur-[0.1rem] transition duration-300 ease-in-out group-hover:blur-none lg:ml-5 lg:mt-5`}
                />
                <div className="absolute top-0 h-[15rem] w-full content-center bg-gradient-to-t from-black to-roboblue bg-clip-text text-center font-anton text-[5rem] text-transparent transition duration-300 group-hover:opacity-0 lg:left-5">
                  BALL
                </div>
              </div>
              <p className="m-[1rem] text-justify font-archivo text-white">
                Detect flags on the field and follow their instructions to
                locate and interact with the ball. Precision, timing, and
                control are key to maximize your score.
              </p>
            </div>
          </section>
        )}

        {SHOW_EVENT_SCHEDULE && <EventTimeline />}

        <div className="mx-[10vw] mt-10 text-center font-archivo text-[1rem] text-white lg:mx-[10rem] lg:text-[1.5rem]">
          <span className="text-[2rem] font-bold">Thanks to our </span>
          <span className="font-jersey_25 text-[4rem] text-roboblue">
            sponsors
          </span>
        </div>

        <section className="mt-[3rem] grid w-full grid-cols-2 gap-5 bg-white px-[5vw] py-5 lg:grid-cols-4 lg:px-[5rem]">
          {sponsors.map((sponsor) => (
            <div
              key={sponsor.alt}
              className={`flex items-center justify-center overflow-hidden rounded-lg ${
                sponsor.backdrop ?? ""
              }`}
            >
              <Image
                src={sponsor.src}
                alt={sponsor.alt}
                className={`h-[5rem] w-full max-w-[200px] object-contain ${
                  sponsor.zoom ?? ""
                }`}
              />
            </div>
          ))}
        </section>

        <Footer />
      </main>
    </HydrateClient>
  );
}
