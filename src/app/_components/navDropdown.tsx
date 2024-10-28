import Image from "next/image";
import menu from "rbrgs/../public/images/menu.svg";

export default function NavDropdown() {
  return (
    <div className="block justify-self-end lg:hidden">
      <Image src={menu} alt="" className="flex h-5 w-5" />
    </div>
  );
}
