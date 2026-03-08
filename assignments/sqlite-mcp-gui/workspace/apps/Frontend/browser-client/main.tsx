import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./main.css";
// TODO: Document `https://bun.com/docs/bundler/fullstack` into `/docs/stack/bun`
// TODO: investigate the usage of SECRETS and bun SECRETS https://bun.com/docs/runtime/secrets
const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Failed to find the root element");
ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
