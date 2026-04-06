import { useState } from "react";
import WelcomePage from "./components/WelcomePage.jsx";
import CoachingForm from "./components/CoachingForm.jsx";
import SuccessScreen from "./components/SuccessScreen.jsx";

export const PHASE = {
  WELCOME: "welcome",
  FORM: "form",
  SUCCESS: "success",
};

export default function App() {
  const [phase, setPhase] = useState(PHASE.WELCOME);
  const [submittedData, setSubmittedData] = useState(null);

  const handleFormComplete = (data) => {
    setSubmittedData(data);
    setPhase(PHASE.SUCCESS);
  };

  return (
    <>
      {phase === PHASE.WELCOME && (
        <WelcomePage onBegin={() => setPhase(PHASE.FORM)} />
      )}
      {phase === PHASE.FORM && (
        <CoachingForm onComplete={handleFormComplete} />
      )}
      {phase === PHASE.SUCCESS && (
        <SuccessScreen data={submittedData} />
      )}
    </>
  );
}
