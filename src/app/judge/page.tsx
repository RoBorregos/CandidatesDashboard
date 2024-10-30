"use client";

import { InputFormA } from "../_components/FormChallengeA";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/app/_components/shadcn/ui/select";
import { useState } from "react";
import Header from "rbrgs/app/_components/header";

const streaming: React.FC = () => {
  const [selected, setSelected] = useState<string>("Sin seleccionar");

  return (
    <main className="mt-[4rem] h-96 bg-black text-sm text-white md:text-base">
      <div className="md:pb-20">
        <Header title="Judge" subtitle="" />
      </div>
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
    <div className="m-3 mx-auto w-1/2 rounded border border-black p-3 shadow-lg">
      {children}
    </div>
  );
};

export default streaming;