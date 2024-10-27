

export default function Title({ title }: { title: string }) {
    return (
        <div className="text-center relative h-auto w-full my-20 pb-3">
            <div className="bg-blue-rbrgs rounded-full blur-[30px] z-20 absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 w-1/2 h-20"></div>
            <div className="z-50 absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 flex flex-col" >
                <h1 id="typewriter" className="text-white font-jersey_25 font-bold text-5xl">
                    {title}
                </h1>
            </div>
        </div>
    );
}