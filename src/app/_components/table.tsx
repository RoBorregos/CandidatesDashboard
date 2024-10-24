interface TableProps {
    title: string;
    data: { col1: string, col2: string }[];
}

export default function Table({ title, data }: TableProps) {
    return (
        <div className="p-10">
            <h2 className="">
                {title}
            </h2>

            <div className="p-10 bg-gradient-to-r from-blue-rbrgs to-black rounded-md">


                <table className="border-2 w-full self-start">
                    <thead>
                        <tr className="text-start border-2 bg-slate-200 text-black">
                            <th className="text-start p-2 w-min">Time</th>
                            <th className="text-start">Challenge</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data ? (
                            data.map((log, key) => (
                                <tr key={key} className="">
                                    <td className="p-2 border-r-2 w-min">{log.col1}</td>
                                    <td className="p-2">{log.col2}</td>
                                </tr>

                            ))
                        ) : (
                            <tr>
                                <td>No schedule</td>
                            </tr>
                        )}
                    </tbody>

                </table>
            </div>
        </div>
    )
}