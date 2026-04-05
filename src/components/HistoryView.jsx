window.LP = window.LP || {};
const LP = window.LP;

const { useState, useEffect, useContext } = React;
const { History, Loader2, Trash2, CheckCircle, Coffee } = window.lucideReact;

const HistoryView = () => {
    const { history, tickets, deductions, role, db } = useContext(LP.AppContext);
    const formatCurrency = LP.formatCurrency;
    const getLocalDateStr = LP.getLocalDateStr;
    const CustomDateInput = LP.CustomDateInput;

    const [historyDate, setHistoryDate] = useState(getLocalDateStr());
    const [deletedTickets, setDeletedTickets] = useState([]);
    const [isFetchingDeleted, setIsFetchingDeleted] = useState(false);

    const targetDateStr = historyDate;

    useEffect(() => {
        if (role !== 'ADMIN') return;
        const { getDocs, query, collection, where } = LP.firebase;
        const fetchDeleted = async () => {
            setIsFetchingDeleted(true);
            try {
                const start = new Date(historyDate + 'T00:00:00');
                const end = new Date(historyDate + 'T23:59:59.999');
                const snap = await getDocs(query(
                    collection(db, "tickets"),
                    where("status", "==", "CANCELLED"),
                    where("timestamp", ">=", start),
                    where("timestamp", "<=", end)
                ));
                const filtered = snap.docs.map(d => ({
                    id: d.id, ...d.data(),
                    timestamp: d.data().timestamp?.toDate() || new Date(),
                    deletedAt: d.data().deletedAt?.toDate() || null
                }));
                filtered.sort((a, b) => b.timestamp - a.timestamp);
                setDeletedTickets(filtered);
            } catch (e) {
                console.error("Error fetching deleted tickets:", e);
            } finally {
                setIsFetchingDeleted(false);
            }
        };
        fetchDeleted();
    }, [historyDate, role, db]);

    const allPaid = history.concat(tickets.filter(t => t.status === 'PAID'));

    const targetTickets = allPaid.filter(t => {
        const tDate = t.paidAt ? getLocalDateStr(t.paidAt) : getLocalDateStr(t.timestamp);
        return tDate === targetDateStr;
    });

    const totalSum = targetTickets.reduce((acc, t) => acc + (t.price || 0), 0);
    const targetDeductions = deductions.filter(d => d.amount > 0 && getLocalDateStr(d.timestamp) === targetDateStr);

    const isToday = targetDateStr === getLocalDateStr();
    const dateLabel = isToday ? '(Hoy)' : `(${targetDateStr})`;

    return (
        <div className="p-4 h-full overflow-auto flex flex-col gap-4">
            {role === 'ADMIN' && (
                <div className="bg-white p-3 rounded-xl shadow border border-gray-200 flex justify-between items-center shrink-0">
                    <span className="font-bold text-gray-700 flex items-center gap-2"><History className="w-5 h-5 text-blue-600" /> Fecha del Historial:</span>
                    <CustomDateInput type="date" value={historyDate} onChange={setHistoryDate} />
                </div>
            )}

            {role === 'ADMIN' && (
                <div className="mb-4">
                    {isFetchingDeleted ? (
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 text-center text-gray-500 font-medium">
                            <Loader2 className="animate-spin inline mr-2" size={16} /> Cargando...
                        </div>
                    ) : deletedTickets.length > 0 ? (
                        <div className="bg-white rounded-xl shadow overflow-hidden h-fit border border-red-200">
                            <div className="p-4 bg-red-50 border-b font-bold text-red-800 flex justify-between items-center">
                                <div className="flex items-center gap-2"><Trash2 className="w-4 h-4 text-red-600" /> Tickets Eliminados {dateLabel} ({deletedTickets.length})</div>
                            </div>
                            <div className="overflow-auto max-h-[60vh]">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-red-50 font-bold text-red-800 sticky top-0 shadow-sm z-10">
                                        <tr>
                                            <th className="p-3">ID</th>
                                            <th className="p-3">Hora Creado</th>
                                            <th className="p-3">Hora Eliminado</th>
                                            <th className="p-3">Descripción</th>
                                            <th className="p-3">Servicio / Extras</th>
                                            <th className="p-3 text-right">Monto Original</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {deletedTickets.map(t => (
                                            <tr key={t.id} className="border-t hover:bg-red-50 transition-colors bg-red-50/30">
                                                <td className="p-3 font-mono text-xs">#{t.id.slice(-4).toUpperCase()}</td>
                                                <td className="p-3 text-gray-500">{t.timestamp instanceof Date ? t.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}</td>
                                                <td className="p-3 text-red-600 font-bold">{t.deletedAt instanceof Date ? t.deletedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/D'}</td>
                                                <td className="p-3 font-bold text-gray-700 uppercase">{t.vehicleDesc || '-'}</td>
                                                <td className="p-3">
                                                    <div className="font-medium text-gray-800">{t.service?.label || 'Extras Solo'} {t.size ? `(${t.size.label})` : ''}</div>
                                                    {t.extras && t.extras.length > 0 && <div className="text-xs text-gray-500 mt-1">+{t.extras.map(e => e.label).join(', ')}</div>}
                                                </td>
                                                <td className="p-3 font-bold text-gray-500 line-through text-right">{formatCurrency(t.price)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-gray-50 text-gray-500 p-4 rounded-xl shadow-sm border border-gray-200 text-center font-medium flex items-center justify-center gap-2">
                            <Trash2 className="w-4 h-4 opacity-50" /> 0 tickets eliminados para esta fecha.
                        </div>
                    )}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl shadow overflow-hidden h-fit border border-gray-200">
                    <div className="p-4 bg-gray-50 border-b font-bold text-gray-700 flex justify-between items-center">
                        <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-600" /> Tickets Pagados {dateLabel}</div>
                    </div>
                    <div className="overflow-auto max-h-[60vh] md:max-h-[80vh]">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 font-bold text-gray-700 sticky top-0 shadow-sm z-10">
                                <tr>
                                    <th className="p-3">ID</th>
                                    <th className="p-3">Hora</th>
                                    <th className="p-3">Descripción</th>
                                    <th className="p-3">Servicio</th>
                                    <th className="p-3 text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {targetTickets.map(t => (
                                    <tr key={t.id} className="border-t hover:bg-gray-50">
                                        <td className="p-3 font-mono text-xs">#{t.id.slice(-4).toUpperCase()}</td>
                                        <td className="p-3">{t.timestamp instanceof Date ? t.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}</td>
                                        <td className="p-3 font-bold text-gray-700 uppercase">{t.vehicleDesc || '-'}</td>
                                        <td className="p-3">
                                            <div className="font-medium">{t.service?.label || 'Extras'}</div>
                                            {t.snackCount > 0 && <span className="text-xs text-orange-600 font-bold block">(+{t.snackCount} Snacks)</span>}
                                        </td>
                                        <td className="p-3 font-bold text-green-600 text-right">{formatCurrency(t.price)}</td>
                                    </tr>
                                ))}
                                {targetTickets.length === 0 && (
                                    <tr><td colSpan="5" className="p-4 text-center text-gray-400">No hay tickets registrados en esta fecha.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow overflow-hidden h-fit border border-gray-200">
                    <div className="p-4 bg-gray-50 border-b font-bold text-gray-700 flex justify-between items-center">
                        <span>Deducciones {dateLabel}</span><Coffee className="w-4 h-4 text-orange-500" />
                    </div>
                    <div className="overflow-auto max-h-[60vh] md:max-h-[80vh]">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-orange-50 font-bold text-orange-800 sticky top-0 shadow-sm z-10">
                                <tr><th className="p-3">Fecha</th><th className="p-3">Empleado</th><th className="p-3">Detalle</th><th className="p-3 text-right">Monto</th></tr>
                            </thead>
                            <tbody>
                                {targetDeductions.map(d => <tr key={d.id} className="border-t hover:bg-orange-50"><td className="p-3">{d.timestamp instanceof Date ? d.timestamp.toLocaleDateString() : '...'}</td><td className="p-3 font-bold">{d.employee}</td><td className="p-3 text-gray-600 italic">{d.description || 'Snack'}</td><td className="p-3 font-bold text-red-500 text-right">-{formatCurrency(d.amount)}</td></tr>)}
                                {targetDeductions.length === 0 && (
                                    <tr><td colSpan="4" className="p-4 text-center text-gray-400">No hay deducciones registradas en esta fecha.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

LP.HistoryView = HistoryView;
