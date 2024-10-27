import Image from "next/image";
import robologo from "../../../public/images/white-logo.png";
import SignInButton from "./SignInButton";
import { getServerAuthSession } from "rbrgs/server/auth";

export default async function Navbar() {
  const session = await getServerAuthSession();
  return (
    <nav className="fixed top-0 z-50 grid h-[3rem] w-screen grid-cols-3 items-center bg-black px-[3rem] font-archivo">
      <Image
        src={robologo}
        alt="Logo"
        className="h-[2rem] w-fit cursor-pointer object-contain"
      />
      <div className="flex h-full items-center justify-evenly text-white">
        <p className="cursor-pointer">Scoreboard</p>
        <p className="cursor-pointer">Dashboard</p>
        <p className="cursor-pointer">Documents</p>
      </div>
      <SignInButton session={session} />
    </nav>
  );
}
