import React from "react";
import ReactDOM from "react-dom/client";
import { MantineProvider, createTheme } from "@mantine/core";
import { SearchOverlayApp } from "./components/search/SearchOverlay";

import "@mantine/core/styles.css";

const theme = createTheme({
  primaryColor: "blue",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  fontFamilyMonospace:
    '"SF Mono", "Fira Code", "Fira Mono", Menlo, Consolas, monospace',
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <MantineProvider theme={theme} defaultColorScheme="auto">
      <SearchOverlayApp />
    </MantineProvider>
  </React.StrictMode>
);
