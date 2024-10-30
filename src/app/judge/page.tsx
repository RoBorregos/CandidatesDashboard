"use client";

import Head from "next/head";
import { useForm, SubmitHandler } from "react-hook-form";

import { InputFormA } from "../_components/FormChallengeA";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/app/_components/shadcn/ui/select";
import { useState } from "react";

import Navbar from "rbrgs/app/_components/navbar";
import Footer from "rbrgs/app/_components/footer";

const streaming: React.FC = () => {
  const [selected, setSelected] = useState<string>("Sin seleccionar");

  return (
    <main>
      <Navbar />
      <div className="mt-14 min-h-[50vh] bg-white">
        <div className="p-2">
          <h1 className="mb-2 text-center text-4xl">Reto</h1>
          <div className="mx-auto w-1/2">
            <Select
              onValueChange={(value) => {
                setSelected(value);
              }}
              value={selected}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un reto" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="challengeA">Pista A - Pelota</SelectItem>
                <SelectItem value="challengeB">
                  Pista B - Seguidor de línea
                </SelectItem>
                <SelectItem value="challengeC">Pista C - Laberinto</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="">
            <ShowForm selection={selected} />
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
};

const ShowForm = ({ selection }: { selection: string }) => {
  switch (selection) {
    case "challengeA":
      return (
        <ChallengeWrapper>
          <InputFormA />
        </ChallengeWrapper>
      );
    case "challengeB":
      return <div />;
    case "challengeC":
      return <div />;
    default:
      return <p>Selecciona un reto</p>;
  }
};

const ChallengeWrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="rounded border border-black p-3 m-3 shadow-lg w-1/2 mx-auto">{children}</div>
  );
};

export default streaming;
