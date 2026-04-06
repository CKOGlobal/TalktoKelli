import { useState } from "react";

const css = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,400;0,500;0,600;1,400;1,500&family=DM+Sans:wght@300;400;500&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
.ss-root { min-height: 100vh; background: #F7F3EE; font-family: 'DM Sans', sans-serif; color: #2C1A0E; display: flex; flex-direction: column; }
.ss-topbar { background: #2C1A0E; padding: 14px 32px; display: flex; align-items: center; gap: 12px; }
.ss-logo { width: 36px; height: 36px; border-radius: 50%; border: 2px solid #C4622D; background: #3D2B1A; display: flex; align-items: center; justify-content: center; font-family: 'Fraunces', serif; font-size: 16px; color: #E8D5C0; flex-shrink: 0; }
.ss-name { font-family: 'Fraunces', serif; font-size: 15px; font-weight: 500; color: #E8D5C0; }
.ss-sub { font-size: 10px; color: #8B6B47; letter-spacing: 0.1em; text-transform: uppercase; }
.ss-body { flex: 1; max-width: 640px; margin: 0 auto; padding: 56px 24px 72px; width: 100%; text-align: center; }
.ss-check { width: 80px; height: 80px; border-radius: 50%; background: #EDF5F0; border: 2px solid #7CB88E; display: flex; align-items: center; justify-content: center; margin: 0 auto 28px; font-size: 36px; }
.ss-h2 { font-family: 'Fraunces', serif; font-size: clamp(28px, 4vw, 40px); font-weight: 500; color: #2C1A0E; margin-bottom: 14px; line-height: 1.2; }
.ss-p { font-size: 14px; color: #8B6B47; line-height: 1.75; max-width: 460px; margin: 0 auto 36px; }
.ss-email-btn { display: inline-block; background: #C4622D; color: #FBF8F3; font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 500; padding: 15px 36px; border-radius: 50px; text-decoration: none; transition: all 0.2s; margin-bottom: 10px; }
.ss-email-btn:hover { background: #A84E22; transform: translateY(-1px); box-shadow: 0 8px 24px rgba(196,98,45,0.25); }
.ss-email-note { font-size: 11px; color: #C4B5A5; margin-bottom: 48px; }
.ss-card { background: #FFFFFF; border-radius: 20px; border: 1px solid #E8DDD0; padding: 32px 36px; text-align: left; margin-bottom: 16px; }
.ss-card-title { font-family: 'Fraunces', serif; font-size: 19px; font-weight: 500; color: #2C1A0E; margin-bottom: 22px; }
.ss-step { display: flex; gap: 14px; margin-bottom: 18px; align-items: flex-start; }
.ss-step:last-child { margin-bottom: 0; }
.ss-step-num { width: 28px; height: 28px; border-radius: 50%; background: #FBF3ED; border: 1.5px solid #E8C5A8; display: flex; align-items: center; justify-content: center; font-family: 'Fraunces', serif; font-size: 13px; color: #C4622D; flex-shrink: 0; }
.ss-step-text { font-size: 13px; color: #6B4E35; line-height: 1.65; padding-top: 3px; }
.ss-step-text strong { color: #2C1A0E; display: block; margin-bottom: 2px; }
.ss-toggle-btn { background: transparent; border: 1.5px solid #E8DDD0; border-radius: 8px; width: 100%; padding: 12px 20px; font-family: 'DM Sans', sans-serif; font-size: 12px; color: #9C8068; cursor: pointer; text-align: center; transition: all 0.2s; }
.ss-toggle-btn:hover { border-color: #C4B5A5; color: #6B4E35; }
.ss-raw { margin-top: 12px; background: #FDFBF8; border: 1px solid #E8DDD0; border-radius: 10px; padding: 20px; font-size: 11px; color: #8B6B47; line-height: 1.85; white-space: pre-wrap; max-height: 320px; overflow-y: auto; text-align: left; }
.ss-copy-btn { width: 100%; margin-top: 10px; background: transparent; border: 1px solid #E8DDD0; border-radius: 8px; padding: 10px; font-family: 'DM Sans', sans-serif; font-size: 11px; color: #9C8068; cursor: pointer; transition: all 0.2s; }
.ss-copy-btn:hover { color: #6B4E35; border-color: #C4B5A5; }
.ss-footer { background: #2C1A0E; padding: 20px 32px; text-align: center; font-size: 11px; color: #4A3526; letter-spacing: 0.06em; }
@media (max-width: 580px) { .ss-body { padding: 40px 16px 56px; } .ss-topbar { padding: 14px 20px; } .ss-card { padding: 24px 20px; } }
`;

export default function SuccessScreen({ data }) {
  const [showRaw, setShowRaw] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!data) return null;
  const firstName = data.contact?.name?.split(" ")[0] || "there";

  const copy = () => {
    navigator.clipboard.writeText(data.emailBody || "").then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const steps = [
    {
      title: "Kelli receives your agenda",
      desc: "Along with AI-generated coaching prep notes so she arrives already thinking about your specific situation.",
    },
    {
      title: "You'll receive your booking link",
      desc: "Sent to the email address you provided. Use it to schedule your call on TalkToKelli.com.",
    },
    {
      title: "Your Zoom link and session summary",
      desc: "Will be emailed to you once your call is confirmed and on the calendar.",
    },
  ];

  return (
    <>
      <style>{css}</style>
      <div className="ss-root">
        <div className="ss-topbar">
          <div className="ss-logo">K</div>
          <div>
            <div className="ss-name">Kelli Owens</div>
            <div className="ss-sub">Real Estate Coach</div>
          </div>
        </div>

        <div className="ss-body">
          <div className="ss-check">✓</div>
          <h2 className="ss-h2">You're all set, {firstName}.</h2>
          <p className="ss-p">
            Your pre-call agenda is complete. Your email client should have opened automatically to send it to Kelli. If it didn't, use the button below.
          </p>

          <a className="ss-email-btn" href={data.mailto}>
            Open Email to Send Agenda →
          </a>
          <p className="ss-email-note">
            Sends to kelli.owens@thekorealtygroup.com · {data.dateStr}
          </p>

          <div className="ss-card">
            <div className="ss-card-title">What happens next</div>
            {steps.map((s, i) => (
              <div key={i} className="ss-step">
                <div className="ss-step-num">{i + 1}</div>
                <div className="ss-step-text">
                  <strong>{s.title}</strong>
                  {s.desc}
                </div>
              </div>
            ))}
          </div>

          <div style={{ width: "100%", textAlign: "left" }}>
            <button className="ss-toggle-btn" onClick={() => setShowRaw(v => !v)}>
              {showRaw ? "Hide" : "View"} your full agenda + coaching notes
            </button>
            {showRaw && (
              <>
                <div className="ss-raw">{data.emailBody}</div>
                <button className="ss-copy-btn" onClick={copy}>
                  {copied ? "Copied to clipboard!" : "Copy full text"}
                </button>
              </>
            )}
          </div>
        </div>

        <div className="ss-footer">
          © {new Date().getFullYear()} Kelli Owens · TalkToKelli.com · Real Estate Coaching
        </div>
      </div>
    </>
  );
}
