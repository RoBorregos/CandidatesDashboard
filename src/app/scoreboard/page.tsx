import Footer from "../_components/footer";
import Header from "../_components/header";
import Subtitle from "../_components/subtitle";
import Title from "../_components/title";

interface TwitchEmbedProps {
  channel: string;
}

const TwitchEmbed = ({ channel }: TwitchEmbedProps) => (
  <div className="aspect-video w-full">
    <iframe
      src={`https://player.twitch.tv/?channel=${channel}&parent=localhost`}
      className="h-full w-full"
      allowFullScreen
    />
  </div>
);

export default async function scoreboardPage() {
  // const

  return (
    <div className="mt-[4rem] h-96 bg-black text-sm text-white md:text-base">
      <Header title="Scoreboard" />
      <div className="container mx-auto p-4">
        <div className="grid gap-4 md:grid-cols-2">
          {/* Stream section */}
          <div className="w-full">
            <TwitchEmbed channel="sinatraa" />
          </div>

          {/* Leaderboard section */}
          <div className="my-auto w-full overflow-x-auto">
            <table className="min-w-full border-collapse text-white">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="p-4 text-left">Rank</th>
                  <th className="p-4 text-left">Team</th>
                  <th className="p-4 text-left">Score</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-700">
                  <td className="p-4">1</td>
                  <td className="p-4">Team 1</td>
                  <td className="p-4">100</td>
                </tr>
                <tr className="border-b border-gray-700">
                  <td className="p-4">2</td>
                  <td className="p-4">Team 2</td>
                  <td className="p-4">90</td>
                </tr>
                <tr className="border-b border-gray-700">
                  <td className="p-4">3</td>
                  <td className="p-4">Team 3</td>
                  <td className="p-4">80</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Title title="General" />

      <div className="mx-auto w-full max-w-7xl overflow-x-auto px-4">
        <table className="min-w-full border-collapse text-white">
          <colgroup>
            <col /> {/* Team name column */}
            <col span={3} /> {/* Round 1 */}
            <col span={3} /> {/* Round 2 */}
            <col span={3} /> {/* Round 3 */}
            <col /> {/* Total */}
          </colgroup>
          <thead>
            <tr className="border-b border-gray-700">
              <th className="p-4 text-left" rowSpan={2}>
                Team
              </th>
              <th className="p-4 text-center" colSpan={3}>
                Round 1
              </th>
              <th className="p-4 text-center" colSpan={3}>
                Round 2
              </th>
              <th className="p-4 text-center" colSpan={3}>
                Round 3
              </th>
              <th className="p-4 text-right" rowSpan={2}>
                Total
              </th>
            </tr>
            <tr className="border-b border-gray-700">
              {/* Round 1 */}
              <th className="p-3 text-sm font-normal">C1</th>
              <th className="p-3 text-sm font-normal">C2</th>
              <th className="p-3 text-sm font-normal">C3</th>
              {/* Round 2 */}
              <th className="p-3 text-sm font-normal">C1</th>
              <th className="p-3 text-sm font-normal">C2</th>
              <th className="p-3 text-sm font-normal">C3</th>
              {/* Round 3 */}
              <th className="p-3 text-sm font-normal">C1</th>
              <th className="p-3 text-sm font-normal">C2</th>
              <th className="p-3 text-sm font-normal">C3</th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
      </div>

      <Footer />
    </div>
  );
}
