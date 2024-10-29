// components/Timeline.tsx
import React from "react";
import Image from "next/image";
import tm1 from "public/images/tm1.jpg";
import tm2 from "public/images/tm2.jpg";
import tm3 from "public/images/tm3.jpg";
import tm4 from "public/images/tm4.jpg";

const Timeline: React.FC = () => {
  const eventSections = [
    { title: "Registration", time: "9:00 AM" },
    { title: "Opening Ceremony", time: "10:00 AM" },
    { title: "Keynote Speech", time: "11:00 AM" },
    { title: "Lunch Break", time: "12:30 PM" },
    { title: "Workshop", time: "2:00 PM" },
    { title: "Closing Remarks", time: "5:00 PM" },
  ];

  return (
    <div className="relative mt-[10rem] flex w-full justify-center">
      {/* Background images arranged in a grid layout */}
      <div className="absolute inset-0 grid grid-cols-2 gap-8 px-10 opacity-15">
        <div className="relative col-span-1">
          <Image
            src={tm1}
            alt="Background decoration 1"
            layout="fill"
            objectFit="cover"
            className="rounded-xl"
          />
        </div>
        <div className="relative col-start-2 row-start-2">
          <Image
            src={tm2}
            alt="Background decoration 2"
            layout="fill"
            objectFit="cover"
            className="rounded-xl"
          />
        </div>
        <div className="relative col-span-1 col-start-2 row-start-1">
          <Image
            src={tm3}
            alt="Background decoration 3"
            layout="fill"
            objectFit="cover"
            className="rounded-xl"
          />
        </div>
        <div className="relative col-span-1 col-start-1 row-start-2">
          <Image
            src={tm4}
            alt="Background decoration 4"
            layout="fill"
            objectFit="cover"
            className="rounded-xl"
          />
        </div>
      </div>

      {/* Main content */}
      <div className="relative max-w-[40rem] p-4 text-white">
        <h2 className="mb-[1rem] mt-[5rem] text-center text-[4rem] font-bold text-roboblue">
          Event Schedule
        </h2>
        <div className="relative mt-[3rem] border-l border-gray-200">
          {eventSections.map((event, index) => (
            <div
              key={index}
              className="mb-8 ml-[2rem] rounded-xl bg-gradient-to-tr from-neutral-950 to-neutral-800 p-[2vw]"
            >
              <div className="absolute -left-3 h-6 w-6 rounded-full border-2 border-white bg-roboblue"></div>
              <time className="mb-1 block text-sm font-medium text-neutral-400">
                {event.time}
              </time>
              <h3 className="text-lg font-semibold">{event.title}</h3>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Timeline;
