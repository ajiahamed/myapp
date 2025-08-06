import React, { useEffect } from "react";
import "./App.css"; // Make sure this file contains your CSS

const App = () => {
  useEffect(() => {
    // Fade-in animation after mount
    const container = document.querySelector(".container");
    if (container) {
      container.style.opacity = 1;
      container.style.transform = "translateY(0)";
      container.style.transition = "all 0.6s ease-out";
    }
  }, []);

  const envVars = Object.keys(process.env)
    .filter((key) => key.startsWith("REACT_APP_"))
    .map((key) => ({ key, value: process.env[key] }));

  return (
    <div className="container">
      <h1>.env Variables</h1>
      {envVars.length > 0 ? (
        <ul style={{ listStyleType: "none", padding: 0 }}>
          {envVars.map(({ key, value }) => (
            <li key={key}>
              <strong>{key}:</strong> {value}
            </li>
          ))}
        </ul>
      ) : (
        <p>No REACT_APP_* variables found.</p>
      )}
    </div>
  );
};

export default App;

