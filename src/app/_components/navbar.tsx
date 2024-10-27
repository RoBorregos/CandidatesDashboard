import SignInButton from "./SignInButton";
import { getServerAuthSession } from "rbrgs/server/auth";
import NavButtons from "./navButtons";
import NavImage from "./navImage";

export default async function Navbar() {
  const session = await getServerAuthSession();

  return (
    <nav className="fixed top-0 z-50 grid h-[5rem] w-screen grid-cols-3 items-center bg-black px-[3rem] font-archivo">
      <NavImage />
      <NavButtons />
      <SignInButton session={session} />
    </nav>
  );
}
