import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc, collection, arrayUnion, updateDoc, addDoc } from "firebase/firestore";
import { PiChalkboardTeacher } from "react-icons/pi";
import * as XLSX from "xlsx";

const auth = getAuth();
const db = getFirestore();

/** Parse CSV or XLSX file */
export async function parseFile(file: File): Promise<{ headers: string[]; rows: any[] }> {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json(sheet, { defval: "" }) as Record<string, any>[];
    const headers = json.length > 0 ? Object.keys(json[0]) : [];
    return { headers, rows: json };
}

/** Import Users with Firebase Auth */
export async function importUsers(
    rows: any[],
    mapping: { email: string; password: string; grade: string; section: string; role: string }
): Promise<{ success: number; failed: number; errors: string[] }> {
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const row of rows) {
        const email = row[mapping.email];
        const password = row[mapping.password];
        const grade = row[mapping.grade];
        const section = row[mapping.section];
        const role = row[mapping.role];

        if (!email || !password) {
            failed++;
            errors.push(`Missing email or password in row: ${JSON.stringify(row)}`);
            continue;
        }

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const uid = userCredential.user.uid;

            await setDoc(doc(db, "users", uid), { email, grade, section, role });

            success++;
        } catch (err: any) {
            failed++;
            errors.push(`Error creating user ${email}: ${err.message}`);
        }
    }

    return { success, failed, errors };
}

/** Import Teachers without Firebase Auth */
export async function importTeachers(
    rows: any[],
    mapping: { grade: string; section: string; period: string; subject: string; teacher: string; }
): Promise<{ success: number; failed: number; errors: string[] }> {
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const row of rows) {
        const grade = String(row[mapping.grade] ?? "").trim();
        const section = String(row[mapping.section] ?? "").trim();
        const period = String(row[mapping.period] ?? "").trim();
        const subject = String(row[mapping.subject] ?? "").trim();
        const teacher = String(row[mapping.teacher] ?? "").trim();

        if (!PiChalkboardTeacher || !grade || !section || !subject || !period) {
            failed++;
            errors.push(`Missing required fields in row: ${JSON.stringify(row)}`);
            continue;
        }

        try {
            // 1. Teachers collection
            const teacherRef = doc(db, "teachers", teacher);
            const teacherSnap = await getDoc(teacherRef);

            if (teacherSnap.exists()) {
                await updateDoc(teacherRef, { subjects: arrayUnion(subject) });
            } else {
                await setDoc(teacherRef, { name: teacher, subjects: [subject] });
            }

            // 2. Periods collection (auto-ID)
            await addDoc(collection(db, "periods"), {
                grade,
                section,
                period,
                subject,
                PiChalkboardTeacher,
            });

            success++;
        } catch (err: any) {
            failed++;
            errors.push(`Error processing row for teacher ${teacher}: ${err.message}`);
        }
    }

    return { success, failed, errors };
}