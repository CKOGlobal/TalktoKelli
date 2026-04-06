import { useState } from "react";
import WelcomePage from "./components/WelcomePage.jsx";
import CoachingForm from "./components/CoachingForm.jsx";
import SuccessScreen from "./components/SuccessScreen.jsx";
import TermsAndPrivacy from "./components/TermsAndPrivacy.jsx";

export const PHASE = {
  WELCOME: "welcome",
  FORM: "form",
  SUCCESS: "success",
  LEGAL: "legal",
};

export default function App() {
  const [phase, setPhase] = useState(PHASE.WELCOME);
  const [submittedData, setSubmittedData] = useState(null);
  const [prevPhase, setPrevPhase] = useState(PHASE.WELCOME);

  const goLegal = () => {
    setPrevPhase(phase);
    setPhase(PHASE.LEGAL);
    window.scrollTo(0, 0);
  };

  const goBack = () => {
    setPhase(prevPhase);
    window.scrollTo(0, 0);
  };

  const handleFormComplete = (data) => {
    setSubmittedData(data);
    setPhase(PHASE.SUCCESS);
    window.scrollTo(0, 0);
  };

  if (phase === PHASE.LEGAL) {
    return (
      <div>
        <TermsAndPrivacy />
        <div style={{ textAlign: "center", padding: "16px", background: "#2C1A0E", marginTop: -1 }}>
          <button
            onClick={goBack}
            style={{ background: "transparent", border: "1.5px solid #3D2B1A", borderRadius: "8px", padding: "10px 24px", fontFamily: "'DM Sans', sans-serif", fontSize: "12px", color: "#8B6B47", cursor: "pointer", letterSpacing: "0.06em" }}
          >
            ← Back to TalkToKelli
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {phase === PHASE.WELCOME && (
        <WelcomePage onBegin={() => setPhase(PHASE.FORM)} onLegal={goLegal} />
      )}
      {phase === PHASE.FORM && (
        <CoachingForm onComplete={handleFormComplete} onLegal={goLegal} />
      )}
      {phase === PHASE.SUCCESS && (
        <SuccessScreen data={submittedData} onLegal={goLegal} />
      )}
    </>
  );
}
