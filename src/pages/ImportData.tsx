import React, { useState } from "react";
import { importUsers, importTeachers, parseFile } from "../services/importDataServices";

type ImportType = "users" | "teachers";

interface StudentMapping {
  email: string;
  password: string;
  grade: string;
  section: string;
  role: string;
}

interface TeacherMapping {
  grade: string;
  section: string;
  period: string;
  subject: string;
  teacher: string;
}

export default function ImportData() {
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [importType, setImportType] = useState<ImportType>("users");
  const [studentMapping, setStudentMapping] = useState<StudentMapping>({
    email: "",
    password: "",
    grade: "",
    section: "",
    role: "",
  });
  const [teacherMapping, setTeacherMapping] = useState<TeacherMapping>({
    grade: "",
    section: "",
    period: "",
    subject: "",
    teacher: "",
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>("");

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const selectedFile = e.target.files[0];

    const { headers, rows } = await parseFile(selectedFile);
    setHeaders(headers);
    setRows(rows);
  };

  const handleMappingChange = (field: string, value: string) => {
    if (importType === "users") {
      setStudentMapping((prev) => ({ ...prev, [field]: value }));
    } else {
      setTeacherMapping((prev) => ({ ...prev, [field]: value }));
    }
  };

  const handleImport = async () => {
    if (!rows.length) {
      alert("Please select a file.");
      return;
    }

    setLoading(true);

    if (importType === "users") {
      if (!studentMapping.email || !studentMapping.password) {
        alert("Please map email and password for users.");
        setLoading(false);
        return;
      }
      const { success, failed, errors } = await importUsers(rows, studentMapping);
      setResult(`Success: ${success}, Failed: ${failed}\nErrors:\n${errors.join("\n")}`);
    } else {
      // Teachers
      const { success, failed, errors } = await importTeachers(rows, teacherMapping);
      setResult(`Success: ${success}, Failed: ${failed}\nErrors:\n${errors.join("\n")}`);
    }

    setLoading(false);
  };

  const mappingFields = importType === "users"
    ? (["email", "password", "grade", "section", "role"] as (keyof StudentMapping)[])
    : (["grade", "section", "period", "subject", "teacher"] as (keyof TeacherMapping)[]);

  return (
    <div className="p-4 max-w-xl mx-auto">
      <h2 className="text-xl font-bold mb-4">Import Data</h2>

      <div className="mb-4">
        <label className="mr-2 font-semibold">Import Type:</label>
        <select
          value={importType}
          onChange={(e) => setImportType(e.target.value as ImportType)}
          className="border rounded px-2 py-1"
        >
          <option value="users">Users</option>
          <option value="teachers">Teachers</option>
        </select>
      </div>

      <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFileChange} />

      {headers.length > 0 && (
        <div className="mt-4 space-y-4">
          {mappingFields.map((field) => (
            <div key={field}>
              <label className="block mb-1 font-semibold">{field.toUpperCase()}</label>
              <select
                className="border rounded px-2 py-1 w-full"
                value={
                  importType === "users" ? studentMapping[field as keyof StudentMapping] : teacherMapping[field as keyof TeacherMapping]
                }
                onChange={(e) => handleMappingChange(field, e.target.value)}
              >
                <option value="">-- Select Column --</option>
                {headers.map((header) => (
                  <option key={header} value={header}>
                    {header}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}

      {headers.length > 0 && (
        <button
          className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          onClick={handleImport}
          disabled={loading}
        >
          {loading ? "Importing..." : "Confirm & Import"}
        </button>
      )}

      {result && (
        <pre className="mt-4 bg-gray-100 p-2 rounded overflow-auto text-sm">{result}</pre>
      )}
    </div>
  );
}