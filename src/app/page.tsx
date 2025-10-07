import Image from "next/image";
import { HydrateClient } from "rbrgs/trpc/server";
import capitalOne from "../../public/images/sponsors/CapitalOne.png";
import stanser from "../../public/images/sponsors/Stanser.png";
import robologo from "../../public/images/white-logo.png";
import ball from "../../public/images/ball.jpeg";
import maze from "../../public/images/maze.jpeg";
import line from "../../public/images/line.jpeg";
import Footer from "./_components/footer";
import EventTimeline from "./_components/timeline";
import ImageFade from "./_components/imageFade";

export default async function Home() {
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

        <div className="mx-[10vw] text-center font-archivo text-[1rem] text-white lg:mx-[10rem] lg:text-[1.5rem]">
          This year, the rounds are divided into 3 different{" "}
          <span className="font-jersey_25 text-[4rem] text-roboblue">
            challenges.
          </span>
          <div className="mt-[10vw] lg:mx-[10vw] lg:mt-[1vw]">
            Contrary to other years where these were all connected in a single
            game field, teams will only have one opportunity to demonstrate
            their work in each of them.
          </div>
        </div>

        <section className="mx-[5vw] mt-[5rem] grid gap-[5rem] text-[1.25rem] lg:mx-[5rem] lg:mt-[10rem] lg:grid-cols-3">
          <div className="relative rounded-xl bg-gradient-to-tr from-neutral-950 to-neutral-800">
            <div className="group relative">
              <Image
                src={maze}
                alt=""
                className={`h-[15rem] w-full rounded-xl object-cover blur-[0.1rem] transition duration-300 ease-in-out group-hover:blur-none lg:ml-5 lg:mt-5`}
              />
              <div className="absolute top-0 h-[15rem] w-full content-center text-center font-anton text-[5rem] text-white transition duration-300 group-hover:opacity-0 lg:left-5">
                MAZE
              </div>
            </div>
            <p className="m-[1rem] text-justify font-archivo text-white">
              We have the traditional Maze section where robots visit all tiles
              in a maze while detecting the colors on the ground to make points.
              The next step is finding the exit. Finally, if the team wishes to
              go for the bonus points, the robot must go back to a tile with the
              color that repeats exactly 5 times in the maze.
            </p>
          </div>

          <div className="rounded-xl bg-gradient-to-tr from-neutral-950 to-neutral-800">
            <div className="group relative">
              <Image
                src={line}
                alt=""
                className={`h-[15rem] w-full rounded-xl object-cover blur-[0.1rem] transition duration-300 ease-in-out group-hover:blur-none lg:ml-5 lg:mt-5`}
              />
              <div className="absolute top-0 h-[15rem] w-full content-center text-center font-anton text-[5rem] text-white transition duration-300 group-hover:opacity-0 lg:left-5">
                LINE
              </div>
            </div>
            <p className="m-[1rem] text-justify font-archivo text-white">
              The classical line follower is back with a twist! Candidates can
              choose their own difficulty by selecting the modules with the
              lines they’ll have to follow. Then, RoBorregos staff will place
              them on the field randomly right before the round begins.
            </p>
          </div>
          <div className="rounded-xl bg-gradient-to-tr from-neutral-950 to-neutral-800">
            <div className="group relative">
              <Image
                src={ball}
                alt=""
                className={`h-[15rem] w-full rounded-xl object-cover blur-[0.1rem] transition duration-300 ease-in-out group-hover:blur-none lg:ml-5 lg:mt-5`}
              />
              <div className="absolute top-0 h-[15rem] w-full content-center text-center font-anton text-[5rem] text-white transition duration-300 group-hover:opacity-0 lg:left-5">
                BALL
              </div>
            </div>
            <p className="m-[1rem] text-justify font-archivo text-white">
              Can you find the ball? In this challenge, robots will have to find
              access to the ball located in the center and retrieve it to the
              end in a controlled manner, but be careful! There are black lines
              on the ground which your robot must not cross.
            </p>
          </div>
        </section>

        <EventTimeline />

        <h2 className="mt-[5rem] text-center font-jersey_25 text-[4rem] text-roboblue lg:mt-[10rem]">
          Sponsors
        </h2>
        <section className="mt-[3rem] bg-white">
          <div className="mx-[5vw] grid grid-cols-1 gap-5 py-10 lg:mx-[5rem] lg:grid-cols-2">
            <div className="flex items-center justify-center">
              <Image
                src={capitalOne}
                alt="Capital One"
                className="h-auto w-full max-w-[400px] object-contain"
              />
            </div>
            <div className="flex items-center justify-center">
              <Image
                src={stanser}
                alt="Stanser"
                className="h-auto w-full max-w-[400px] object-contain"
              />
            </div>
          </div>
        </section>

        <Footer />
      </main>
    </HydrateClient>
  );
}
