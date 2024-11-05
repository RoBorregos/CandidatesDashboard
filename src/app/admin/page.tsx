"use client";

import { api } from "~/trpc/react";

export default function Page() {
  const { data: links } = api.team.getLinks.useQuery();

  const exportToCSV = () => {
    if (!links) return;

    const headers = ["Name", "Link"];
    const rows = links.map((link) => [link.name, link.link]);

    let csvContent =
      "data:text/csv;charset=utf-8," +
      headers.join(",") +
      "\n" +
      rows.map((e) => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "links.csv");
    document.body.appendChild(link);

    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="text-white">
      <button
        onClick={exportToCSV}
        className="mb-4 rounded bg-blue-500 p-2 text-[10rem]"
      >
        Export to CSV
      </button>
      {/* {links &&
        links.map((link) => (
          <div key={link.name}>
            <table>
              <tr>
                <td>{link.name}</td>
                <td>{link.link}</td>
              </tr>
            </table>
          </div>
        ))} */}
    </div>
  );
}
