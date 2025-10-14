import Image from "next/image";
import robologo from "../../../public/images/white-logo.png";

export default function Header({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="relative isolate flex h-80 w-full flex-col items-center justify-center overflow-hidden lg:my-20">
      <div className="z-10 text-center">
        <h1 className="pb-4 font-jersey_25 text-6xl leading-none text-roboblue lg:text-[7vw]">
          {title}
        </h1>
        <p className="font-anton text-xl text-white lg:text-[2vw]">
          {subtitle}
        </p>
      </div>
      <Image
        src={robologo}
        alt="RoBorregos logo"
        fill
        sizes="100vw"
        className="pointer-events-none z-0 select-none object-contain object-center px-10 opacity-20"
        priority
      />
    </div>
  );
}
