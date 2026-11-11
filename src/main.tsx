import React from "react";
import ReactDOM from "react-dom/client";
import SocialApp from "./SocialApp";


const root = document.getElementById("root");
if (!root) throw new Error("Offline application root is missing.");

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <SocialApp />
  </React.StrictMode>,
);
