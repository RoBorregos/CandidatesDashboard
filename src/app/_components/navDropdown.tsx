import { DropdownMenuContent } from "@radix-ui/react-dropdown-menu";
import Image from "next/image";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "r/components/ui/dropdown";
import menu from "rbrgs/../public/images/menu.svg";
import SignInButton from "./SignInButton";
import { Session } from "next-auth";
import { StaticImport } from "next/dist/shared/lib/get-img-props";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "r/components/ui/sheet";
import { Role } from "@prisma/client";

export default function NavDropdown({ session }: { session: Session | null }) {
  return (
    <div className="block justify-self-end lg:hidden">
      <Sheet>
        <SheetTrigger asChild>
          <Image src={menu as StaticImport} alt="" className="flex h-5 w-5" />
        </SheetTrigger>
        <SheetContent
          className="flex w-screen flex-col items-center justify-center bg-black text-white"
          side={"top"}
        >
          <div>
            <Link href="/" className="w-full text-center text-lg">
              Home
            </Link>
          </div>
          <div>
            <Link href="/scoreboard" className="w-full text-center text-lg">
              Scoreboard
            </Link>
          </div>
          <div>
            <Link href="/schedule" className="w-full text-center text-lg">
              Schedule
            </Link>
          </div>
          <div>
            <Link href="/team" className="w-full text-center text-lg">
              Team
            </Link>
          </div>
          {(session?.user.role === Role.ADMIN ||
            session?.user.role === Role.JUDGE) && (
            <div>
              <Link href="/judge" className="w-full text-center text-lg">
                Judge
              </Link>
            </div>
          )}
          {session?.user.role === Role.ADMIN && (
            <div>
              <Link href="/admin" className="w-full text-center text-lg">
                Admin
              </Link>
            </div>
          )}
          <div>
            <Link
              href="https://www.roborregos.com"
              className="w-full text-center text-lg"
            >
              About Us
            </Link>
          </div>
          <div>
            <div className="w-fit">
              <SignInButton session={session} />
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
