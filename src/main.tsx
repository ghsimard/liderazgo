import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

console.log("[main.tsx] Mounting React app...");
const root = document.getElementById("root");
if (root) {
  createRoot(root).render(<App />);
  console.log("[main.tsx] React app mounted successfully");
} else {
  console.error("[main.tsx] #root element not found!");
}
