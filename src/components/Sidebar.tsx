import { NavLink } from "react-router-dom";
import {
  FiHome,
  FiUpload,
  FiBookOpen,
  FiBarChart2,
  FiLogOut,
  FiUser,
  FiMenu,
  FiChevronLeft,
} from "react-icons/fi";
import { useState, type JSX } from "react";
import { useAuth } from "../context/AuthContext";

interface MenuItem {
  name: string;
  path: string;
  icon: JSX.Element;
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({
  isOpen,
  onClose,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();

  const menuItems: MenuItem[] = [
    { name: "Dashboard", path: "/", icon: <FiHome size={18} /> },
    { name: "Import Data", path: "/import-data", icon: <FiUpload size={18} /> },
    { name: "Class Tracker", path: "/class-tracker", icon: <FiBookOpen size={18} /> },
    { name: "Report", path: "/report", icon: <FiBarChart2 size={18} /> },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed z-50 top-0 left-0 h-full bg-white border-r border-gray-400 shadow-lg transform transition-all duration-300 flex flex-col
        ${collapsed ? "w-17" : "w-64"}
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0 lg:static lg:shadow-none`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-400">
          {!collapsed && (
            <span className="text-lg font-bold whitespace-nowrap truncate">Logging System</span>
          )}
          <button
            onClick={() => {
              if (window.innerWidth < 1024) {
                onClose(); // mobile → fully close
              } else {
                setCollapsed(!collapsed); // desktop → collapse width
              }
            }}
            className="p-2 rounded hover:bg-gray-100"
          >
            {collapsed ? <FiMenu size={18} /> : <FiChevronLeft size={18} />}
          </button>
        </div>

        {/* User Info */}
        <div className="flex items-center gap-3 p-4 border-b border-gray-400">
          <div className="bg-gray-200 p-2 rounded-full">
            <FiUser size={18} />
          </div>
          {!collapsed && (
            <span className="font-medium whitespace-nowrap truncate">{user?.displayName}</span>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-2">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg transition h-12 ${isActive
                  ? "bg-blue-600 text-white"
                  : "hover:bg-gray-100"
                }`
              }
            >
              <span className="flex-shrink-0">
                {item.icon}
              </span>

              {!collapsed && (
                <span className="whitespace-nowrap truncate">
                  {item.name}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-3 mt-auto border-t border-gray-400">
          <button
            onClick={() => logout()}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-red-100 text-red-600 transition"
          >
            <FiLogOut size={18} />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
}