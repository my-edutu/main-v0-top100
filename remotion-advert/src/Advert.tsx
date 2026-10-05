import React from "react";
import { AbsoluteFill, Audio, Img, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { COLORS, FONT_STACK } from "./theme";

loadFont("normal", { weights: ["400", "500", "600", "700"], subsets: ["latin"] });

const moments = [
  { image: "gather1.jpg", kicker: "A new generation is rising", headline: "Africa’s future\nis being shaped now.", span: "Africa’s future" },
  { image: "leader3.jpg", kicker: "Ideas deserve a bigger stage", headline: "Bold ideas.\nBrighter possibilities.", span: "Bold ideas." },
  { image: "gather2.jpg", kicker: "Progress grows together", headline: "Connect across\nborders and fields.", span: "Connect across" },
  { image: "gather4.jpg", kicker: "Purpose turns into progress", headline: "Turn vision\ninto impact.", span: "Turn vision" },
  { image: "leader4.jpg", kicker: "This is Africa Future Leaders", headline: "One continent.\nMany ways to lead.", span: "Many ways to lead." },
];

const Moment: React.FC<{ item: typeof moments[number]; index: number }> = ({ item, index }) => {
  const frame = useCurrentFrame();
  const enter = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: "clamp" });
  const scale = interpolate(frame, [0, 150], [1.04, 1.16]);
  return (
    <AbsoluteFill style={{ overflow: "hidden", opacity: enter }}>
      <Img src={staticFile(item.image)} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${scale})` }} />
      <AbsoluteFill style={{ background: "linear-gradient(180deg,rgba(5,6,15,.16) 5%,rgba(5,6,15,.12) 28%,rgba(5,6,15,.78) 63%,#05060f 100%)" }} />
      <div style={{ position: "absolute", top: 100, left: 70, right: 70, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ color: "white", font: `700 29px/1 ${FONT_STACK}`, letterSpacing: ".08em" }}>TOP<span style={{ color: "#ffad4d" }}>100</span><br/><span style={{ fontSize: 14, letterSpacing: ".17em" }}>AFRICA FUTURE LEADERS</span></div>
        <span style={{ color: "white", fontFamily: FONT_STACK, fontSize: 21, fontWeight: 600, letterSpacing: ".12em" }}>AFRICA FUTURE LEADERS</span>
      </div>
      <div style={{ position: "absolute", left: 78, right: 78, bottom: 210, textAlign: "left", transform: `translateY(${interpolate(enter, [0,1], [35,0])}px)` }}>
        <div style={{ color: "#ffb35e", textTransform: "uppercase", letterSpacing: ".18em", font: `600 25px ${FONT_STACK}`, marginBottom: 24 }}>{item.kicker}</div>
        <div style={{ font: `700 80px/1.12 ${FONT_STACK}`, color: "white", whiteSpace: "pre-line", maxWidth: 920, letterSpacing: "-.04em" }}>
          {item.headline.split(item.span).length > 1 ? <><span style={{ color: "#ffad4d" }}>{item.span}</span>{item.headline.split(item.span).slice(1).join(item.span)}</> : item.headline}
        </div>
      </div>
      <div style={{ position: "absolute", left: 78, bottom: 112, display: "flex", gap: 12 }}>
        {moments.map((_, i) => <div key={i} style={{ width: i === index ? 46 : 9, height: 8, borderRadius: 9, background: i === index ? "#ffad4d" : "rgba(255,255,255,.6)" }} />)}
      </div>
    </AbsoluteFill>
  );
};

const Closing: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ opacity, alignItems: "center", justifyContent: "center", background: "radial-gradient(ellipse at 50% 70%,rgba(249,115,22,.32),transparent 55%),#05060f", color: "white", fontFamily: FONT_STACK, textAlign: "center" }}>
    <div style={{ marginBottom: 25, lineHeight: 1.08, fontWeight: 700, letterSpacing: ".02em" }}>
      <div style={{ color: "#ffad4d", fontSize: 26, letterSpacing: ".28em", marginBottom: 12 }}>TOP 100</div>
      <div style={{ fontSize: 48 }}>AFRICA FUTURE</div>
      <div style={{ fontSize: 48 }}>LEADERS</div>
    </div>
    <div style={{ fontSize: 48, fontWeight: 600, lineHeight: 1.25 }}>The future is ours<br/><span style={{ color: "#ffad4d" }}>to shape together.</span></div>
    <div style={{ marginTop: 48, fontSize: 34, fontWeight: 600, color: "#fff" }}>Discover Africa Future Leaders</div>
    <div style={{ marginTop: 14, fontSize: 31, color: "#ffad4d" }}>top100afl.com</div>
  </AbsoluteFill>;
};

export const ADVERT_DURATION = 30 * 30;
export const Advert: React.FC = () => <AbsoluteFill style={{ backgroundColor: COLORS.ink }}>
  <Audio src={staticFile("afl-narration.wav")} volume={0.95} />
  <Audio src={staticFile("afl-music.wav")} volume={0.2} />
  {moments.map((item, index) => <Sequence key={item.image} from={index * 150} durationInFrames={150}><Moment item={item} index={index}/></Sequence>)}
  <Sequence from={750} durationInFrames={150}><Closing/></Sequence>
</AbsoluteFill>;
