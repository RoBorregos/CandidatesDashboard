import React from "react";
import eventsData from "./events.json";
import TimelineImg from "./timelineImg";

const Timeline: React.FC = () => {
  const eventSections = eventsData.eventSections;

  return (
    <div className="relative mt-[10rem] flex w-full justify-center">
      <div className="absolute inset-0 grid grid-cols-2 gap-8 px-10 opacity-15">
        <TimelineImg numberImage={1} col={1} row={1} />
        <TimelineImg numberImage={2} col={2} row={1} />
        <TimelineImg numberImage={3} col={1} row={2} />
        <TimelineImg numberImage={4} col={2} row={2} />
      </div>

      <div className="relative max-w-[40rem] p-4 text-white">
        <h2 className="mt-[5rem] text-center text-[4rem] font-bold text-roboblue">
          Event Schedule
        </h2>
        <h3 className="text-center text-lg">Times are subject to changes*</h3>
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
