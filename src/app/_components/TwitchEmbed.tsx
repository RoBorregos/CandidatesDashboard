"use client"; // This line marks the component as a Client Component

import { useEffect } from 'react';

interface TwitchEmbedProps {
  channel: string;
}

const TwitchEmbed: React.FC<TwitchEmbedProps> = ({ channel }) => {
  useEffect(() => {
    // Clear the existing embed before creating a new one
    const embedContainer = document.getElementById("twitch-embed");
    if (embedContainer) {
      embedContainer.innerHTML = ""; // Clear previous embed
    }

    // Create a new script tag for the Twitch embed script
    const script = document.createElement('script');
    script.src = "https://embed.twitch.tv/embed/v1.js";
    script.async = true;
    document.body.appendChild(script);

    script.onload = () => {
      const embed = new (window as any).Twitch.Embed("twitch-embed", {
        width: 854,
        height: 480,
        channel: channel,
        parent: ["localhost", "mydomain.com"], // Replace with your domain
      });

      embed.addEventListener((window as any).Twitch.Embed.VIDEO_READY, () => {
        console.log('The video is ready');
      });
    };

    // Cleanup function to remove the script and clear embed on unmount
    return () => {
      document.body.removeChild(script);
      if (embedContainer) {
        embedContainer.innerHTML = ""; // Clear the embed container
      }
    };
  }, [channel]); // Runs when the channel changes

  return (
    <div>
      <div id="twitch-embed"></div>
    </div>
  );
};

export default TwitchEmbed;
