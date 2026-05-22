import { Routes, Route } from "react-router-dom";

export default function App() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <Routes>
        <Route
          path="/"
          element={
            <div className="flex items-center justify-center min-h-screen">
              <div className="text-center space-y-3">
                <div className="text-4xl font-bold text-indigo-400">
                  PulseBoard
                </div>
                <div className="text-zinc-500 text-sm">
                  Phase 1 — Pipeline running. Dashboard coming in Phase 2.
                </div>
              </div>
            </div>
          }
        />
      </Routes>
    </div>
  );
}
