import React from "react";

const TableHeader = () => {
  const headers = ["#", "Equipo", "Pista A", "Pista B", "Pista C", "Puntaje Final"];

  return (
    <thead className="bg-gray-800 text-sm uppercase tracking-wider text-roboblue">
      <tr>
        {headers.map((header, index) => (
          <th
            key={index}
            scope="col"
            className={`p-4 font-anton ${index === 0 ? "text-center" : ""}`}
          >
            {header}
          </th>
        ))}
      </tr>
    </thead>
  );
};

export default TableHeader;
