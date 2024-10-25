import Head from "next/head";
import { useForm, SubmitHandler } from "react-hook-form";

import { InputForm } from "../_components/FormChallengue1";

const streaming: React.FC = () => {
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
        <h1>Testing twitch embedded</h1>
        <InputForm />
      </main>
    </>
  );
};

export default streaming;
