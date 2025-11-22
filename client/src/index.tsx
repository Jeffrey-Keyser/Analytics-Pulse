import React from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { getStore } from "./app/store";
import { ThemeProvider } from "@jeffrey-keyser/personal-ui-kit";
import { AnalyticsThemeProvider } from "./contexts/ThemeContext";
import { TemplateAuthProvider } from "./components/auth";
import { templateAuthSettings } from "./config/auth";
import App from "./App";
import "./index.css";

const container = document.getElementById("root")!;
const root = createRoot(container);
const store = getStore();

root.render(
  <React.StrictMode>
    <TemplateAuthProvider config={templateAuthSettings.provider}>
      <ThemeProvider children={
        <AnalyticsThemeProvider children={
          <Provider store={store} children={<App />} />
        } />
      } />
    </TemplateAuthProvider>
  </React.StrictMode>
);
