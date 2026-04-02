import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./components/Layout";
import { AdminDashboard } from "./pages/AdminDashboard";
import { TeamDashboard } from "./pages/TeamDashboard";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/admin" replace />} />
          <Route path="admin" element={<AdminDashboard />} />
          <Route path="team/:teamId" element={<TeamDashboard />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
