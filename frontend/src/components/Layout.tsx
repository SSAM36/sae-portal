import { Outlet, Link } from "react-router-dom";
import { Users, LayoutDashboard } from "lucide-react";

export function Layout() {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center gap-2">
                <Users className="h-6 w-6 text-blue-600" />
                <span className="font-bold text-xl">SAE Portal</span>
              </div>
              <div className="hidden sm:-my-px sm:ml-6 sm:flex sm:space-x-8">
                <Link
                  to="/admin"
                  className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  Super Admin
                </Link>
                <div className="relative group flex items-center">
                  <span className="text-gray-500 cursor-pointer text-sm font-medium">Team Dashboards</span>
                  <div className="absolute top-10 w-48 bg-white border shadow rounded hidden group-hover:flex flex-col z-10">
                    <Link to="/team/formula-sae" className="px-4 py-2 hover:bg-gray-100 text-sm">Formula SAE</Link>
                    <Link to="/team/baja-sae" className="px-4 py-2 hover:bg-gray-100 text-sm">Baja SAE</Link>
                    <Link to="/team/aero-design" className="px-4 py-2 hover:bg-gray-100 text-sm">Aero Design</Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}
