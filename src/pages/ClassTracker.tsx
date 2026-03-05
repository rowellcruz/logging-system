import React, { useEffect, useState } from "react";
import { getFirestore, collection, onSnapshot, query, where, getDocs } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";

const db = getFirestore();

interface Period {
    id: string;
    grade: string;
    section: string;
    subject: string;
    teacher: string;
    period: string;
}

interface Log {
    id: string;
    section: string;
    grade: string;
    period: string;
    status: "on-time" | "late" | "no-show" | "waiting";
    subject: string;
    teacher: string;
    logged_at: any;
}

// Fixed time periods for columns
const TIME_PERIODS = [
    "8:00-9:00",
    "9:00-10:00", 
    "10:00-11:00",
    "11:00-12:00",
    "12:00-1:00",
    "1:00-2:00",
    "2:00-3:00"
];

// Helper function to parse time string to minutes for comparison
const parseTimeToMinutes = (timeStr: string): number => {
    const [hour, minute] = timeStr.split(':').map(Number);
    return hour * 60 + (minute || 0);
};

// Get period start time in minutes
const getPeriodStartMinutes = (periodStr: string): number => {
    try {
        const [startTimeStr] = periodStr.split('-').map(s => s.trim());
        return parseTimeToMinutes(startTimeStr);
    } catch (error) {
        console.error('Error parsing period start time:', error);
        return 0;
    }
};

// Check if a period is in the past (considering a grace period)
const isPeriodInPast = (periodStr: string): boolean => {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    const periodStartMinutes = getPeriodStartMinutes(periodStr);
    
    // Add 10 minutes grace period before considering it past
    const periodEndWithGrace = periodStartMinutes + 10; // 10 minutes after period starts
    
    return currentMinutes > periodEndWithGrace;
};

export default function ClassTracker() {
    const { user } = useAuth();
    const [currentDateTime, setCurrentDateTime] = useState<string>("");
    const [grades, setGrades] = useState<string[]>([]);
    const [selectedGrade, setSelectedGrade] = useState<string>("");
    const [sections, setSections] = useState<string[]>([]);
    const [periods, setPeriods] = useState<Period[]>([]);
    const [logs, setLogs] = useState<Log[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    // Update current date and time every second
    useEffect(() => {
        const updateDateTime = () => {
            const now = new Date();
            const formatted = now.toLocaleString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
            setCurrentDateTime(formatted);
        };

        updateDateTime();
        const interval = setInterval(updateDateTime, 1000);
        return () => clearInterval(interval);
    }, []);

    // Fetch all unique grades from periods collection
    useEffect(() => {
        const fetchGrades = async () => {
            try {
                const periodsRef = collection(db, "periods");
                const snapshot = await getDocs(periodsRef);
                
                const uniqueGrades = new Set<string>();
                snapshot.docs.forEach(doc => {
                    const data = doc.data();
                    if (data.grade) {
                        uniqueGrades.add(data.grade);
                    }
                });
                
                const sortedGrades = Array.from(uniqueGrades).sort((a, b) => {
                    const numA = parseInt(a);
                    const numB = parseInt(b);
                    return numA - numB;
                });
                
                setGrades(sortedGrades);
                if (sortedGrades.length > 0 && !selectedGrade) {
                    setSelectedGrade(sortedGrades[0]);
                }
            } catch (error) {
                console.error("Error fetching grades:", error);
            }
        };

        fetchGrades();
    }, []);

    // Fetch periods and sections based on selected grade
    useEffect(() => {
        if (!selectedGrade) return;

        setIsLoading(true);

        const periodsRef = collection(db, "periods");
        const q = query(periodsRef, where("grade", "==", selectedGrade));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const periodsData: Period[] = [];
            const sectionsSet = new Set<string>();

            snapshot.docs.forEach(doc => {
                const data = doc.data() as Omit<Period, 'id'>;
                periodsData.push({
                    id: doc.id,
                    ...data
                });
                sectionsSet.add(data.section);
            });

            // Sort sections alphabetically
            const sortedSections = Array.from(sectionsSet).sort();
            
            setPeriods(periodsData);
            setSections(sortedSections);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching periods:", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [selectedGrade]);

    // Fetch logs for the selected grade
    useEffect(() => {
        if (!selectedGrade) return;

        const logsRef = collection(db, "logs");
        
        const q = query(
            logsRef,
            where("grade", "==", selectedGrade)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const logsData: Log[] = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Log[];

            setLogs(logsData);
        }, (error) => {
            console.error("Error fetching logs:", error);
        });

        return () => unsubscribe();
    }, [selectedGrade]);

    // Get the status for a specific section and time period
    const getStatusForCell = (section: string, timePeriod: string): string => {
        // Special case for lunch period
        if (timePeriod === "12:00-1:00") {
            return "Lunch";
        }

        // Find the period for this section and time
        const period = periods.find(p => 
            p.section === section && p.period === timePeriod
        );

        if (!period) return "—";

        // Find the log for this period
        const log = logs.find(l => 
            l.section === section && 
            l.period === timePeriod &&
            l.subject === period.subject
        );

        if (log) {
            return log.status;
        }

        // If no log exists, check if the period is in the past
        if (isPeriodInPast(timePeriod)) {
            return "no-show";
        }

        // Period is in the future or current, no log yet
        return "—";
    };

    // Get status color class
    const getStatusColor = (status: string): string => {
        switch(status.toLowerCase()) {
            case 'on-time':
                return 'bg-green-100 text-green-800';
            case 'late':
                return 'bg-yellow-100 text-yellow-800';
            case 'no-show':
                return 'bg-red-100 text-red-800';
            case 'waiting':
                return 'bg-blue-100 text-blue-800';
            case 'lunch':
                return 'bg-purple-100 text-purple-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    // Get cell tooltip text
    const getCellTooltip = (section: string, timePeriod: string, status: string): string => {
        if (status === "Lunch") return "Lunch break";
        if (status === "—") return "No data available";
        if (status === "no-show" && !logs.some(l => l.section === section && l.period === timePeriod)) {
            return "No log created for this period (inferred as no-show)";
        }
        return `Status: ${status}`;
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Current Date and Time */}
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-gray-800 mb-2">Class Tracker</h1>
                <div className="text-xl text-gray-600 bg-gray-100 inline-block px-6 py-3 rounded-lg">
                    {currentDateTime}
                </div>
            </div>

            {/* Grade Filter */}
            <div className="mb-6 flex items-center justify-end">
                <label htmlFor="grade-select" className="mr-3 font-medium text-gray-700">
                    Filter by Grade:
                </label>
                <select
                    id="grade-select"
                    value={selectedGrade}
                    onChange={(e) => setSelectedGrade(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    {grades.map(grade => (
                        <option key={grade} value={grade}>
                            Grade {grade}
                        </option>
                    ))}
                </select>
            </div>

            {/* Schedule Table */}
            {isLoading ? (
                <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="mt-2 text-gray-600">Loading schedule...</p>
                </div>
            ) : sections.length > 0 ? (
                <div className="overflow-x-auto bg-white rounded-lg shadow">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                                    Section
                                </th>
                                {TIME_PERIODS.map(period => (
                                    <th 
                                        key={period} 
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]"
                                    >
                                        {period}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {sections.map(section => (
                                <tr key={section} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 bg-white z-10">
                                        Section {section}
                                    </td>
                                    {TIME_PERIODS.map(period => {
                                        const status = getStatusForCell(section, period);
                                        const tooltip = getCellTooltip(section, period, status);
                                        
                                        return (
                                            <td 
                                                key={`${section}-${period}`} 
                                                className="px-6 py-4 whitespace-nowrap text-sm"
                                                title={tooltip}
                                            >
                                                {status !== "—" ? (
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
                                                        {status}
                                                        {status === "no-show" && !logs.some(l => l.section === section && l.period === period) && (
                                                            <span className="ml-1 text-xs opacity-75">*</span>
                                                        )}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400">—</span>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <p className="text-gray-500">No sections found for Grade {selectedGrade}</p>
                </div>
            )}

            {/* Legend */}
            <div className="mt-6 flex flex-wrap gap-4 justify-end">
                <div className="flex items-center">
                    <span className="w-3 h-3 rounded-full bg-green-100 border border-green-300 mr-2"></span>
                    <span className="text-sm text-gray-600">On Time</span>
                </div>
                <div className="flex items-center">
                    <span className="w-3 h-3 rounded-full bg-yellow-100 border border-yellow-300 mr-2"></span>
                    <span className="text-sm text-gray-600">Late</span>
                </div>
                <div className="flex items-center">
                    <span className="w-3 h-3 rounded-full bg-red-100 border border-red-300 mr-2"></span>
                    <span className="text-sm text-gray-600">No Show</span>
                    <span className="text-xs text-gray-500 ml-1">(* inferred)</span>
                </div>
                <div className="flex items-center">
                    <span className="w-3 h-3 rounded-full bg-blue-100 border border-blue-300 mr-2"></span>
                    <span className="text-sm text-gray-600">Waiting</span>
                </div>
                <div className="flex items-center">
                    <span className="w-3 h-3 rounded-full bg-purple-100 border border-purple-300 mr-2"></span>
                    <span className="text-sm text-gray-600">Lunch</span>
                </div>
            </div>
        </div>
    );
}