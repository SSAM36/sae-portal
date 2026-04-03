import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { Layout } from "./components/Layout.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import TeamDashboard from "./pages/TeamDashboard.jsx";
import { Login } from "./pages/Login.jsx";
import LogsDashboard from "./pages/LogsDashboard.jsx";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";

const ProtectedRoute = ({ allowedRoles = [] }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500">
        Checking access...
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/admin" replace />} />
          
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route path="admin" element={<AdminDashboard />} />
            <Route path="logs" element={<LogsDashboard />} />
          </Route>
          
          <Route element={<ProtectedRoute allowedRoles={['admin', 'team']} />}>
            <Route path="team/:teamName" element={<TeamDashboard />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
