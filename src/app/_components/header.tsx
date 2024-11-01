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
    <div className="relative flex h-full flex-col items-center justify-center overflow-hidden p-10 lg:py-20">
      <div className="z-10 text-center">
        <h1 className="pb-4 font-jersey_25 text-6xl leading-none text-roboblue lg:text-[7vw]">
          {title}
        </h1>
        <p className="font-anton text-xl text-white lg:text-[2vw]">
          {subtitle}
        </p>
      </div>
      <div className="-z-11 absolute left-1/2 top-1/2 h-full max-h-full -translate-x-1/2 -translate-y-1/2 transform pt-[3rem]">
        <Image
          src={robologo}
          alt=""
          className="h-auto max-h-full w-[40vw] max-w-[20rem] object-contain opacity-20"
        />
      </div>
    </div>
  );
}
