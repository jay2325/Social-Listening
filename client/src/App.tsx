import { Routes, Route } from "react-router-dom";
import { BrandProvider } from "./contexts/BrandContext";
import { Shell } from "./components/layout/Shell";
import { Overview } from "./pages/Overview";
import { MentionsFeed } from "./pages/MentionsFeed";

export default function App() {
  return (
    <BrandProvider>
      <Routes>
        {/* All dashboard routes share the Shell layout */}
        <Route element={<Shell />}>
          <Route index           element={<Overview />} />
          <Route path="mentions" element={<MentionsFeed />} />
        </Route>
      </Routes>
    </BrandProvider>
  );
}
