import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Unauthorized() {
  const { user } = useAuth();

  const redirectPath = user?.role === "student" ? "/class-logger" : "/dashboard";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-10 rounded-xl shadow-md text-center max-w-md">
        <h1 className="text-4xl font-bold text-red-500 mb-4">403</h1>

        <h2 className="text-xl font-semibold mb-2">
          Unauthorized Access
        </h2>

        <p className="text-gray-600 mb-6">
          You don't have permission to access this page.
        </p>

        <Link
          to={redirectPath}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Go Back
        </Link>
      </div>
    </div>
  );
}
