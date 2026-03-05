import React from "react";
import { Routes, Route } from "react-router-dom";
import Login from "../pages/Login";
import MainLayout from "../layouts/MainLayout";
import PrivateRoute from "../components/PrivateRoute";
import Dashboard from "../pages/Dashboard";
import ImportData from "../pages/ImportData";
import ClassTracker from "../pages/ClassTracker";
import ClassLogger from "../pages/ClassLogger";
import Report from "../pages/Report";
import StudentLayout from "../layouts/StudentLayout";
import Unauthorized from "../pages/Unauthorized";

const Router: React.FC = () => {
    return (
        <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/unauthorized" element={<Unauthorized />} />
            <Route element={<PrivateRoute allowedRoles={['admin']} />}>
                <Route path="/" element={<MainLayout />}>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/import-data" element={<ImportData />} />
                    <Route path="/class-tracker" element={<ClassTracker />} />
                    <Route path="/report" element={<Report />} />
                </Route>
            </Route>


            <Route element={<PrivateRoute allowedRoles={['student', 'admin']} />}>
                <Route element={<StudentLayout />}>
                    <Route path="/class-logger" element={<ClassLogger />} />
                </Route>
            </Route>
        </Routes>
    );
};

export default Router;