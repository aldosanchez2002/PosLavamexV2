window.LP = window.LP || {};
const LP = window.LP;

const { useState, useEffect, useContext } = React;
const { Coffee, Package, Trash2, Loader2 } = window.lucideReact;

const AdminMercancia = () => {
    const { history, tickets, deductions, adminSnacks, deleteAdminSnack, db } = useContext(LP.AppContext);
    const DateRangeSelector = LP.DateRangeSelector;
    const getDefaultPayPeriod = LP.getDefaultPayPeriod;

    const [startDate, setStartDate] = useState(() => getDefaultPayPeriod().start);
    const [endDate, setEndDate] = useState(() => getDefaultPayPeriod().end);
    const [localData, setLocalData] = useState(null);
    const [isFetching, setIsFetching] = useState(false);

    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T23:59:59.999');

    useEffect(() => {
        const { getDocs, query, collection, where, orderBy } = LP.firebase;
        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
        sixtyDaysAgo.setHours(0, 0, 0, 0);

        if (start >= sixtyDaysAgo) { setLocalData(null); return; }

        setIsFetching(true);
        Promise.all([
            getDocs(query(collection(db, "tickets"), where("status", "==", "PAID"), where("paidAt", ">=", start), where("paidAt", "<=", end), orderBy("paidAt", "desc"))),
            getDocs(query(collection(db, "deductions"), where("timestamp", ">=", start), where("timestamp", "<=", end), orderBy("timestamp", "desc"))),
            getDocs(query(collection(db, "admin_snacks"), where("timestamp", ">=", start), where("timestamp", "<=", end), orderBy("timestamp", "desc"))),
        ]).then(([ticketsSnap, deducsSnap, snacksSnap]) => {
            setLocalData({
                tickets: ticketsSnap.docs.map(d => ({ id: d.id, ...d.data(), timestamp: d.data().timestamp?.toDate() || new Date(), paidAt: d.data().paidAt?.toDate() || null })),
                deductions: deducsSnap.docs.map(d => { const data = d.data(); return { id: d.id, ...data, timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : (data.timestamp || new Date()) }; }),
                adminSnacks: snacksSnap.docs.map(d => ({ id: d.id, ...d.data(), timestamp: d.data().timestamp?.toDate() || new Date() })),
            });
            setIsFetching(false);
        });
    }, [startDate, endDate]);

    const filterRange = (ts) => { if (!ts) return false; const date = new Date(ts.toDate ? ts.toDate() : ts); return date >= start && date <= end; };

    const activeTickets = localData ? localData.tickets : history.concat(tickets.filter(t => t.status === 'PAID')).filter(t => filterRange(t.paidAt || t.timestamp));
    const activeDeductions = localData ? localData.deductions : deductions.filter(d => filterRange(d.timestamp));
    const activeAdminSnacks = localData ? localData.adminSnacks : adminSnacks.filter(a => filterRange(a.timestamp));

    const rangeTickets = activeTickets;
    const rangeDeductions = activeDeductions;
    const rangeAdminSnacks = activeAdminSnacks;

    let snackCustomers = 0;
    let pinoFromTickets = 0;
    let pinoFromCashier = 0;
    rangeTickets.forEach(t => {
        snackCustomers += (t.snackCount || 0);
        if (t.extras) {
            t.extras.forEach(e => {
                if (e.id === 'PINO') pinoFromTickets++;
                else if (e.id === 'QA_PINO') pinoFromCashier++;
            });
        }
    });
    const pinoCount = pinoFromTickets + pinoFromCashier;

    let snackEmployees = 0;
    rangeDeductions.forEach(d => {
        if ((d.description || '').toLowerCase().includes('snack')) {
            snackEmployees += 1;
        }
    });

    let snackAdmin = 0;
    rangeAdminSnacks.forEach(a => {
        snackAdmin += (a.quantity || 1);
    });

    const totalSnacks = snackCustomers + snackEmployees + snackAdmin;

    if (isFetching) return (
        <div className="flex items-center justify-center p-16 text-gray-400 gap-3">
            <Loader2 className="animate-spin w-6 h-6" />
            <span>Cargando datos históricos...</span>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex gap-4 items-center">
                <DateRangeSelector label="Rango de Fechas" start={startDate} end={endDate} onRangeChange={(s, e) => { setStartDate(s); setEndDate(e); }} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-6 rounded-xl shadow border border-gray-200">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Coffee className="w-5 h-5 text-orange-500" /> Snacks Vendidos/Tomados</h3>
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between border-b pb-2"><span>Clientes (Tickets)</span> <span className="font-bold">{snackCustomers}</span></div>
                        <div className="flex justify-between border-b pb-2"><span>Empleados (Deducciones)</span> <span className="font-bold">{snackEmployees}</span></div>
                        <div className="flex justify-between border-b pb-2"><span>Administración (Cortesías)</span> <span className="font-bold">{snackAdmin}</span></div>
                        <div className="flex justify-between text-lg text-orange-700 pt-2 font-black"><span>TOTAL SNACKS</span> <span>{totalSnacks}</span></div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow border border-gray-200">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <Package className="w-5 h-5 text-green-500" /> Pinos Vendidos
                    </h3>
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between text-lg text-green-700 pt-2 font-black"><span>TOTAL PINOS</span> <span>{pinoCount}</span></div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden mt-6">
                <div className="p-4 bg-orange-50 border-b border-orange-100 font-bold text-orange-800 flex items-center gap-2">
                    <Coffee className="w-4 h-4" /> Registro de Cortesías de Administración
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-orange-100 text-orange-800">
                            <tr>
                                <th className="p-3">Fecha y Hora</th>
                                <th className="p-3">Usuario</th>
                                <th className="p-3 text-right">Cantidad</th>
                                <th className="p-3 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rangeAdminSnacks.length === 0 ? (
                                <tr><td colSpan="4" className="p-4 text-center text-gray-400">No hay cortesías registradas en este periodo.</td></tr>
                            ) : (
                                rangeAdminSnacks.sort((a, b) => b.timestamp - a.timestamp).map(a => (
                                    <tr key={a.id} className="border-t hover:bg-orange-50">
                                        <td className="p-3">{a.timestamp instanceof Date ? a.timestamp.toLocaleString() : '...'}</td>
                                        <td className="p-3 uppercase text-xs font-bold text-gray-600">{a.user}</td>
                                        <td className="p-3 text-right font-bold text-orange-600">{a.quantity}</td>
                                        <td className="p-3 text-center">
                                            <button onClick={() => deleteAdminSnack(a.id)} className="text-red-500 hover:text-red-700 bg-red-50 p-2 rounded-lg" title="Eliminar cortesía">
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

LP.AdminMercancia = AdminMercancia;
