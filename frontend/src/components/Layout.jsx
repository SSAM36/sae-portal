import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Users, UserCog, MonitorSmartphone, PenTool, TerminalSquare, LogOut, Code, Package, Cog, Cpu, Wrench, Menu, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { logActivity } from "../utils/logger";
import { TEAM_DEFINITIONS, getTeamByRouteId } from "../data/interviewTeams";
import { useEffect, useState } from "react";

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await logActivity(user.username, `Logged out`);
    await logout();
    navigate("/login");
  };

  const adminNav = [
    { name: "Admin Console", href: "/admin", icon: LayoutDashboard },
    { name: "System Logs", href: "/logs", icon: TerminalSquare },
  ];

  const teamIcons = [MonitorSmartphone, PenTool, Users, Cpu, Code, Wrench, Cog, Package, LayoutDashboard, MonitorSmartphone, TerminalSquare];

  const teamNav = TEAM_DEFINITIONS.map((team, index) => ({
    id: team.routeId,
    name: team.displayName,
    href: `/team/${team.routeId}`,
    icon: teamIcons[index] || MonitorSmartphone,
  }));

  const visibleNav = user?.role === 'admin' 
    ? [...adminNav, ...teamNav] 
    : teamNav.filter((team) => team.id === user?.team);

  const activeTeam = getTeamByRouteId(location.pathname.split('/').pop())?.displayName;

  return (
    <div className="flex min-h-dvh bg-slate-50 text-slate-900 font-sans antialiased overflow-hidden">
      {mobileNavOpen ? (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setMobileNavOpen(false)}
          className="fixed inset-0 z-30 bg-slate-900/40 md:hidden"
        />
      ) : null}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 h-dvh w-72 bg-white border-r border-slate-200 flex flex-col shadow-sm transform transition-transform duration-200 ${mobileNavOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        <div className="h-16 flex items-center px-6 border-b border-slate-100">
          <div className="flex items-center gap-3 text-blue-600">
            <Users className="w-6 h-6" />
            <span className="text-xl font-bold tracking-tight">DJS Interview Hub</span>
          </div>
          <button
            type="button"
            onClick={() => setMobileNavOpen(false)}
            className="ml-auto rounded-md p-2 text-slate-500 hover:bg-slate-100 md:hidden"
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 min-h-0 px-4 py-6 space-y-2 overflow-y-auto">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 px-2">Dashboards</div>
          {visibleNav.map((item) => {
            const isActive = location.pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <Icon
                  className={`w-5 h-5 transition-colors ${
                    isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-700"
                  }`}
                />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="shrink-0 p-4 border-t border-slate-100 flex flex-col gap-2">
          <div className="flex items-center gap-3 px-3 py-2 bg-slate-50 rounded-lg border border-slate-100">
            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs uppercase">
              {user?.username?.substring(0, 2) || 'OP'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate capitalize">{user?.username}</p>
              <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider truncate">{user?.role}</p>
            </div>
            <UserCog className="w-4 h-4 text-slate-400" />
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 w-full text-sm font-medium text-slate-600 bg-white hover:bg-red-50 hover:text-red-700 border border-slate-200 hover:border-red-200 py-2 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-50/50 md:pl-72">
        <header className="h-16 bg-white/80 backdrop-blur border-b border-slate-200 flex items-center px-4 md:px-8 z-10 sticky top-0 justify-between gap-3">
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            className="rounded-md p-2 text-slate-500 hover:bg-slate-100 md:hidden"
            aria-label="Open navigation"
          >
            <Menu className="w-5 h-5" />
          </button>

          <h2 className="text-xs md:text-sm font-medium text-slate-500 min-w-0 truncate">
            {location.pathname.includes('/admin') || location.pathname.includes('/logs') ? 'Administration' : 'Team Hub'}
            <span className="mx-2 text-slate-300">/</span>
            <span className="text-slate-900 capitalize">
              {activeTeam || user?.teamLabel || location.pathname.split('/').pop()}
            </span>
          </h2>
        </header>

        <div className="flex-1 p-3 md:p-6 lg:p-8 overflow-y-auto w-full max-w-[1600px] mx-auto relative">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
