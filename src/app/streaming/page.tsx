// pages/index.tsx

import Head from 'next/head';
import TwitchEmbed from 'C:/Users/leo1l/OneDrive/Desktop/CandidatesDashboard/CandidatesDashboard/src/app/_components/TwitchEmbed';

const streaming: React.FC = () => {
  return (
    <>
      <Head>
        <title>Twitch Embed Example</title>
        <meta name="description" content="Embed a Twitch channel in a T3 app." />
      </Head>
      <main>
        <h1>Testing twitch embedded</h1>
        <TwitchEmbed channel="Rubius" /> {/* Replace with your desired channel */}
      </main>
    </>
  );
};

export default streaming;

