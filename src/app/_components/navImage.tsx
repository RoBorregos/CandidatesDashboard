"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import robologo from "../../../public/images/white-logo.png";

export default function NavImage() {
  const router = useRouter();
  return (
    <Image
      src={robologo}
      alt="Logo"
      className="h-[2rem] w-fit cursor-pointer object-contain"
      onClick={() => {
        router.push("/");
      }}
    />
  );
}
