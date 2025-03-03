import { useState } from "react";
import AudioUploader from "./components/AudioUploader";
import AudioVisualizer from "./components/AudioVisualizer";
import ProjectPage from "./ProjectPage";
import "./App.css";

const App = () => {
  const [bpmData, setBpmData] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);

  return (
    <div>
      <ProjectPage />
    </div>
  );
};

export default App;
