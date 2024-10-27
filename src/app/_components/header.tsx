import Image from "next/image";
import robologo from "../../../public/images/white-logo.png";


export default function Header({ title, subtitle }: { title: string, subtitle: string }) {
    return (
        <div className="relative flex h-full flex-col items-center justify-center overflow-hidden p-10 lg:py-20">
            <div className="z-10 text-center">
                <h1 className="font-jersey_25 text-6xl lg:text-[7vw] pb-4 leading-none text-roboblue">
                    {title}
                </h1>
                <p className="mt-[-2vw] font-anton text-xl lg:text-[2vw] text-white">
                    {subtitle}
                </p>
            </div>
            <div className="h-max absolute left-1/2 top-1/2 -z-11 lg:translate-x-1/4 -translate-y-1/2 transform">
                <Image
                    src={robologo}
                    alt=""
                    className="w-[40vw] h-max max-w-[20rem] opacity-20"
                />
            </div>
        </div>
    )
}