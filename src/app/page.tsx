import Image from "next/image";
import { HydrateClient } from "~/trpc/server";
import teamPic from "../../public/images/fronPic.jpg";
import Acuity from "../../public/images/sponsors/Acuity.png"
import Dipole from "../../public/images/sponsors/Dipole.png"
import Dram from "../../public/images/sponsors/Dram.png"
import Mitutoyo from "../../public/images/sponsors/Mitutoyo.png"
import robologo from "../../public/images/white-logo.png";
import Navbar from "./_components/navbar";
import Footer from "./_components/footer";

export default async function Home() {
  return (
    <HydrateClient>
      <main>
        <Navbar />
        
        <section className="relative flex flex-col justify-center items-center min-h-screen overflow-hidden">
          <div className="z-10 text-center">
            <h1 className="font-jersey_25 text-roboblue text-[12vw] leading-none">CANDIDATES</h1>
            <p className="font-anton text-white text-[3vw] mt-[-2vw]">By RoBorregos</p>
          </div>
          <div className="absolute top-1/2 left-1/2 transform -translate-y-1/2 -translate-x-1/2 -z-10">
            <Image src={robologo} alt="" className="w-[40vw] max-w-[40rem] opacity-50" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent -z-10" />
          <Image
            src={teamPic}
            alt=""
            layout="fill"
            objectFit="cover"
            className="opacity-30 -z-20"
          />
        </section>
        
        <p className="text-white text-[1.5rem] text-center mx-[10rem] font-archivo">This year, the rounds are divided into 3 different <span className="text-roboblue text-[4rem] font-jersey_25">challenges.</span><br /><br />
        Contrary to other years where these were all connected in a single game field, teams will only have one opportunity to demonstrate their work in each of them.</p>

        <section className="grid grid-cols-3 gap-[5rem] mx-[5rem] mt-[10rem] text-[1.25rem]">
          <div className="rounded-xl bg-gradient-to-tr from-neutral-950 to-neutral-800 relative">
            <div className="relative group">
              <Image src={teamPic} alt="" className={`w-full h-[15rem] object-cover rounded-xl mt-5 ml-5 blur-[0.1rem] group-hover:blur-none transition duration-300 ease-in-out`} />
              <div className="absolute top-0 left-5 text-white w-full h-[15rem] content-center text-center font-anton text-[5rem] group-hover:opacity-0 transition duration-300">MAZE</div>
            </div>
            <p className="text-white m-[1rem] font-archivo text-justify">We have the traditional Maze section where robots visit all tiles in a maze while detecting the colors on the ground to make points. The next step is finding the exit. Finally, if the team wishes to go for the bonus points, the robot must go back to a tile with the color that repeats exactly 5 times in the maze.</p>
          </div>
          <div className="rounded-xl bg-gradient-to-tr from-neutral-950 to-neutral-800">
            <div className="relative group">
              <Image src={teamPic} alt="" className={`w-full h-[15rem] object-cover rounded-xl mt-5 ml-5 blur-[0.1rem] group-hover:blur-none transition duration-300 ease-in-out`} />
              <div className="absolute top-0 left-5 text-white w-full h-[15rem] content-center text-center font-anton text-[5rem] group-hover:opacity-0 transition duration-300">LINE</div>
            </div>
            <p className="text-white m-[1rem] font-archivo text-justify">The classical line follower is back with a twist! Candidates can choose their own difficulty by selecting the modules with the lines they’ll have to follow. Then, RoBorregos staff will place them on the field randomly right before the round begins.</p>
          </div>
          <div className="rounded-xl bg-gradient-to-tr from-neutral-950 to-neutral-800">
            <div className="relative group">
              <Image src={teamPic} alt="" className={`w-full h-[15rem] object-cover rounded-xl mt-5 ml-5 blur-[0.1rem] group-hover:blur-none transition duration-300 ease-in-out`} />
              <div className="absolute top-0 left-5 text-white w-full h-[15rem] content-center text-center font-anton text-[5rem] group-hover:opacity-0 transition duration-300">BALL</div>
            </div>
            <p className="text-white m-[1rem] font-archivo text-justify">Can you find the ball? In this challenge, robots will have to find access to the ball located in the center and retrieve it to the end in a controlled manner, but be careful! There are black lines on the ground which your robot must not cross.</p>
          </div>
        </section>

        <h2 className="mt-[10rem] text-roboblue text-[4rem] font-jersey_25 text-center">Sponsors</h2>
        <section className="mt-[3rem] bg-white">
          <div className="grid grid-cols-4 gap-[5rem] mx-[5rem]">
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
