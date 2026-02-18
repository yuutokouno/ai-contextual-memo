import React from "react";
import ReactDOM from "react-dom/client";
import { Providers } from "@/app";
import { MemoPage } from "@/pages/memo";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Providers>
      <MemoPage />
    </Providers>
  </React.StrictMode>,
);
