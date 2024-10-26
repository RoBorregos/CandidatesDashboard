import Image from "next/image";
import robologo from "../../../public/images/white-logo.png";

export default function Footer() {
    return (
        <footer className="bg-gradient-to-tr from-neutral-950 to-neutral-800 w-full h-[15rem] grid grid-cols-2 items-center px-[5rem] mt-[5rem] font-archivo text-white">
            <div>
                <p className="text-white font-anton text-[2rem]">CONTACT US</p>
                <div className="flex mt-[1rem]">
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
            <Image src={robologo} alt="Logo" className="h-[8rem] w-fit object-contain justify-self-end" />
        </footer>
    );
}