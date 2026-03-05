import { Routes, Route } from "react-router-dom";
import StudentLayout from "../layouts/StudentLayout";
import ClassLogger from "../pages/ClassLogger";

export default function StudentRoutes() {
  return (
    <Routes>
      <Route element={<StudentLayout />}>
        <Route path="/class-logger" element={<ClassLogger />} />
        {/* Add other student routes here */}
        {/* <Route path="/other-student-page" element={<OtherPage />} /> */}
      </Route>
    </Routes>
  );
}