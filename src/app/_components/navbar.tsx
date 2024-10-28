import Image from "next/image";
import robologo from "../../../public/images/white-logo.png";
import SignInButton from "./SignInButton";
import { getServerAuthSession } from "rbrgs/server/auth";

export default async function Navbar() {
  const session = await getServerAuthSession();
  return (
    <nav className="w-screen h-[3rem] z-50 bg-black fixed top-0 grid grid-cols-3 items-center px-[3rem] font-archivo">
        <Image src={robologo} alt="Logo" className="h-[2rem] w-fit object-contain cursor-pointer" />
        <div className="flex items-center justify-evenly h-full text-white">
            <p className="cursor-pointer">Scoreboard</p>
            <p className="cursor-pointer">Dashboard</p>
            <p className="cursor-pointer">Documents</p>
            <p className="cursor-pointer">Team</p>
        </div>
        <div className="flex justify-end items-center">
          <SignInButton session={session} />
        </div>
    </nav>
  );
}
