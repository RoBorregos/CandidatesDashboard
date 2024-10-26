"use client";

import Head from "next/head";
import { useForm, SubmitHandler } from "react-hook-form";

import { InputFormA } from "../_components/FormChallengue1";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/app/_components/shadcn/ui/select";
import { useState } from "react";

const streaming: React.FC = () => {
  const [selected, setSelected] = useState<string>("Sin seleccionar");

  return (
    <>
      <Head>
        <title>Twitch Embed Example</title>
        <meta
          name="description"
          content="Embed a Twitch channel in a T3 app."
        />
      </Head>
      <main className="flex flex-col items-center">
        <h1>Testing form for challenges</h1>
        <div>
          <Select
            onValueChange={(value) => {
              setSelected(value);
            }}
            value={selected}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a verified email to display" />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="challengeA">Pista A - Pelota</SelectItem>
              <SelectItem value="challengeB">
                Pista B - Seguidor de línea
              </SelectItem>
              <SelectItem value="challengeC">Pista C - Laberinto</SelectItem>
            </SelectContent>
          </Select>

          <ShowForm selection={selected} />
        </div>
      </main>
    </>
  );
};

const ShowForm = ({selection}: {selection: string}) => {

  switch(selection) {
    case "challengeA":
      return <InputFormA />
    case "challengeB":
      return <div/>
    case "challengeC":
      return <div />
    default:
      return <p>Selecciona un reto</p>
  }

}

export default streaming;
