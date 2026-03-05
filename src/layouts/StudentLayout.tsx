import { useState } from "react";
import { Outlet } from "react-router-dom";
import StudentHeader from "../components/StudentHeader";
import StudentSidebar from "../components/StudentSidebar";

export default function StudentLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <StudentSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main */}
      <div className="flex-1 flex flex-col">
        <StudentHeader onMenuClick={() => setSidebarOpen(true)} />

        <main className="flex-1 p-6 bg-gray-50 overflow-auto">
          {/* Close sidebar when clicking on main content on mobile */}
          <div onClick={() => setSidebarOpen(false)}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
