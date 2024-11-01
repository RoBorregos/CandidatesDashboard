import Image from "next/image";
import robologo from "../../../public/images/white-logo.png";
import Link from "next/link";
import { Facebook, Instagram, LucideYoutube, YoutubeIcon } from "lucide-react";
import { GitHubLogoIcon, LinkedInLogoIcon } from "@radix-ui/react-icons";
import YoutubeLogo from "rbrgs/app/_components/YoutubeLogo";

export default function Footer() {
  return (
    <footer className="mt-[5rem] flex w-full max-w-full flex-col items-center gap-2 bg-gradient-to-tr from-neutral-950 to-neutral-800 px-10 py-[5vw] text-center font-archivo text-white md:flex-row">
      <div>
        <p className="font-anton text-[2rem] text-white">
          More about RoBorregos
        </p>
        <div className="mt-[1rem] flex w-full flex-col flex-wrap gap-2">
          <a href="mailto:info@roborregos.com">
            <p className="hover:underline">info@roborregos.com</p>
          </a>
          <Link href="https://www.roborregos.com/">
            <p className="cursor-pointer hover:underline">www.roborregos.com</p>
          </Link>
        </div>
      </div>
      <div className="flex w-full flex-col items-center gap-2">
        <div>
          <p>RoBorregos</p>
          <p>
            <Link href="https://www.tec.mx/" className="hover:underline">
              ITESM&apos;s
            </Link>{" "}
            International Representative Robotics team
          </p>
        </div>
        <div className="flex gap-4 sm:flex-wrap lg:ml-[5rem]">
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
      <Link
        href="https://www.roborregos.com/"
        className="flex h-[8rem] w-fit items-center justify-center self-center justify-self-center object-contain lg:ml-auto"
      >
        <Image
          src={robologo}
          alt="Logo"
          className="h-[8rem] w-fit self-center justify-self-center object-contain sm:mt-0 md:mt-[3rem] lg:ml-auto lg:mt-0"
        />
      </Link>
    </footer>
  );
}
