window.LP = window.LP || {};
const LP = window.LP;

const { useState, useContext } = React;
const { Calendar } = window.lucideReact;

const AdminAsistencia = () => {
    const { db } = useContext(LP.AppContext);
    const Button = LP.Button;
    const PdfService = LP.PdfService;

    const [reportMonth, setReportMonth] = useState(new Date().toISOString().slice(0, 7));
    const [reportYear, setReportYear] = useState(String(new Date().getFullYear()));

    const fetchAllEmployees = async () => {
        const { getDocs, collection } = LP.firebase;
        const snap = await getDocs(collection(db, "employees"));
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    };

    const generateAttendanceReport = async () => {
        const { getDocs, query, collection, where } = LP.firebase;
        const allEmployees = await fetchAllEmployees();
        const q = query(collection(db, "attendance"), where("month", "==", reportMonth));
        const snapshot = await getDocs(q);
        const attendanceData = {};
        snapshot.forEach(doc => { attendanceData[doc.id] = doc.data().records; });

        const daysInMonth = new Date(reportMonth.split('-')[0], reportMonth.split('-')[1], 0).getDate();
        PdfService.generateAttendance(reportMonth, allEmployees, attendanceData, daysInMonth);
    };

    const generateYearlyReport = async () => {
        const { getDocs, query, collection, where } = LP.firebase;
        const allEmployees = await fetchAllEmployees();
        const q = query(
            collection(db, "attendance"),
            where("month", ">=", `${reportYear}-01`),
            where("month", "<=", `${reportYear}-12`)
        );
        const snapshot = await getDocs(q);
        const attendanceData = {};
        snapshot.forEach(doc => { attendanceData[doc.id] = doc.data().records; });
        PdfService.generateAttendanceYearly(reportYear, allEmployees, attendanceData);
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 max-w-lg mx-auto">
            <h3 className="font-bold mb-4 text-gray-800 flex items-center"><Calendar className="mr-2" /> Reporte de Asistencia</h3>
            <div className="mb-4"><label className="block text-sm font-bold text-gray-600 mb-2">Mes</label><input type="month" value={reportMonth} onChange={e => setReportMonth(e.target.value)} className="border p-3 rounded-lg w-full text-lg" /></div>
            <Button onClick={generateAttendanceReport} className="w-full mb-6">Descargar PDF Mensual</Button>
            <div className="border-t border-gray-200 pt-4">
                <div className="mb-4"><label className="block text-sm font-bold text-gray-600 mb-2">Año</label><input type="number" value={reportYear} onChange={e => setReportYear(e.target.value)} min="2020" max="2099" className="border p-3 rounded-lg w-full text-lg" /></div>
                <Button onClick={generateYearlyReport} className="w-full">Descargar PDF Anual</Button>
            </div>
        </div>
    );
};

LP.AdminAsistencia = AdminAsistencia;
