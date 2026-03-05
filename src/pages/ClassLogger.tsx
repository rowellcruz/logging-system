import React, { useEffect, useState, useRef } from "react";
import { getFirestore, collection, onSnapshot, addDoc, serverTimestamp, query, where, getDocs, doc, getDoc, writeBatch } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";

const db = getFirestore();

interface Period {
    id?: string;
    teacher: string;
    grade: string;
    section: string;
    subject: string;
    period: string; // e.g., "8:00-9:00"
}

interface Log {
    id?: string;
    logged_at: any;
    logged_by: string;
    teacher: string;
    status: "on-time" | "late" | "no-show" | "waiting";
    subject: string;
    grade: string;
    section: string;
    period: string;
}

interface Teacher {
    id: string;
    name: string;
    subjects: string[];
}

// Helper function to convert period string to minutes for comparison
const periodToMinutes = (periodStr: string): number => {
    try {
        const [startTimeStr] = periodStr.split('-').map(s => s.trim());
        const [hour, minute] = startTimeStr.split(':').map(Number);
        return hour * 60 + (minute || 0);
    } catch (error) {
        console.error('Error converting period to minutes:', error);
        return 0;
    }
};

export default function ClassLogger() {
    const { user } = useAuth();
    const [currentTime, setCurrentTime] = useState<string>(new Date().toLocaleTimeString());
    const [currentPeriod, setCurrentPeriod] = useState<Period | null>(null);
    const [existingLog, setExistingLog] = useState<Log | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isCheckingLog, setIsCheckingLog] = useState(false);
    const [missingPeriods, setMissingPeriods] = useState<Period[]>([]);
    
    // Modal state
    const [showTeacherModal, setShowTeacherModal] = useState(false);
    const [availableTeachers, setAvailableTeachers] = useState<Teacher[]>([]);
    const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
    
    // Parse time string to hours and minutes
    const parseTimeString = (timeStr: string): { hour: number; minute: number } | null => {
        try {
            const [hour, minute] = timeStr.split(':').map(Number);
            if (isNaN(hour) || isNaN(minute)) return null;
            return { hour, minute };
        } catch (error) {
            console.error('Error parsing time string:', timeStr, error);
            return null;
        }
    };

    // Get start time from period string
    const getPeriodStartTime = (periodStr: string): Date | null => {
        try {
            const [startTimeStr] = periodStr.split('-').map(s => s.trim());
            const start = parseTimeString(startTimeStr);
            
            if (!start) return null;
            
            const startTime = new Date();
            startTime.setHours(start.hour, start.minute, 0, 0);
            
            return startTime;
        } catch (error) {
            console.error('Error getting period start time:', error);
            return null;
        }
    };

    // Check if current time is within a period
    const isTimeInPeriod = (now: Date, periodStr: string): boolean => {
        try {
            const [startTimeStr, endTimeStr] = periodStr.split('-').map(s => s.trim());

            const start = parseTimeString(startTimeStr);
            const end = parseTimeString(endTimeStr);

            if (!start || !end) {
                console.error('Invalid time format:', periodStr);
                return false;
            }

            const startTime = new Date(now);
            startTime.setHours(start.hour, start.minute, 0, 0);

            const endTime = new Date(now);
            endTime.setHours(end.hour, end.minute, 0, 0);

            if (endTime <= startTime) {
                endTime.setDate(endTime.getDate() + 1);
            }

            const nowTime = now.getTime();
            return nowTime >= startTime.getTime() && nowTime < endTime.getTime();
        } catch (error) {
            console.error('Error checking time in period:', error);
            return false;
        }
    };

    // Determine if a period is in the past
    const isPeriodInPast = (periodStr: string): boolean => {
        const now = new Date();
        const [startTimeStr] = periodStr.split('-').map(s => s.trim());
        const start = parseTimeString(startTimeStr);
        
        if (!start) return false;
        
        const periodStartTime = new Date();
        periodStartTime.setHours(start.hour, start.minute, 0, 0);
        
        // Add 10 minutes grace period before considering it past
        periodStartTime.setMinutes(periodStartTime.getMinutes() + 10);
        
        return now > periodStartTime;
    };

    // Determine attendance status based on current time and period
    const determineStatus = (period: Period): "on-time" | "late" => {
        const now = new Date();
        const startTime = getPeriodStartTime(period.period);
        
        if (!startTime) return "late";

        const timeDiffMinutes = (now.getTime() - startTime.getTime()) / (1000 * 60);

        if (timeDiffMinutes >= 0 && timeDiffMinutes <= 10) {
            return "on-time";
        }

        return "late";
    };

    // Get all periods for the day (sorted by time)
    const getAllPeriodsForDay = async (grade: string, section: string): Promise<Period[]> => {
        try {
            const periodsRef = collection(db, "periods");
            const q = query(
                periodsRef,
                where("grade", "==", grade),
                where("section", "==", section)
            );
            
            const snapshot = await getDocs(q);
            
            return snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() } as Period))
                .sort((a, b) => periodToMinutes(a.period) - periodToMinutes(b.period));
        } catch (error) {
            console.error("Error fetching all periods:", error);
            return [];
        }
    };

    // Get logs for today
    const getTodayLogs = async (grade: string, section: string): Promise<Log[]> => {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            const logsRef = collection(db, "logs");
            const q = query(
                logsRef,
                where("grade", "==", grade),
                where("section", "==", section)
                // Note: You might want to add date filtering here if your logs have timestamps
            );

            const snapshot = await getDocs(q);
            
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Log[];
        } catch (error) {
            console.error("Error fetching today's logs:", error);
            return [];
        }
    };

    // Find missing periods that need "no-show" logs
    const findMissingPeriods = async (currentPeriod: Period): Promise<Period[]> => {
        const allPeriods = await getAllPeriodsForDay(currentPeriod.grade, currentPeriod.section);
        const existingLogs = await getTodayLogs(currentPeriod.grade, currentPeriod.section);
        
        // Get periods that have logs
        const loggedPeriods = new Set(existingLogs.map(log => log.period));
        
        // Find periods that:
        // 1. Are before the current period
        // 2. Don't have logs yet
        // 3. Are in the past (past their start time + grace period)
        const missing = allPeriods.filter(period => {
            const periodTime = periodToMinutes(period.period);
            const currentPeriodTime = periodToMinutes(currentPeriod.period);
            
            return periodTime < currentPeriodTime && 
                   !loggedPeriods.has(period.period) && 
                   isPeriodInPast(period.period);
        });
        
        return missing;
    };

    // Fetch teachers for the current subject
    const fetchTeachersForSubject = async (subject: string): Promise<Teacher[]> => {
        try {
            const teachersRef = collection(db, "teachers");
            const q = query(teachersRef, where("subjects", "array-contains", subject));
            const snapshot = await getDocs(q);
            
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Teacher));
        } catch (error) {
            console.error("Error fetching teachers:", error);
            return [];
        }
    };

    // Handle teacher selection and proceed with logging
    const handleTeacherSelect = async (teacher: Teacher) => {
        setSelectedTeacher(teacher);
        setShowTeacherModal(false);
        
        if (!currentPeriod || !user) return;
        
        setIsLoading(true);

        try {
            // First, find and create missing logs for past periods
            const missing = await findMissingPeriods(currentPeriod);
            setMissingPeriods(missing);
            
            if (missing.length > 0) {
                await createMissingLogs(missing);
            }

            // Then create the current period log with selected teacher
            const status = determineStatus(currentPeriod);

            const logData = {
                logged_at: serverTimestamp(),
                logged_by: user.uid,
                teacher: teacher.name, // Use selected teacher's name
                status: status,
                subject: currentPeriod.subject,
                grade: currentPeriod.grade,
                section: currentPeriod.section,
                period: currentPeriod.period,
                teacher_id: teacher.id // Optionally store teacher ID for reference
            };

            const docRef = await addDoc(collection(db, "logs"), logData);
            
            setExistingLog({
                id: docRef.id,
                ...logData,
                logged_at: new Date()
            });

            // Show appropriate message
            if (missing.length > 0) {
                alert(`Created ${missing.length} no-show log(s) for missed periods.\nAttendance marked for current period: ${status} (Teacher: ${teacher.name})`);
            } else {
                alert(`Attendance marked: ${status} (Teacher: ${teacher.name})`);
            }
        } catch (error) {
            console.error("Error creating log:", error);
            alert("Failed to create log. See console for details.");
        } finally {
            setIsLoading(false);
            setSelectedTeacher(null);
        }
    };

    // Handle log button click - now opens modal instead of directly creating log
    const handleLogClick = async () => {
        if (!currentPeriod || !user) return;
        
        // Fetch teachers for the current subject
        const teachers = await fetchTeachersForSubject(currentPeriod.subject);
        setAvailableTeachers(teachers);
        setShowTeacherModal(true);
    };

    // Update clock every second
    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date();
            setCurrentTime(now.toLocaleTimeString());
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    // Fetch periods and find current period based on user's grade/section and current time
    useEffect(() => {
        if (!user) {
            setCurrentPeriod(null);
            setExistingLog(null);
            return;
        }

        const unsubscribe = onSnapshot(collection(db, "periods"), async (snapshot) => {
            const now = new Date();
            
            const matchingPeriod = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() } as Period))
                .find(p => 
                    String(p.grade).trim() === String(user.grade).trim() &&
                    String(p.section).trim().toUpperCase() === String(user.section).trim().toUpperCase() &&
                    isTimeInPeriod(now, p.period)
                );

            setCurrentPeriod(matchingPeriod || null);
            setExistingLog(null);
        });

        return () => unsubscribe();
    }, [user]);

    // Check for existing log when current period changes
    useEffect(() => {
        let isMounted = true;

        const checkLog = async () => {
            if (currentPeriod && user) {
                setIsCheckingLog(true);
                const log = await checkExistingLog(currentPeriod);
                if (isMounted) {
                    setExistingLog(log);
                }
                setIsCheckingLog(false);
            } else {
                setExistingLog(null);
            }
        };

        checkLog();

        return () => {
            isMounted = false;
        };
    }, [currentPeriod, user]);

    // Check for existing log for the current period
    const checkExistingLog = async (period: Period): Promise<Log | null> => {
        if (!user || !period.id) return null;

        try {
            const logsRef = collection(db, "logs");
            
            const q = query(
                logsRef,
                where("grade", "==", period.grade),
                where("section", "==", period.section),
                where("period", "==", period.period),
                where("teacher", "==", period.teacher),
                where("subject", "==", period.subject)
            );

            const querySnapshot = await getDocs(q);
            
            if (querySnapshot.docs.length > 0) {
                const sortedDocs = querySnapshot.docs.sort((a, b) => {
                    const aTime = a.data().logged_at?.toDate?.() || new Date(0);
                    const bTime = b.data().logged_at?.toDate?.() || new Date(0);
                    return bTime - aTime;
                });
                
                const logDoc = sortedDocs[0];
                return {
                    id: logDoc.id,
                    ...logDoc.data()
                } as Log;
            }
            
            return null;
        } catch (error) {
            console.error("Error checking existing log:", error);
            return null;
        }
    };

    // Determine if button should be disabled
    const isButtonDisabled = (): boolean => {
        if (!currentPeriod || !user) return true;
        if (isLoading || isCheckingLog) return true;
        if (existingLog) return true;
        return false;
    };

    // Get button text based on current state
    const getButtonText = (): string => {
        if (isLoading) return 'Processing...';
        if (isCheckingLog) return 'Checking...';
        
        if (existingLog) {
            return `Already Logged (${existingLog.status})`;
        }
        
        return 'Log Attendance';
    };

    if (!user) {
        return <p className="p-4">Please log in to view your class schedule.</p>;
    }

    return (
        <div className="p-6 max-w-xl mx-auto">
            <h1 className="text-2xl font-bold mb-4">Class Logger</h1>
            <p className="mb-4">
                Current Time: <span className="font-mono">{currentTime}</span>
            </p>
            <p className="mb-4">
                <strong>Your Class:</strong> Grade {user.grade} - Section {user.section}
            </p>

            {missingPeriods.length > 0 && (
                <div className="bg-orange-100 p-4 rounded border border-orange-300 mb-4">
                    <p className="font-semibold">⚠️ Missing periods detected</p>
                    <p className="text-sm">The following periods will be marked as "no-show":</p>
                    <ul className="list-disc list-inside text-sm mt-2">
                        {missingPeriods.map((p, index) => (
                            <li key={index}>{p.period} - {p.subject}</li>
                        ))}
                    </ul>
                </div>
            )}

            {currentPeriod ? (
                <div className="bg-green-100 p-4 rounded border border-green-300 mb-6">
                    <h2 className="text-xl font-semibold">Current Period</h2>
                    <p><strong>Grade:</strong> {currentPeriod.grade}</p>
                    <p><strong>Section:</strong> {currentPeriod.section}</p>
                    <p><strong>Subject:</strong> {currentPeriod.subject}</p>
                    <p><strong>Teacher:</strong> {currentPeriod.teacher}</p>
                    <p><strong>Time:</strong> {currentPeriod.period}</p>
                    
                    {existingLog && (
                        <div className="mt-4 p-3 bg-white rounded border border-gray-200">
                            <p><strong>Log Status:</strong> 
                                <span className={`ml-2 font-semibold ${
                                    existingLog.status === 'on-time' ? 'text-green-600' :
                                    existingLog.status === 'late' ? 'text-yellow-600' :
                                    existingLog.status === 'no-show' ? 'text-red-600' :
                                    'text-gray-600'
                                }`}>
                                    {existingLog.status}
                                </span>
                            </p>
                            <p className="text-sm text-gray-500 mt-1">
                                You have already logged for this period.
                            </p>
                        </div>
                    )}
                </div>
            ) : (
                <div className="bg-yellow-100 p-4 rounded border border-yellow-300 mb-6">
                    <p>No active period at this time for your class.</p>
                </div>
            )}

            {currentPeriod && (
                <button
                    onClick={handleLogClick}
                    disabled={isButtonDisabled()}
                    className={`px-4 py-2 rounded text-white ${
                        isButtonDisabled() 
                            ? 'bg-gray-400 cursor-not-allowed' 
                            : 'bg-blue-500 hover:bg-blue-600'
                    }`}
                >
                    {getButtonText()}
                </button>
            )}

            {/* Teacher Selection Modal */}
            {showTeacherModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                        <h3 className="text-lg font-semibold mb-4">Select Teacher</h3>
                        <p className="text-sm text-gray-600 mb-4">
                            Who is teaching {currentPeriod?.subject} this period?
                        </p>
                        
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                            {availableTeachers.length > 0 ? (
                                availableTeachers.map((teacher) => (
                                    <button
                                        key={teacher.id}
                                        onClick={() => handleTeacherSelect(teacher)}
                                        className="w-full text-left p-3 rounded border hover:bg-blue-50 hover:border-blue-300 transition-colors"
                                    >
                                        <div className="font-medium">{teacher.name}</div>
                                        <div className="text-sm text-gray-500">
                                            Subjects: {teacher.subjects.join(', ')}
                                        </div>
                                    </button>
                                ))
                            ) : (
                                <p className="text-center text-gray-500 py-4">
                                    No teachers found for {currentPeriod?.subject}
                                </p>
                            )}
                        </div>
                        
                        <div className="mt-6 flex justify-end">
                            <button
                                onClick={() => {
                                    setShowTeacherModal(false);
                                    setSelectedTeacher(null);
                                }}
                                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}