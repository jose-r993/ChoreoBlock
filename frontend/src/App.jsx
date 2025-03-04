import { useState } from "react";
import ProjectPage from "./ProjectPage";
import "./App.css";

const App = () => {
  const [bpmData, setBpmData] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);

  return <ProjectPage />;
};

export default App;
