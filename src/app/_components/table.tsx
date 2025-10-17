import Subtitle from "./subtitle";

interface TableProps {
  title: string;
  data: { col1: string; col2: string }[];
}

export default function Table({ title, data }: TableProps) {
  return (
    <div className="px-10 md:px-20">
      <div className="my-[2rem]">
        <Subtitle subtitle={title} />
      </div>

      <div className="rounded-md bg-gradient-to-r from-blue-rbrgs to-black p-10">
        <table className="w-full self-start border-2">
          <thead>
            <tr className="border-2 bg-slate-200 text-start text-black">
              <th className="p-2 text-start md:w-60">Time</th>
              <th className="text-start">Challenge</th>
            </tr>
          </thead>
          <tbody>
            {data.map((log, key) => (
              <tr key={key} className="">
                <td className="w-min border-r-2 p-2">{log.col1}</td>
                <td className="p-2">{log.col2}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
