"use client";
import { signIn } from "next-auth/react";

export default function CustomLoginText({ text, label }: { text: string, label: string }) {
    return (

        <div className="flex flex-col justify-center items-center">
            <p className="w-fit text-white pb-5">
                {text}
            </p>
            <p
                className="w-fit p-2 bg-slate-700 cursor-pointer rounded-md text-white transition duration-300 hover:bg-slate-100 hover:bg-opacity-10"
                onClick={() => signIn("google")}
            >
                {label}
            </p>
        </div>
    );
}