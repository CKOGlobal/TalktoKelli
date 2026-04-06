import { useState, useRef } from "react";

const YOUTUBE_EMBED = "https://www.youtube.com/embed/am59JML0n5s?rel=0&modestbranding=1";

const css = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,400;0,500;0,600;1,400;1,500&family=DM+Sans:wght@300;400;500&display=swap');

.wp-root {
  min-height: 100vh;
  background: #F7F3EE;
  font-family: 'DM Sans', sans-serif;
  color: #2C1A0E;
  display: flex;
  flex-direction: column;
}

.wp-topbar {
  background: #2C1A0E;
  padding: 14px 32px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.wp-logo {
  width: 36px; height: 36px;
  border-radius: 50%;
  border: 2px solid #C4622D;
  background: #3D2B1A;
  display: flex; align-items: center; justify-content: center;
  font-family: 'Fraunces', serif;
  font-size: 16px; color: #E8D5C0;
  flex-shrink: 0;
}

.wp-brand { line-height: 1.3; }
.wp-name { font-family: 'Fraunces', serif; font-size: 15px; font-weight: 500; color: #E8D5C0; }
.wp-sub { font-size: 10px; color: #8B6B47; letter-spacing: 0.1em; text-transform: uppercase; }

.wp-hero {
  background: linear-gradient(150deg, #2C1A0E 0%, #3D2B1A 55%, #5C3D22 100%);
  padding: 56px 32px 52px;
  text-align: center;
}

.wp-eyebrow {
  font-size: 10px; letter-spacing: 0.22em; text-transform: uppercase;
  color: #C4622D; margin-bottom: 16px;
}

.wp-h1 {
  font-family: 'Fraunces', serif;
  font-size: clamp(30px, 5.5vw, 52px);
  font-weight: 500; color: #F5EDE3;
  line-height: 1.12; margin-bottom: 14px;
}

.wp-h1 em { font-style: italic; color: #E8A882; }

.wp-tagline {
  font-size: 15px; color: #8B6B47;
  line-height: 1.7; max-width: 500px;
  margin: 0 auto;
}

.wp-body {
  flex: 1;
  max-width: 860px;
  margin: 0 auto;
  padding: 48px 24px 64px;
  width: 100%;
}

.wp-video-wrap {
  background: #FFFFFF;
  border-radius: 20px;
  border: 1px solid #E8DDD0;
  overflow: hidden;
  margin-bottom: 36px;
  position: relative;
}

.wp-video-inner {
  position: relative;
  padding-bottom: 56.25%;
  height: 0;
  overflow: hidden;
}

.wp-video-inner iframe {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  border: none;
}

.wp-intro {
  background: #FFFFFF;
  border-radius: 20px;
  border: 1px solid #E8DDD0;
  padding: 40px 44px;
  margin-bottom: 32px;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 40px;
  align-items: center;
}

@media (max-width: 640px) {
  .wp-intro { grid-template-columns: 1fr; padding: 28px 24px; gap: 24px; }
  .wp-intro-visual { display: none; }
  .wp-body { padding: 32px 16px 50px; }
  .wp-hero { padding: 40px 20px 36px; }
  .wp-topbar { padding: 14px 20px; }
}

.wp-intro-text {}

.wp-intro-eyebrow {
  font-size: 9px; letter-spacing: 0.2em; text-transform: uppercase;
  color: #C4622D; margin-bottom: 12px;
}

.wp-intro-title {
  font-family: 'Fraunces', serif;
  font-size: clamp(20px, 3vw, 27px);
  font-weight: 500; color: #2C1A0E;
  line-height: 1.25; margin-bottom: 14px;
}

.wp-intro-title em { font-style: italic; color: #C4622D; }

.wp-intro-body {
  font-size: 14px; color: #6B4E35;
  line-height: 1.8;
}

.wp-intro-visual {
  flex-shrink: 0;
}

.wp-car-graphic {
  width: 140px; height: 140px;
  border-radius: 50%;
  background: #FBF3ED;
  border: 2px solid #E8C5A8;
  display: flex; align-items: center; justify-content: center;
  font-size: 60px;
}

.wp-steps {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
  margin-bottom: 36px;
}

@media (max-width: 560px) {
  .wp-steps { grid-template-columns: 1fr; }
}

.wp-step {
  background: #FFFFFF;
  border-radius: 14px;
  border: 1px solid #E8DDD0;
  padding: 22px 20px;
  text-align: center;
}

.wp-step-num {
  width: 32px; height: 32px;
  border-radius: 50%;
  background: #FBF3ED;
  border: 1.5px solid #E8C5A8;
  display: flex; align-items: center; justify-content: center;
  font-family: 'Fraunces', serif;
  font-size: 14px; font-weight: 500; color: #C4622D;
  margin: 0 auto 12px;
}

.wp-step-title {
  font-family: 'Fraunces', serif;
  font-size: 15px; font-weight: 500;
  color: #2C1A0E; margin-bottom: 6px;
}

.wp-step-desc {
  font-size: 12px; color: #9C8068;
  line-height: 1.6;
}

.wp-cta {
  text-align: center;
  padding: 0 20px;
}

.wp-cta-title {
  font-family: 'Fraunces', serif;
  font-size: 22px; font-weight: 500;
  color: #2C1A0E; margin-bottom: 10px;
}

.wp-cta-sub {
  font-size: 13px; color: #9C8068;
  margin-bottom: 28px; line-height: 1.6;
}

.wp-begin-btn {
  display: inline-flex; align-items: center; gap: 10px;
  background: #C4622D; color: #FBF8F3;
  font-family: 'DM Sans', sans-serif;
  font-size: 15px; font-weight: 500;
  padding: 16px 40px;
  border-radius: 50px;
  border: none; cursor: pointer;
  transition: all 0.25s;
  letter-spacing: 0.01em;
}

.wp-begin-btn:hover {
  background: #A84E22;
  transform: translateY(-1px);
  box-shadow: 0 8px 24px rgba(196,98,45,0.25);
}

.wp-begin-btn:active { transform: translateY(0); }

.wp-time-note {
  margin-top: 14px;
  font-size: 11px; color: #C4B5A5;
}

.wp-footer {
  background: #2C1A0E;
  padding: 20px 32px;
  text-align: center;
  font-size: 11px; color: #4A3526;
  letter-spacing: 0.06em;
}
`;

export default function WelcomePage({ onBegin, onLegal }) {
  const steps = [
    { title: "Set Your Agenda", desc: "Tell me where you are and what you need from our time together." },
    { title: "AI Digs Deeper", desc: "Based on your answers, a few targeted follow-up questions surface what matters most." },
    { title: "I Show Up Prepared", desc: "You get a booking link. I arrive already in your corner." },
  ];

  return (
    <>
      <style>{css}</style>
      <div className="wp-root">
        <div className="wp-topbar">
          <div className="wp-logo">K</div>
          <div className="wp-brand">
            <div className="wp-name">Kelli Owens</div>
            <div className="wp-sub">Real Estate Coach · TalkToKelli.com</div>
          </div>
        </div>

        <div className="wp-hero">
          <div className="wp-eyebrow">Welcome — I'm glad you're here</div>
          <h1 className="wp-h1">
            Your wealth-building journey<br />
            <em>starts right here.</em>
          </h1>
          <p className="wp-tagline">
            You're in the driver's seat. I'm riding shotgun with the map.
          </p>
        </div>

        <div className="wp-body">
          <div className="wp-video-wrap">
            <div className="wp-video-inner">
              <iframe
                src={YOUTUBE_EMBED}
                title="Welcome from Kelli Owens"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>

          <div className="wp-intro">
            <div className="wp-intro-text">
              <div className="wp-intro-eyebrow">How This Works</div>
              <h2 className="wp-intro-title">
                This is <em>your</em> call.<br />Let's make it count.
              </h2>
              <p className="wp-intro-body">
                Whether this is your first session or your fifteenth, I want every minute of our time together focused on what <em>you</em> need. This quick form sets the agenda — so we skip the warm-up and get straight to the work that moves your investing forward.
                <br /><br />
                Fill it out honestly. There are no wrong answers. The more real you are with me here, the more you'll get out of the call.
              </p>
            </div>
            <div className="wp-intro-visual">
              <div className="wp-car-graphic">🚗</div>
            </div>
          </div>

          <div className="wp-steps">
            {steps.map((s, i) => (
              <div key={i} className="wp-step">
                <div className="wp-step-num">{i + 1}</div>
                <div className="wp-step-title">{s.title}</div>
                <div className="wp-step-desc">{s.desc}</div>
              </div>
            ))}
          </div>

          <div className="wp-cta">
            <div className="wp-cta-title">Ready to set your agenda?</div>
            <div className="wp-cta-sub">
              Takes 5–10 minutes. You'll get your booking link when it's done.
            </div>
            <button className="wp-begin-btn" onClick={onBegin}>
              Let's Get Started
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M9 3l6 6-6 6M3 9h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <div className="wp-time-note">About 5–10 minutes · No wrong answers</div>
          </div>
        </div>

        <div className="wp-footer">
          © {new Date().getFullYear()} CKO Global LLC · TalkToKelli.com &nbsp;·&nbsp;
          <button onClick={onLegal} style={{ background: "transparent", border: "none", color: "#6B4E35", cursor: "pointer", fontSize: "inherit", textDecoration: "underline", letterSpacing: "inherit", fontFamily: "inherit" }}>Terms &amp; Privacy</button>
          &nbsp;·&nbsp; <a href="mailto:kelli.owens@theKOrealtygroup.com" style={{ color: "#6B4E35" }}>kelli.owens@theKOrealtygroup.com</a>
          &nbsp;·&nbsp; <a href="tel:3466285216" style={{ color: "#6B4E35" }}>346-628-5216</a>
        </div>
      </div>
    </>
  );
}
