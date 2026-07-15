import React from "react";
import { Composition } from "remotion";
import { Advert, ADVERT_DURATION } from "./Advert";

// Three aspect ratios from one composition:
//  - Vertical  (Reels / TikTok / Stories)  — the primary deliverable
//  - Square    (feed posts)
//  - Wide      (YouTube / website hero)
export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="AflAdvert"
        component={Advert}
        durationInFrames={ADVERT_DURATION}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="AflAdvertSquare"
        component={Advert}
        durationInFrames={ADVERT_DURATION}
        fps={30}
        width={1080}
        height={1080}
      />
      <Composition
        id="AflAdvertWide"
        component={Advert}
        durationInFrames={ADVERT_DURATION}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
