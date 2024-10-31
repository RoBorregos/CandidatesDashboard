import Image from "next/image";
import robologo from "../../../public/images/white-logo.png";
import Link from "next/link";
import { Facebook, Instagram, LucideYoutube, YoutubeIcon } from "lucide-react";
import { GitHubLogoIcon, LinkedInLogoIcon } from "@radix-ui/react-icons";
import YoutubeLogo from "rbrgs/app/_components/YoutubeLogo";

export default function Footer() {
  return (
    <footer className="mt-[5rem] flex w-full max-w-full items-center justify-items-center bg-gradient-to-tr from-neutral-950 to-neutral-800 py-[5vw] font-archivo text-white sm:grid-cols-1 sm:flex-wrap sm:px-4 md:flex-row md:px-[5rem] lg:flex lg:h-[15rem] lg:grid-cols-2 lg:items-center lg:py-0">
      <div className="flex sm:flex-wrap md:flex-row">
        <div>
          <p className="font-anton text-[2rem] text-white">
            More about RoBorregos
          </p>
          <div className="mt-[1rem] flex flex-wrap">
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
          </div>
        </div>
        <div className="lg:ml-[5rem]">
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
        className="h-[8rem] w-fit self-center justify-self-center object-contain sm:mt-0 md:mt-[3rem] lg:ml-auto lg:mt-0"
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
