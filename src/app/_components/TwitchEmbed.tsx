"use client"; // This line marks the component as a Client Component

import { useEffect } from "react";

// Declare the Twitch object on the window interface
declare global {
  interface Window {
    Twitch: {
      Embed: {
        new (
          id: string,
          options: {
            width: number;
            height: number;
            channel: string;
            parent: string[];
          },
        ): {
          addEventListener: (event: string, callback: () => void) => void;
          VIDEO_READY: string;
        };
        VIDEO_READY: string;
        addEventListener: (event: string, callback: () => void) => void;
      };
    };
  }
}

interface TwitchEmbedProps {
  channel: string;
}

const TwitchEmbed: React.FC<TwitchEmbedProps> = ({ channel }) => {
  useEffect(() => {
    // Clear the existing embed before creating a new one
    const embedContainer = document.getElementById("twitch-embed");

    // Create a new script tag for the Twitch embed script
    const script = document.createElement("script");
    script.src = "https://embed.twitch.tv/embed/v1.js";
    script.async = true;
    if (!embedContainer?.hasChildNodes()) {
      embedContainer?.replaceChildren(script);
    }

    script.onload = () => {
      const embed = new window.Twitch.Embed("twitch-embed", {
        width: 854,
        height: 480,
        channel: channel,
        parent: ["localhost", "mydomain.com"], // Replace with your domain
      });

      embed.addEventListener(window.Twitch.Embed.VIDEO_READY, () => {
        console.log("The video is ready");
      });
    };

    // Cleanup function to remove the script and clear embed on unmount
    return () => {
      const twitchEmbed = document.getElementById("twitch-embed");
      if (twitchEmbed) {
        twitchEmbed.innerHTML = ""; // Clear the embed
      }
    };
  }, [channel]); // Runs when the channel changes

  return (
    <div id="twitch-embed">
      {/* DO NOT DELETE THIS DIV */}
      <div />
    </div>
  );
};

export default TwitchEmbed;
