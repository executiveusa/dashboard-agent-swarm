import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "@fontsource/inter";
import "@fontsource/space-grotesk";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
