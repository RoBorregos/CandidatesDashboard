import SignInButton from "./SignInButton";
import { getServerAuthSession } from "rbrgs/server/auth";
import NavButtons from "./navButtons";
import NavImage from "./navImage";
import NavDropdown from "./navDropdown";

export default async function Navbar() {
  const session = await getServerAuthSession();

  return (
    <nav className="fixed top-0 z-50 grid h-[5rem] w-screen grid-cols-2 items-center bg-black px-[3rem] font-archivo lg:grid-cols-3">
      <NavImage />
      <NavButtons />
      <div className="hidden lg:block">
        <SignInButton session={session} />
      </div>
      <NavDropdown />
    </nav>
  );
}
