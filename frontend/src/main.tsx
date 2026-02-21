import React from "react";
import ReactDOM from "react-dom/client";
import { Providers } from "@/app";
import { App } from "@/app/app";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Providers>
      <App />
    </Providers>
  </React.StrictMode>,
);
