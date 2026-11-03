import cmake from "highlight.js/lib/languages/cmake";
import dockerfile from "highlight.js/lib/languages/dockerfile";
import julia from "highlight.js/lib/languages/julia";
import latex from "highlight.js/lib/languages/latex";
import matlab from "highlight.js/lib/languages/matlab";
import verilog from "highlight.js/lib/languages/verilog";
import { common, createLowlight } from "lowlight";

// One highlighter for the editor and the published note, so code looks the same in both. Lowlight's common
// languages, plus the ones that turn up on the bench.
export const lowlight = createLowlight(common);
lowlight.register({ cmake, dockerfile, julia, latex, matlab, verilog });

// The languages a code cell can be set to, in the order the picker lists them. An empty value means plain text.
export const languages: { value: string; label: string }[] = [
  { value: "", label: "Plain text" },
  { value: "python", label: "Python" },
  { value: "typescript", label: "TypeScript" },
  { value: "javascript", label: "JavaScript" },
  { value: "c", label: "C" },
  { value: "cpp", label: "C++" },
  { value: "arduino", label: "Arduino" },
  { value: "rust", label: "Rust" },
  { value: "go", label: "Go" },
  { value: "java", label: "Java" },
  { value: "kotlin", label: "Kotlin" },
  { value: "swift", label: "Swift" },
  { value: "csharp", label: "C#" },
  { value: "julia", label: "Julia" },
  { value: "matlab", label: "MATLAB" },
  { value: "r", label: "R" },
  { value: "verilog", label: "Verilog" },
  { value: "bash", label: "Shell" },
  { value: "sql", label: "SQL" },
  { value: "json", label: "JSON" },
  { value: "yaml", label: "YAML" },
  { value: "xml", label: "HTML / XML" },
  { value: "css", label: "CSS" },
  { value: "markdown", label: "Markdown" },
  { value: "latex", label: "LaTeX" },
  { value: "cmake", label: "CMake" },
  { value: "dockerfile", label: "Dockerfile" },
  { value: "diff", label: "Diff" },
];

export const languageLabel = (value: string | null | undefined) => languages.find((l) => l.value === (value ?? ""))?.label ?? value ?? "Plain text";
