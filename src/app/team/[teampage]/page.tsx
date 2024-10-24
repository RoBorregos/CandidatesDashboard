import Table from "~/app/_components/table"

export default function TeamPage({ params }: { params: { teampage: string } }) {
    const Logs = [
        {
            col2: "Log 1",
            col1: "10:00"
        },
        {
            col2: "Log 2",
            col1: "11:00"
        },
        {
            col2: "Log 3",
            col1: "12:00"
        }
    ]
    return (
        <div className="h-max bg-black text-white p-10">
            <h1>Team Page {params.teampage}</h1>

            <Table data={Logs} title={"Round 1"} />

            <Table data={Logs} title={"Round 2"} />

            <Table data={Logs} title={"Round 3"} />

            <h1> Interviews </h1>

            <Table data={Logs} title={""} />


        </div>
    )
}
