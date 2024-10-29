export default function Title({ title }: { title: string }) {
  return (
    <div className="relative my-20 h-auto w-full pb-3 text-center">
      <div className="absolute left-1/2 top-1/2 z-20 h-20 w-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-rbrgs blur-[30px]"></div>
      <div className="absolute left-1/2 top-1/2 z-30 flex -translate-x-1/2 -translate-y-1/2 flex-col">
        <h1
          id="typewriter"
          className="font-jersey_25 text-3xl font-bold text-white lg:text-5xl"
        >
          {title}
        </h1>
      </div>
    </div>
  );
}
