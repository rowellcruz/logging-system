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

const Router: React.FC = () => {
    return (
        <Routes>
            <Route path="/login" element={<Login />} />
            <Route
                path="/"
                element={
                    <PrivateRoute>
                        <MainLayout />
                    </PrivateRoute>
                }
            >
                <Route index element={<Dashboard />} />
                <Route path="/import-data" element={<ImportData />} />
                <Route path="/class-tracker" element={<ClassTracker />} />
                <Route path="/class-logger" element={<ClassLogger />} />
                <Route path="/report" element={<Report />} />
            </Route>
        </Routes>
    );
};

export default Router;