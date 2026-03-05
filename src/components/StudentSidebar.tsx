import { HiOutlineX } from "react-icons/hi";
import { useAuth } from "../context/AuthContext";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function StudentSidebar({ open, onClose }: Props) {
  const { user, logout } = useAuth();

  return (
    <>
      {/* Backdrop (mobile only) */}
      <div
        className={`fixed inset-0 bg-black/40 z-40 lg:hidden transition-opacity ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Sidebar */}
      <aside
        className={[
          "fixed z-50 top-0 left-0 h-full w-72 bg-gray-900 text-white",
          "transform transition-transform duration-200",
          open ? "translate-x-0" : "-translate-x-full",
          "lg:translate-x-0 lg:static lg:z-auto",
        ].join(" ")}
      >
        <div className="h-16 px-4 border-b border-white/10 flex items-center justify-between">
          <span className="font-semibold">Student Panel</span>

          <button
            onClick={onClose}
            className="lg:hidden text-2xl"
            aria-label="Close sidebar"
          >
            <HiOutlineX />
          </button>
        </div>

        <div className="p-5 space-y-3 text-sm">
          <div className="rounded-lg bg-white/10 p-4 space-y-2">
            <div>
              <div className="text-white/70 text-xs">Email</div>
              <div className="font-medium break-all">{user?.email ?? "-"}</div>
            </div>


            <div>
              <div className="text-white/70 text-xs">Role</div>
              <div className="font-medium break-all">{user?.role ?? "-"}</div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-white/70 text-xs">Grade</div>
                <div className="font-medium">{user?.grade ?? "-"}</div>
              </div>

              <div>
                <div className="text-white/70 text-xs">Section</div>
                <div className="font-medium">{user?.section ?? "-"}</div>
              </div>
            </div>
          </div>

          <button
            onClick={logout}
            className="w-full mt-4 bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg font-medium"
          >
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}