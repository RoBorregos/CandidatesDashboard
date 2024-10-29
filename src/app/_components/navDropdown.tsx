import { DropdownMenuContent } from "@radix-ui/react-dropdown-menu";
import Image from "next/image";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "r/components/ui/dropdown";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "r/components/ui/navigation-menu";
import menu from "rbrgs/../public/images/menu.svg";
import SignInButton from "./SignInButton";
import { Session } from "next-auth";

export default function NavDropdown({ session }: { session: Session | null }) {
  return (
    <div className="block justify-self-end lg:hidden">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Image src={menu} alt="" className="flex h-5 w-5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent className="mt-3 w-fit rounded-xl border border-white bg-black text-white">
          <DropdownMenuItem>
            <Link href="/scoreboard" className="w-full text-center text-lg">
              Scoreboard
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Link href="/dashboard" className="w-full text-center text-lg">
              Dashboard
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Link href="/documents" className="w-full text-center text-lg">
              Documents
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Link href="/team" className="w-full text-center text-lg">
              Team
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <SignInButton session={session} />
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
