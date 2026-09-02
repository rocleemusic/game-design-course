import React from "react";
import ReactDOM from "react-dom/client";
// Fonts ship locally via @fontsource — the spec bans runtime network calls,
// so never link Google Fonts here.
import "@fontsource/fraunces/400.css";
import "@fontsource/fraunces/600.css";
import "@fontsource/source-sans-3/400.css";
import "@fontsource/source-sans-3/600.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "@xyflow/react/dist/style.css";
import "./styles/tokens.css";
import "./styles/app.css";
// after app.css: the blueprint cards reuse a few of its rules (.card-text's
// 3-line clamp, .chip, .card-note) and override the rest for the dialogue canvas
import "./styles/blueprint.css";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
