import Image from "next/image";
import { HydrateClient } from "rbrgs/trpc/server";
import teamPic from "../../public/images/fronPic.jpg";
import Acuity from "../../public/images/sponsors/Acuity.png";
import Dipole from "../../public/images/sponsors/Dipole.png";
import Dram from "../../public/images/sponsors/Dram.png";
import Mitutoyo from "../../public/images/sponsors/Mitutoyo.png";
import robologo from "../../public/images/white-logo.png";
import Navbar from "rbrgs/app/_components/navbar";
import Footer from "rbrgs/app/_components/footer";

export default async function Home() {
  return (
    <HydrateClient>
      <main>
        <Navbar />

        <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden">
          <div className="z-10 text-center">
            <h1 className="font-jersey_25 text-[12vw] leading-none text-roboblue">
              CANDIDATES
            </h1>
            <p className="mt-[-2vw] font-anton text-[3vw] text-white">
              By RoBorregos
            </p>
          </div>
          <div className="absolute left-1/2 top-1/2 -z-10 -translate-x-1/2 -translate-y-1/2 transform">
            <Image
              src={robologo}
              alt=""
              className="w-[40vw] max-w-[40rem] opacity-50"
            />
          </div>
          <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black to-transparent" />
          <Image
            src={teamPic}
            alt=""
            layout="fill"
            objectFit="cover"
            className="-z-20 opacity-30"
          />
        </section>

        <p className="mx-[10rem] text-center font-archivo text-[1.5rem] text-white">
          This year, the rounds are divided into 3 different{" "}
          <span className="font-jersey_25 text-[4rem] text-roboblue">
            challenges.
          </span>
          <br />
          <br />
          Contrary to other years where these were all connected in a single
          game field, teams will only have one opportunity to demonstrate their
          work in each of them.
        </p>

        <section className="mx-[5rem] mt-[10rem] grid grid-cols-3 gap-[5rem] text-[1.25rem]">
          <div className="relative rounded-xl bg-gradient-to-tr from-neutral-950 to-neutral-800">
            <div className="group relative">
              <Image
                src={teamPic}
                alt=""
                className={`ml-5 mt-5 h-[15rem] w-full rounded-xl object-cover blur-[0.1rem] transition duration-300 ease-in-out group-hover:blur-none`}
              />
              <div className="absolute left-5 top-0 h-[15rem] w-full content-center text-center font-anton text-[5rem] text-white transition duration-300 group-hover:opacity-0">
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
                src={teamPic}
                alt=""
                className={`ml-5 mt-5 h-[15rem] w-full rounded-xl object-cover blur-[0.1rem] transition duration-300 ease-in-out group-hover:blur-none`}
              />
              <div className="absolute left-5 top-0 h-[15rem] w-full content-center text-center font-anton text-[5rem] text-white transition duration-300 group-hover:opacity-0">
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
                src={teamPic}
                alt=""
                className={`ml-5 mt-5 h-[15rem] w-full rounded-xl object-cover blur-[0.1rem] transition duration-300 ease-in-out group-hover:blur-none`}
              />
              <div className="absolute left-5 top-0 h-[15rem] w-full content-center text-center font-anton text-[5rem] text-white transition duration-300 group-hover:opacity-0">
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

        <h2 className="mt-[10rem] text-center font-jersey_25 text-[4rem] text-roboblue">
          Sponsors
        </h2>
        <section className="mt-[3rem] bg-white">
          <div className="mx-[5rem] grid grid-cols-4 gap-[5rem]">
            <Image src={Acuity} alt="" />
            <Image src={Dipole} alt="" />
            <Image src={Dram} alt="" />
            <Image src={Mitutoyo} alt="" />
          </div>
        </section>

        <Footer />
      </main>
    </HydrateClient>
  );
}
