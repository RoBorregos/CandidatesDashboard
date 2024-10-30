import Image from "next/image";
import robologo from "../../../public/images/white-logo.png";
import Link from "next/link";
import { Facebook, Instagram, LucideYoutube, YoutubeIcon } from "lucide-react";
import { GitHubLogoIcon, LinkedInLogoIcon } from "@radix-ui/react-icons";
import YoutubeLogo from "rbrgs/app/_components/YoutubeLogo";

export default function Footer() {
  return (
    <footer className="mt-[5rem] grid w-full items-center justify-items-center bg-gradient-to-tr from-neutral-950 to-neutral-800 px-[5rem] py-[5vw] font-archivo text-white lg:flex lg:h-[15rem] lg:grid-cols-2 lg:items-center lg:py-0">
      <div>
        <p className="font-anton text-[2rem] text-white">
          More about RoBorregos
        </p>
        <div className="mt-[1rem] flex">
          <div>
            <a href="mailto:info@roborregos.com">
              <p className="hover:underline">info@roborregos.com</p>
            </a>
            <Link href="https://www.roborregos.com/">
              <p className="cursor-pointer hover:underline">
                www.roborregos.com
              </p>
            </Link>
          </div>
          <div className="ml-[5rem]">
            <p>RoBorregos</p>
            <p>
              <Link href="https://www.tec.mx/" className="hover:underline">
                ITESM&apos;s
              </Link>{" "}
              International Representative Robotics team
            </p>
          </div>
          <div className="ml-[5rem] flex gap-4">
            <Link href="https://www.instagram.com/RoBorregos/">
              <Instagram className="h-12 w-12 hover:text-rbrgs-blue" />
            </Link>
            <Link href="https://www.facebook.com/RoBorregos/">
              <Facebook className="h-12 w-12 hover:text-rbrgs-blue" />
            </Link>
            <Link href="https://www.linkedin.com/company/roborregos/">
              <LinkedInLogoIcon className="h-12 w-12 hover:text-rbrgs-blue" />
            </Link>
            <Link href="https://www.github.com/RoBorregos">
              <GitHubLogoIcon className="h-12 w-12 hover:text-rbrgs-blue" />
            </Link>
            <Link href="https://www.youtube.com/@roborregosteam7145">
              <YoutubeLogo className="h-12 w-12 fill-white hover:fill-rbrgs-blue" />
            </Link>
          </div>
        </div>
      </div>
      <Link
        href="https://www.roborregos.com/"
        className="mt-[3rem] h-[8rem] w-fit self-center justify-self-center object-contain lg:ml-auto lg:mt-0"
      >
        <Image
          src={robologo}
          alt="Logo"
          className="mt-[3rem] h-[8rem] w-fit self-center justify-self-center object-contain lg:ml-auto lg:mt-0"
        />
      </Link>
    </footer>
  );
}
