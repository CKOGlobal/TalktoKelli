import { useState, useRef } from "react";

const css = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,400;0,500;0,600;1,400;1,500&family=DM+Sans:wght@300;400;500&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
.cf-root { min-height: 100vh; background: #F7F3EE; font-family: 'DM Sans', sans-serif; color: #2C1A0E; }
.cf-topbar { background: #2C1A0E; padding: 14px 32px; display: flex; align-items: center; justify-content: space-between; }
.cf-logo { width: 36px; height: 36px; border-radius: 50%; border: 2px solid #C4622D; background: #3D2B1A; display: flex; align-items: center; justify-content: center; font-family: 'Fraunces', serif; font-size: 16px; color: #E8D5C0; flex-shrink: 0; }
.cf-brand-name { font-family: 'Fraunces', serif; font-size: 15px; font-weight: 500; color: #E8D5C0; }
.cf-brand-sub { font-size: 10px; color: #8B6B47; letter-spacing: 0.1em; text-transform: uppercase; }
.cf-chips { display: flex; gap: 6px; }
.cf-chip { font-size: 9px; letter-spacing: 0.12em; text-transform: uppercase; padding: 4px 10px; border-radius: 20px; border: 1px solid #3D2B1A; color: #6B4E35; transition: all 0.3s; }
.cf-chip.active { background: #C4622D; border-color: #C4622D; color: #FBF8F3; }
.cf-chip.done { background: #2C3E2E; border-color: #3D5C40; color: #7CB88E; }
@media (max-width: 580px) { .cf-chips { display: none; } .cf-topbar { padding: 14px 20px; } }
.cf-body { max-width: 760px; margin: 0 auto; padding: 40px 24px 64px; }
.ph-head { text-align: center; margin-bottom: 32px; }
.ph-eye { font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; color: #C4622D; margin-bottom: 10px; }
.ph-title { font-family: 'Fraunces', serif; font-size: clamp(22px, 4vw, 34px); font-weight: 500; color: #2C1A0E; line-height: 1.2; margin-bottom: 10px; }
.ph-sub { font-size: 13px; color: #9C8068; line-height: 1.65; max-width: 500px; margin: 0 auto; }
.pb-wrap { margin-bottom: 32px; }
.pb-meta { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.pb-label { font-size: 11px; color: #9C8068; letter-spacing: 0.08em; }
.pb-pct { font-family: 'Fraunces', serif; font-size: 14px; color: #C4622D; }
.pb-track { height: 4px; background: #E8DDD0; border-radius: 4px; overflow: hidden; }
.pb-fill { height: 100%; background: linear-gradient(90deg, #C4622D, #E8855A); border-radius: 4px; transition: width 0.6s cubic-bezier(0.4,0,0.2,1); }
.scard { background: #FFF; border-radius: 16px; border: 1px solid #E8DDD0; padding: 36px 40px; margin-bottom: 20px; }
.scard:focus-within { border-color: rgba(196,98,45,0.35); box-shadow: 0 0 0 3px rgba(196,98,45,0.06); }
@media (max-width: 580px) { .scard { padding: 24px 20px; } .cf-body { padding: 28px 16px 50px; } }
.sc-header { display: flex; align-items: flex-start; gap: 14px; margin-bottom: 20px; }
.sc-num { width: 32px; height: 32px; border-radius: 50%; background: #FBF3ED; border: 1.5px solid #E8C5A8; display: flex; align-items: center; justify-content: center; font-family: 'Fraunces', serif; font-size: 13px; font-weight: 500; color: #C4622D; flex-shrink: 0; margin-top: 2px; }
.sc-eye { font-size: 9px; letter-spacing: 0.18em; text-transform: uppercase; color: #C4622D; margin-bottom: 4px; }
.sc-title { font-family: 'Fraunces', serif; font-size: 19px; font-weight: 500; color: #2C1A0E; line-height: 1.25; }
.sc-hint { background: #FBF8F3; border-radius: 8px; padding: 12px 16px; font-size: 12px; color: #8B6B47; line-height: 1.7; margin-bottom: 18px; border-left: 3px solid #E8C5A8; }
.sc-hint strong { color: #6B4E35; }
textarea.inp, input.inp { width: 100%; background: #FDFBF8; border: 1.5px solid #E8DDD0; border-radius: 10px; padding: 14px 18px; font-family: 'DM Sans', sans-serif; font-size: 14px; color: #2C1A0E; outline: none; resize: vertical; line-height: 1.65; transition: border-color 0.2s; min-height: 130px; }
input.inp { min-height: auto; height: 46px; resize: none; }
textarea.inp:focus, input.inp:focus { border-color: #C4622D; background: #FFFCF9; }
textarea.inp::placeholder, input.inp::placeholder { color: #C4B5A5; font-style: italic; }
.c2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
@media (max-width: 480px) { .c2 { grid-template-columns: 1fr; } }
.fw { margin-bottom: 14px; }
.fl { font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: #9C8068; display: block; margin-bottom: 7px; }
.req { color: #C4622D; margin-left: 3px; }
.char-row { display: flex; justify-content: flex-end; margin-top: 5px; }
.char-ct { font-size: 10px; color: #C4B5A5; }
.ai-row { display: flex; justify-content: flex-end; margin-top: 12px; }
.ai-btn { display: flex; align-items: center; gap: 7px; background: transparent; border: 1.5px solid #E8DDD0; border-radius: 20px; padding: 7px 16px; font-family: 'DM Sans', sans-serif; font-size: 11px; color: #8B6B47; cursor: pointer; transition: all 0.2s; }
.ai-btn:hover:not(:disabled) { border-color: rgba(196,98,45,0.35); color: #C4622D; background: #FBF3ED; }
.ai-btn:disabled { opacity: 0.5; cursor: default; }
.hint-panel { margin-top: 16px; background: linear-gradient(135deg, #FBF8F3, #FFF9F5); border: 1.5px solid #E8C5A8; border-radius: 12px; padding: 20px 22px; }
.hp-label { font-size: 9px; letter-spacing: 0.18em; text-transform: uppercase; color: #C4622D; margin-bottom: 12px; }
.hp-text { font-size: 13px; color: #6B4E35; line-height: 1.8; white-space: pre-wrap; }
.nav-bar { display: flex; justify-content: space-between; align-items: center; padding-top: 28px; margin-top: 8px; }
.btn-back { background: transparent; border: 1.5px solid #E8DDD0; border-radius: 8px; padding: 11px 22px; font-family: 'DM Sans', sans-serif; font-size: 13px; color: #9C8068; cursor: pointer; transition: all 0.2s; }
.btn-back:hover { border-color: #C4B5A5; color: #6B4E35; }
.btn-p { background: #C4622D; border: none; border-radius: 8px; padding: 12px 28px; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 500; color: #FBF8F3; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 8px; }
.btn-p:hover:not(:disabled) { background: #A84E22; }
.btn-p:disabled { background: #E8C5A8; color: #BDA08A; cursor: not-allowed; }
.btn-green { background: #3D7A5C; }
.btn-green:hover:not(:disabled) { background: #2E5E46; }
.spin-ring { width: 48px; height: 48px; border: 3px solid #E8DDD0; border-top-color: #C4622D; border-radius: 50%; animation: spin 0.9s linear infinite; margin: 0 auto 20px; }
@keyframes spin { to { transform: rotate(360deg); } }
.qq-why { font-size: 11px; color: #C4622D; font-style: italic; margin-bottom: 8px; }
.qq-q { font-family: 'Fraunces', serif; font-size: 17px; font-weight: 500; color: #2C1A0E; line-height: 1.3; margin-bottom: 16px; }
.rv-sec { background: #FFF; border-radius: 14px; border: 1px solid #E8DDD0; padding: 24px 28px; margin-bottom: 14px; }
.rv-lbl { font-size: 9px; letter-spacing: 0.18em; text-transform: uppercase; color: #C4622D; margin-bottom: 8px; display: flex; align-items: center; gap: 8px; }
.rv-lbl::after { content: ''; flex: 1; height: 1px; background: #E8DDD0; }
.rv-title { font-family: 'Fraunces', serif; font-size: 15px; font-weight: 500; color: #6B4E35; margin-bottom: 8px; }
.rv-ans { font-size: 13px; color: #2C1A0E; line-height: 1.75; white-space: pre-wrap; }
.rv-empty { font-size: 13px; color: #C4B5A5; font-style: italic; }
.ris { background: #FBF3ED; border: 1px solid #E8C5A8; border-radius: 12px; padding: 18px 22px; margin-bottom: 24px; display: flex; gap: 16px; flex-wrap: wrap; }
.ri { flex: 1; min-width: 140px; }
.ri-l { font-size: 9px; letter-spacing: 0.14em; text-transform: uppercase; color: #C4622D; margin-bottom: 4px; }
.ri-v { font-size: 14px; font-weight: 500; color: #2C1A0E; }
.sub-note { text-align: center; font-size: 12px; color: #9C8068; line-height: 1.65; margin-top: 20px; padding: 16px 20px; background: #FBF8F3; border-radius: 10px; border: 1px solid #E8DDD0; }
.submitting-overlay { text-align: center; padding: 60px 24px; }
.so-title { font-family: 'Fraunces', serif; font-size: 22px; font-weight: 500; color: #2C1A0E; margin-bottom: 10px; }
.so-sub { font-size: 13px; color: #9C8068; line-height: 1.65; }
`;

const SECTIONS = [
  {
    id: "accomplishments",
    eyebrow: "Since Our Last Call",
    title: "What wins, actions, or progress have you made?",
    hint: "<strong>Big or small — it all counts.</strong> Did you analyze a deal? Have a seller conversation? Set up a system? Make a call you were avoiding? Even mindset shifts count. Write it all down.",
    placeholder: "e.g. I drove for dollars three times this week, analyzed two properties using the Exit First Framework, and finally had a seller conversation I'd been putting off...",
    aiPrompt: "A real estate investing coaching student is stuck on 'accomplishments since our last call'. Give them 5 short encouraging prompting questions specific to real estate investing actions — deal analysis, offers, seller conversations, marketing, mindset. Numbered. Plain text, no symbols."
  },
  {
    id: "topics",
    eyebrow: "Today's Agenda",
    title: "What topics or situations do you most want to work through today?",
    hint: "<strong>Think about what's been taking up the most mental space.</strong> Specific deals, seller scenarios, strategy confusion, fear, marketing, numbers — everything is fair game. List as many as you want.",
    placeholder: "e.g. I have a deal I can't figure out how to structure. I'm stuck on what to say when sellers ask what I'll do with the property. And I want to talk through whether BRRRR makes sense for my market...",
    aiPrompt: "A real estate investing student needs help listing coaching topics. Give 8 common areas beginners to mid-level investors bring to coaching — strategy, deal structure, seller conversations, fear, marketing, systems, numbers. Numbered. Plain text only."
  },
  {
    id: "priority",
    eyebrow: "Your Highest Priority",
    title: "If we only had 15 minutes — what is the ONE thing you need most from this call?",
    hint: "<strong>Be as specific as you can.</strong> What would make you walk away from this call feeling clear and unstuck? This tells me where to focus our time together.",
    placeholder: "e.g. I need to decide whether to make an offer on a deal I've been sitting on for two weeks. I keep second-guessing myself and I need either validation or a push forward...",
    aiPrompt: "A real estate investor can't name their single most important coaching priority. Give them 3 short direct questions they can ask themselves to figure out what they most need right now. Plain text, numbered."
  },
  {
    id: "questions",
    eyebrow: "Specific Questions",
    title: "What specific questions are you bringing to the call?",
    hint: "<strong>Write them out clearly.</strong> The more specific your question, the more useful my answer. 'How do I respond when a seller says their price is firm?' is workable. 'What should I do?' is not.",
    placeholder: "e.g. 1. How do I know when a deal is dead vs. needs a different structure? 2. What do I say when a seller asks how I found them? 3. Am I ready for multi-family?",
    aiPrompt: "A real estate investor needs question examples for their coaching call. Give 8 specific coaching questions beginners to intermediate investors commonly ask — about deals, negotiation, strategy, fear, momentum. Numbered. Plain text only."
  },
  {
    id: "review",
    eyebrow: "Bring It to the Table",
    title: "Is there anything specific you want me to look at with you?",
    hint: "<strong>This is your time.</strong> A deal to run numbers on? A contract to review? A script that isn't working? A seller situation to role-play? Share the details here and we'll dig in.",
    placeholder: "e.g. Property at 123 Elm St — ARV ~$285k, asking $220k, needs ~$40k work. I want to run it through the Exit First Framework together. OR: Nothing specific this week.",
    aiPrompt: "What can a real estate investor bring to a coaching call for review? Give 6 specific things — deals, documents, scripts, numbers, situations — that a coach can help analyze. Numbered. Plain text only."
  },
  {
    id: "next30",
    eyebrow: "Looking Ahead",
    title: "What are you working toward over the next 30 days?",
    hint: "<strong>What does a meaningful win look like for you this month?</strong> Think deals, offers, income, skills, or habits. Where do you want to be 30 days from today?",
    placeholder: "e.g. Make 5 offers on off-market properties. Close my first wholesale deal. Get a consistent follow-up system running so I stop losing leads...",
    aiPrompt: "Help a real estate investor think through 30-day goals. Give 6 specific measurable milestones for a beginner to intermediate investor — deal-finding, offers, closings, marketing, system-building. Numbered. Plain text only."
  },
  {
    id: "unfinished",
    eyebrow: "Checking In",
    title: "Did you have any commitments from our last call that didn't get done?",
    hint: "<strong>No judgment — none at all.</strong> Naming what didn't happen is often more valuable than what did. This is a safe space. We'll figure out together what's really in the way.",
    placeholder: "e.g. I committed to 3 offers but only sent one. I kept second-guessing my numbers. OR: Everything complete — here's what I finished: ...",
    aiPrompt: "A real estate investor is trying to remember unfinished commitments from their last coaching call. Give 6 common action items coaches typically assign between sessions — so they can jog their memory. Numbered. Plain text only."
  }
];

const PH = { AGENDA: "agenda", QUALIFY: "qualify", REVIEW: "review", SUBMITTING: "submitting" };

const callAPI = async (body) => {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("API error");
  return res.json();
};

export default function CoachingForm({ onComplete }) {
  const [phase, setPhase] = useState(PH.AGENDA);
  const [agendaStep, setAgendaStep] = useState(0);
  const [contact, setContact] = useState({ name: "", email: "", phone: "", callNum: "" });
  const [answers, setAnswers] = useState({});
  const [hints, setHints] = useState({});
  const [loadingHint, setLoadingHint] = useState(null);
  const [qualQs, setQualQs] = useState(null);
  const [loadingQual, setLoadingQual] = useState(false);
  const [qualAnswers, setQualAnswers] = useState({});
  const topRef = useRef(null);

  const current = SECTIONS[agendaStep];
  const totalSteps = SECTIONS.length;

  const scroll = () => setTimeout(() => topRef.current?.scrollIntoView({ behavior: "smooth" }), 60);

  const setContact_ = (id, val) => setContact(p => ({ ...p, [id]: val }));
  const setAnswer = (id, val) => setAnswers(p => ({ ...p, [id]: val }));

  const isValidEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  const isValidPhone = (p) => !p || /^\+?[\d\s\-\(\)]{10,}$/.test(p);

  const canNext = () => {
    const hasContact = contact.name.trim() && isValidEmail(contact.email) && isValidPhone(contact.phone);
    const hasAnswer = (answers[current?.id] || "").trim().length > 5;
    if (agendaStep === 0) return hasContact && hasAnswer;
    return hasAnswer;
  };

  const getHint = async () => {
    if (loadingHint || hints[current.id]) return;
    setLoadingHint(current.id);
    try {
      const data = await callAPI({
        model: "claude-sonnet-4-20250514",
        max_tokens: 600,
        system: "You are a warm real estate investing coach. Plain text only. Numbered lists. No markdown. No asterisks.",
        messages: [{ role: "user", content: current.aiPrompt }],
      });
      setHints(p => ({ ...p, [current.id]: data.content?.[0]?.text || "Think about what took the most mental energy this week." }));
    } catch {
      setHints(p => ({ ...p, [current.id]: "Think about what took the most mental energy this week — that's usually where your answer lives." }));
    } finally { setLoadingHint(null); }
  };

  const buildSummary = () =>
    SECTIONS.map(s => `${s.eyebrow.toUpperCase()}: ${answers[s.id] || "not provided"}`).join("\n\n");

  const loadQual = async () => {
    setLoadingQual(true);
    try {
      const data = await callAPI({
        model: "claude-sonnet-4-20250514",
        max_tokens: 900,
        system: `You are a skilled real estate investing coach preparing for a student's coaching call. Read their agenda and generate 3 targeted follow-up questions that go one layer deeper — specific to what they actually wrote, not generic. Return ONLY valid JSON, no other text:
{"questions":[{"question":"...","why":"brief reason (5-8 words, lowercase)","id":"q0"},{"question":"...","why":"...","id":"q1"},{"question":"...","why":"...","id":"q2"}]}`,
        messages: [{ role: "user", content: `Student agenda:\n\n${buildSummary()}\n\nGenerate 3 targeted qualifying follow-up questions.` }],
      });
      const raw = data.content?.[0]?.text || "{}";
      const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
      setQualQs(parsed.questions || []);
    } catch {
      setQualQs([
        { question: "When you picture a 'successful' outcome from this call, what would that look like specifically?", why: "clarifies what winning looks like", id: "q0" },
        { question: "What's the story you've been telling yourself about why the next step hasn't happened yet?", why: "surfaces the real block", id: "q1" },
        { question: "What would you need to believe to be true in order to take action in the next 7 days?", why: "identifies belief barriers", id: "q2" },
      ]);
    } finally { setLoadingQual(false); }
  };

  const BOOKING_URL = "https://api.leadconnectorhq.com/widget/bookings/talktokelli";

  const handleSubmit = async () => {
    setPhase(PH.SUBMITTING);
    scroll();

    try {
      await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contact, answers, qualQs, qualAnswers }),
      });
    } catch (e) {
      console.warn("Send email error:", e);
    }

    // Redirect straight to booking — no waiting
    window.location.href = BOOKING_URL;
  };

  const phaseNum = phase === PH.AGENDA ? 1 : phase === PH.QUALIFY ? 2 : 3;

  return (
    <>
      <style>{css}</style>
      <div className="cf-root" ref={topRef}>
        <div className="cf-topbar">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div className="cf-logo">K</div>
            <div>
              <div className="cf-brand-name">Kelli Owens</div>
              <div className="cf-brand-sub">Real Estate Coach</div>
            </div>
          </div>
          <div className="cf-chips">
            {["Agenda", "Qualify", "Review"].map((l, i) => (
              <div key={l} className={`cf-chip ${phaseNum === i + 1 ? "active" : phaseNum > i + 1 ? "done" : ""}`}>{l}</div>
            ))}
          </div>
        </div>

        {phase === PH.SUBMITTING && (
          <div className="cf-body">
            <div className="submitting-overlay">
              <div className="spin-ring" />
              <div className="so-title">Submitting your agenda...</div>
              <p className="so-sub">Sending your notes to Kelli and taking you<br />straight to the booking calendar.</p>
            </div>
          </div>
        )}

        {phase === PH.AGENDA && (
          <div className="cf-body">
            <div className="ph-head">
              <div className="ph-eye">Step 1 of 3 — Your Agenda</div>
              <h2 className="ph-title">Tell me where things stand.</h2>
              <p className="ph-sub">Answer each section honestly. There are no wrong answers. This is your call.</p>
            </div>

            <div className="pb-wrap">
              <div className="pb-meta">
                <span className="pb-label">{current.eyebrow}</span>
                <span className="pb-pct">{agendaStep + 1} / {totalSteps}</span>
              </div>
              <div className="pb-track">
                <div className="pb-fill" style={{ width: `${((agendaStep + 1) / totalSteps) * 100}%` }} />
              </div>
            </div>

            {agendaStep === 0 && (
              <div className="scard">
                <div className="sc-header">
                  <div className="sc-num">→</div>
                  <div>
                    <div className="sc-eye">First, a bit about you</div>
                    <div className="sc-title">Let's get the basics</div>
                  </div>
                </div>
                <div className="sc-hint">So I know who's on the call and can match this to your coaching file.</div>
                <div className="c2">
                  {[["name","Full Name",true,"text","Your full name"],["email","Email Address",true,"email","your@email.com"],["phone","Best Phone Number",false,"tel","(555) 555-5555"],["callNum","Which coaching call is this?",false,"text","e.g. Call #1, Call #4..."]].map(([id,label,req,type,ph]) => (
                    <div key={id} className="fw">
                      <label className="fl">{label}{req && <span className="req">*</span>}</label>
                      <input
                        className="inp"
                        type={type}
                        placeholder={ph}
                        value={contact[id]}
                        onChange={e => setContact_(id, e.target.value)}
                        style={
                          (id === "email" && contact.email && !isValidEmail(contact.email)) ||
                          (id === "phone" && contact.phone && !isValidPhone(contact.phone))
                            ? { borderColor: "#C4622D" } : {}
                        }
                      />
                      {id === "email" && contact.email && !isValidEmail(contact.email) && (
                        <div style={{ fontSize: 11, color: "#C4622D", marginTop: 4 }}>Please enter a valid email address</div>
                      )}
                      {id === "phone" && contact.phone && !isValidPhone(contact.phone) && (
                        <div style={{ fontSize: 11, color: "#C4622D", marginTop: 4 }}>Please enter a valid phone number (10+ digits)</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="scard">
              <div className="sc-header">
                <div className="sc-num">{agendaStep + 1}</div>
                <div>
                  <div className="sc-eye">{current.eyebrow}</div>
                  <div className="sc-title">{current.title}</div>
                </div>
              </div>
              <div className="sc-hint" dangerouslySetInnerHTML={{ __html: current.hint }} />
              <textarea
                className="inp"
                placeholder={current.placeholder}
                value={answers[current.id] || ""}
                onChange={e => setAnswer(current.id, e.target.value)}
                style={{ minHeight: 140 }}
              />
              <div className="char-row"><span className="char-ct">{(answers[current.id] || "").length} characters</span></div>
              <div className="ai-row">
                <button className="ai-btn" onClick={getHint} disabled={!!loadingHint || !!hints[current.id]}>
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><circle cx="6.5" cy="6.5" r="5.5" stroke="#C4622D" strokeWidth="1.1"/><path d="M6.5 4v2.5l1.8 1.1" stroke="#C4622D" strokeWidth="1.1" strokeLinecap="round"/></svg>
                  {loadingHint === current.id ? "Getting prompts..." : hints[current.id] ? "Prompts loaded ✓" : "I'm not sure what to write — help me think"}
                </button>
              </div>
              {hints[current.id] && (
                <div className="hint-panel">
                  <div className="hp-label">Prompts to get you unstuck</div>
                  <div className="hp-text">{hints[current.id]}</div>
                </div>
              )}
            </div>

            <div className="nav-bar">
              <button className="btn-back" onClick={() => { if (agendaStep > 0) { setAgendaStep(s => s - 1); scroll(); } }}>
                {agendaStep > 0 ? "← Back" : ""}
              </button>
              {agendaStep < totalSteps - 1 ? (
                <button className="btn-p" disabled={!canNext()} onClick={() => { setAgendaStep(s => s + 1); scroll(); }}>
                  Next Section →
                </button>
              ) : (
                <button className="btn-p" disabled={!canNext()} onClick={() => { setPhase(PH.QUALIFY); loadQual(); scroll(); }}>
                  Continue →
                </button>
              )}
            </div>
          </div>
        )}

        {phase === PH.QUALIFY && (
          <div className="cf-body">
            <div className="ph-head">
              <div className="ph-eye">Step 2 of 3 — Going Deeper</div>
              <h2 className="ph-title">A few follow-up questions.</h2>
              <p className="ph-sub">Based on what you shared, I want to dig a little deeper. Answer what you can — this helps me arrive prepared.</p>
            </div>

            {loadingQual ? (
              <div style={{ textAlign: "center", padding: "60px 24px" }}>
                <div className="spin-ring" />
                <div style={{ fontFamily: "'Fraunces', serif", fontSize: 20, color: "#2C1A0E", marginBottom: 8 }}>Reading your agenda...</div>
                <div style={{ fontSize: 13, color: "#9C8068" }}>Generating follow-up questions based on what you shared.</div>
              </div>
            ) : qualQs && (
              <>
                {qualQs.map((q, i) => (
                  <div key={q.id} className="scard">
                    <div className="qq-why">Asking because: {q.why}</div>
                    <div className="qq-q">{i + 1}. {q.question}</div>
                    <textarea className="inp" placeholder="Take your time..." value={qualAnswers[q.id] || ""} onChange={e => setQualAnswers(p => ({ ...p, [q.id]: e.target.value }))} style={{ minHeight: 110 }} />
                  </div>
                ))}
                <div className="nav-bar">
                  <button className="btn-back" onClick={() => { setPhase(PH.AGENDA); setAgendaStep(totalSteps - 1); scroll(); }}>← Back</button>
                  <button className="btn-p" onClick={() => { setPhase(PH.REVIEW); scroll(); }}>Review My Agenda →</button>
                </div>
              </>
            )}
          </div>
        )}

        {phase === PH.REVIEW && (
          <div className="cf-body">
            <div className="ph-head">
              <div className="ph-eye">Step 3 of 3 — Review & Send</div>
              <h2 className="ph-title">Here's what you've shared.</h2>
              <p className="ph-sub">Look this over. Go back if anything needs updating. When you're ready, submit.</p>
            </div>

            <div className="ris">
              {[["Name", contact.name], ["Email", contact.email], ["Phone", contact.phone || "—"], ["Call #", contact.callNum || "—"]].map(([l, v]) => (
                <div key={l} className="ri"><div className="ri-l">{l}</div><div className="ri-v">{v || "—"}</div></div>
              ))}
            </div>

            {SECTIONS.map((s, i) => (
              <div key={s.id} className="rv-sec">
                <div className="rv-lbl">Section {i + 1}</div>
                <div className="rv-title">{s.title}</div>
                {answers[s.id]?.trim() ? <div className="rv-ans">{answers[s.id]}</div> : <div className="rv-empty">Not provided</div>}
              </div>
            ))}

            {qualQs && qualQs.length > 0 && (
              <div className="rv-sec" style={{ background: "#FBF8F3", borderColor: "#E8C5A8" }}>
                <div className="rv-lbl" style={{ color: "#8B6B47" }}>Follow-Up Q&A</div>
                {qualQs.map((q, i) => (
                  <div key={q.id} style={{ marginBottom: i < qualQs.length - 1 ? 20 : 0 }}>
                    <div className="rv-title">{q.question}</div>
                    {qualAnswers[q.id]?.trim() ? <div className="rv-ans">{qualAnswers[q.id]}</div> : <div className="rv-empty">Not answered</div>}
                  </div>
                ))}
              </div>
            )}

            <div className="sub-note">
              When you submit, Kelli receives your full agenda automatically and you'll be taken straight to the booking calendar.
            </div>
            <div className="nav-bar">
              <button className="btn-back" onClick={() => { setPhase(PH.QUALIFY); scroll(); }}>← Back</button>
              <button className="btn-p btn-green" onClick={handleSubmit}>Submit My Agenda →</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
