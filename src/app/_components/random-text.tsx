"use client";
import React, { useEffect, useState } from "react";

function genRandomText() {
  const hex_val = Math.round(Math.random() * 4095);
  return hex_val.toString(16);
}

export default function RandomText() {
  //   const randomText = genRandomText();
  const [randomText, setRandomText] = useState(genRandomText());
  useEffect(() => {
    const interval = setInterval(() => {
      setRandomText(genRandomText());
    }, 100);
    return () => clearInterval(interval);
  }, []);
  return <p className="min-w-5 max-w-5">{randomText}</p>;
}
