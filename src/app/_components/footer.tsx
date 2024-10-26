import Image from "next/image";
import robologo from "../../../public/images/white-logo.png";

export default function Footer() {
  return (
    <footer className="mt-[5rem] grid w-full items-center bg-gradient-to-tr from-neutral-950 to-neutral-800 px-[5rem] py-[5vw] font-archivo text-white lg:h-[15rem] lg:grid-cols-2 lg:py-0">
      <div>
        <p className="font-anton text-[2rem] text-white">CONTACT US</p>
        <div className="mt-[1rem] flex">
          <div>
            <a href="mailto:rbrgs@rbrgs.com">
              <p className="">rbrgs@rbrgs.com</p>
            </a>
            <p className="text-white">### ### ## ##</p>
          </div>
          <div className="ml-[5rem]">
            <p>ITESM</p>
            <p>BLAH BLAH BLAH</p>
          </div>
        </div>
      </div>
      <Image
        src={robologo}
        alt="Logo"
        className="mt-[5vw] h-[8rem] w-fit justify-self-center object-contain lg:justify-self-end"
      />
    </footer>
  );
}
