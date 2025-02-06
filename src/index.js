// src/index.js
import React from "react";
import ReactDOM from "react-dom/client";
import LoanTracker from "./LoanTracker"; // Import the LoanTracker component
import "./index.css";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <LoanTracker />
  </React.StrictMode>
);
