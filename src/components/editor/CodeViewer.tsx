import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { rust } from "@codemirror/lang-rust";
import { json } from "@codemirror/lang-json";
import { sql } from "@codemirror/lang-sql";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { markdown } from "@codemirror/lang-markdown";
import type { Extension } from "@codemirror/state";

const languageExtensions: Record<string, () => Extension> = {
  javascript: () => javascript(),
  typescript: () => javascript({ typescript: true }),
  json: () => json(),
  python: () => python(),
  rust: () => rust(),
  sql: () => sql(),
  html: () => html(),
  css: () => css(),
  markdown: () => markdown(),
  bash: () => javascript(), // fallback with some highlighting
};

function getExtensions(language: string): Extension[] {
  const factory = languageExtensions[language];
  return factory ? [factory()] : [];
}

interface CodeViewerProps {
  value: string;
  language?: string;
  maxHeight?: string;
  editable?: boolean;
  onChange?: (value: string) => void;
}

export function CodeViewer({
  value,
  language = "",
  maxHeight = "400px",
  editable = false,
  onChange,
}: CodeViewerProps) {
  return (
    <CodeMirror
      value={value}
      extensions={getExtensions(language)}
      editable={editable}
      readOnly={!editable}
      onChange={onChange}
      basicSetup={{
        lineNumbers: true,
        foldGutter: false,
        highlightActiveLine: editable,
      }}
      style={{ fontSize: 13, maxHeight, overflow: "auto" }}
      theme="dark"
    />
  );
}
