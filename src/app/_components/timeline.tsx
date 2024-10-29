// components/Timeline.tsx
import React from "react";
import Image from "next/image";
import tm1 from "r/../public/images/tm1.jpg";
import tm2 from "r/../public/images/tm2.jpg";
import tm3 from "r/../public/images/tm3.jpg";

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
    <div className="relative mx-[vw] flex w-full justify-center">
      {/* Left Images */}
      <Image
        src={tm1}
        alt="Left decoration 1"
        className="absolute left-[5%] top-[25%] hidden w-1/4 rotate-[10deg] rounded-xl opacity-50 lg:block"
      />
      <Image
        src={tm2}
        alt="Left decoration 2"
        className="absolute left-[5%] top-[70%] hidden w-1/4 rotate-[-10deg] rounded-xl opacity-50 lg:block"
      />

      {/* Right Image */}
      <Image
        src={tm3}
        alt="Right decoration"
        className="absolute right-[5%] top-[45%] hidden w-1/4 rotate-[5deg] rounded-xl opacity-50 lg:block"
      />

      <div className="max-w-[40rem] p-4 text-white">
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
              <time className="mb-1 block text-sm font-medium">
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
