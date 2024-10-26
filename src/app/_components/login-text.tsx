"use client";
import { signIn } from "next-auth/react";

export default function LoginText() {
  return (
    <p
      className="w-fit cursor-pointer rounded-md text-white hover:bg-slate-100 hover:bg-opacity-10"
      onClick={() => signIn("google")}
    >
      Log in
    </p>
  );
}
