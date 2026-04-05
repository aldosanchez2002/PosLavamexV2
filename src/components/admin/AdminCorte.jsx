window.LP = window.LP || {};
const LP = window.LP;

const { useState, useEffect, useContext } = React;
const {
    TrendingUp, Banknote, CreditCard, ShieldCheck, Printer,
    AlertTriangle, ClipboardList, Loader2, Save, X, Check, Pencil
} = window.lucideReact;

const AdminCorte = () => {
    const {
        history, tickets, expenses, deductions, exRate, updateExpense,
        resolveExpense, cashCounts, cashDrops, cashIns, getOpeningCash, setView, db
    } = useContext(LP.AppContext);

    const formatCurrency = LP.formatCurrency;
    const getLocalDateStr = LP.getLocalDateStr;
    const getMonthStr = LP.getMonthStr;
    const getDefaultPayPeriod = LP.getDefaultPayPeriod;
    const computeCorteTotals = LP.computeCorteTotals;
    const CustomDateInput = LP.CustomDateInput;
    const DateRangeSelector = LP.DateRangeSelector;
    const Button = LP.Button;
    const PdfService = LP.PdfService;

    const [corteMode, setCorteMode] = useState('DAY');
    const [corteDate, setCorteDate] = useState(getLocalDateStr());
    const [corteMonth, setCorteMonth] = useState(getMonthStr());
    const [corteRangeStart, setCorteRangeStart] = useState(() => getDefaultPayPeriod().start);
    const [corteRangeEnd, setCorteRangeEnd] = useState(() => getDefaultPayPeriod().end);
    const [editingExpenseId, setEditingExpenseId] = useState(null);
    const [editExpDesc, setEditExpDesc] = useState('');
    const [editExpAmt, setEditExpAmt] = useState('');
    const [localData, setLocalData] = useState(null);
    const [isFetching, setIsFetching] = useState(false);
    const [historialData, setHistorialData] = useState(null);

    useEffect(() => {
        const { getDocs, query, collection, where, orderBy } = LP.firebase;
        const fourteenDaysAgo = new Date();
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
        fourteenDaysAgo.setHours(0, 0, 0, 0);
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        Promise.all([
            getDocs(query(collection(db, "tickets"), where("status", "==", "PAID"), where("paidAt", ">=", fourteenDaysAgo), where("paidAt", "<", todayStart), orderBy("paidAt", "asc"))),
            getDocs(query(collection(db, "expenses"), where("timestamp", ">=", fourteenDaysAgo), where("timestamp", "<", todayStart), orderBy("timestamp", "asc"))),
            getDocs(query(collection(db, "cash_drops"), where("timestamp", ">=", fourteenDaysAgo), where("timestamp", "<", todayStart), orderBy("timestamp", "asc"))),
            getDocs(query(collection(db, "cash_ins"), where("timestamp", ">=", fourteenDaysAgo), where("timestamp", "<", todayStart), orderBy("timestamp", "asc"))),
        ]).then(([ticketsSnap, expSnap, dropsSnap, insSnap]) => {
            setHistorialData({
                tickets: ticketsSnap.docs.map(d => ({ id: d.id, ...d.data(), timestamp: d.data().timestamp?.toDate() || new Date(), paidAt: d.data().paidAt?.toDate() || null })),
                expenses: expSnap.docs.map(d => ({ id: d.id, ...d.data(), timestamp: d.data().timestamp?.toDate() || new Date() })),
                cashDrops: dropsSnap.docs.map(d => ({ id: d.id, ...d.data(), timestamp: d.data().timestamp?.toDate() || new Date() })),
                cashIns: insSnap.docs.map(d => ({ id: d.id, ...d.data(), timestamp: d.data().timestamp?.toDate() || new Date() })),
            });
        });
    }, []);

    useEffect(() => {
        const { getDocs, query, collection, where, orderBy } = LP.firebase;

        let qStart, qEnd;
        if (corteMode === 'DAY') {
            qStart = new Date(corteDate + 'T00:00:00');
            qEnd = new Date(corteDate + 'T23:59:59.999');
        } else if (corteMode === 'MONTH') {
            qStart = new Date(corteMonth + '-01T00:00:00');
            const [y, m] = corteMonth.split('-').map(Number);
            qEnd = new Date(y, m, 0, 23, 59, 59, 999);
        } else {
            qStart = new Date(corteRangeStart + 'T00:00:00');
            qEnd = new Date(corteRangeEnd + 'T23:59:59.999');
        }

        if (corteMode === 'DAY' && corteDate === getLocalDateStr()) { setLocalData(null); return; }

        setIsFetching(true);
        Promise.all([
            getDocs(query(collection(db, "tickets"), where("status", "==", "PAID"), where("paidAt", ">=", qStart), where("paidAt", "<=", qEnd), orderBy("paidAt", "desc"))),
            getDocs(query(collection(db, "expenses"), where("timestamp", ">=", qStart), where("timestamp", "<=", qEnd), orderBy("timestamp", "desc"))),
            getDocs(query(collection(db, "cash_drops"), where("timestamp", ">=", qStart), where("timestamp", "<=", qEnd), orderBy("timestamp", "desc"))),
            getDocs(query(collection(db, "cash_ins"), where("timestamp", ">=", qStart), where("timestamp", "<=", qEnd), orderBy("timestamp", "desc"))),
            getDocs(query(collection(db, "deductions"), where("timestamp", ">=", qStart), where("timestamp", "<=", qEnd), orderBy("timestamp", "desc"))),
        ]).then(([ticketsSnap, expSnap, dropsSnap, insSnap, deducsSnap]) => {
            setLocalData({
                history: ticketsSnap.docs.map(d => ({ id: d.id, ...d.data(), timestamp: d.data().timestamp?.toDate() || new Date(), paidAt: d.data().paidAt?.toDate() || null })),
                expenses: expSnap.docs.map(d => ({ id: d.id, ...d.data(), timestamp: d.data().timestamp?.toDate() || new Date() })),
                cashDrops: dropsSnap.docs.map(d => ({ id: d.id, ...d.data(), timestamp: d.data().timestamp?.toDate() || new Date() })),
                cashIns: insSnap.docs.map(d => ({ id: d.id, ...d.data(), timestamp: d.data().timestamp?.toDate() || new Date() })),
                deductions: deducsSnap.docs.map(d => { const data = d.data(); return { id: d.id, ...data, timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : (data.timestamp || new Date()) }; }),
            });
            setIsFetching(false);
        });
    }, [corteMode, corteDate, corteMonth, corteRangeStart, corteRangeEnd]);

    const activeHistory = localData ? localData.history : history.concat(tickets.filter(t => t.status === 'PAID'));
    const activeExpenses = localData ? localData.expenses : expenses;
    const activeDrops = localData ? localData.cashDrops : cashDrops;
    const activeIns = localData ? localData.cashIns : cashIns;
    const activeDeductions = localData ? localData.deductions : deductions;

    const rStart = new Date(corteRangeStart + 'T00:00:00');
    const rEnd = new Date(corteRangeEnd + 'T23:59:59.999');

    const isDateInMode = (d) => {
        if (corteMode === 'DAY') return getLocalDateStr(d) === corteDate;
        if (corteMode === 'MONTH') return getMonthStr(d) === corteMonth;
        if (corteMode === 'RANGE') return d >= rStart && d <= rEnd;
        return false;
    };

    const corteTickets = activeHistory.filter(t => {
        const d = new Date(t.paidAt ? t.paidAt : t.timestamp);
        return isDateInMode(d);
    });

    const corteExpenses = activeExpenses.filter(e => isDateInMode(new Date(e.timestamp)));
    const corteDrops = activeDrops.filter(d => isDateInMode(new Date(d.timestamp)));
    const corteCashIns = activeIns.filter(d => isDateInMode(new Date(d.timestamp)));
    const corteDeductions = activeDeductions.filter(d => isDateInMode(new Date(d.timestamp)));

    const calculateItemStats = () => {
        const stats = {
            snacks: { customerCount: 0, internalCount: 0, totalCount: 0, moneyCustomer: 0, moneyInternal: 0 },
            pinos: { count: 0, money: 0 },
            boleadas: { count: 0, money: 0 }
        };

        corteTickets.forEach(t => {
            if (t.extras && Array.isArray(t.extras)) {
                t.extras.forEach(e => {
                    if (['PINO', 'QA_PINO'].includes(e.id)) {
                        stats.pinos.count += 1;
                        stats.pinos.money += (e.price || 0);
                    }
                    if (['BOLEADA', 'QA_BOLEADA'].includes(e.id)) {
                        stats.boleadas.count += 1;
                        stats.boleadas.money += (e.price || 0);
                    }
                });
            }
            if (t.snackCount > 0) {
                stats.snacks.customerCount += t.snackCount;
                const extrasTotal = (t.extras || []).reduce((a, b) => a + (b.price || 0), 0);
                const serviceTotal = t.basePrice || 0;
                const impliedSnackRevenue = (t.price || 0) - serviceTotal - extrasTotal;
                stats.snacks.moneyCustomer += Math.max(0, impliedSnackRevenue);
            }
        });

        corteDeductions.forEach(d => {
            const desc = (d.description || '').toLowerCase().trim();
            if (desc === 'snack' || desc === 'snacks') {
                stats.snacks.internalCount += 1;
                stats.snacks.moneyInternal += (d.amount || 0);
            }
        });

        stats.snacks.totalCount = stats.snacks.customerCount + stats.snacks.internalCount;
        return stats;
    };
    const itemStats = calculateItemStats();

    let corteStartDateObj;
    if (corteMode === 'DAY') {
        corteStartDateObj = new Date(corteDate + 'T00:00:00');
    } else if (corteMode === 'MONTH') {
        corteStartDateObj = new Date(corteMonth + '-01T00:00:00');
    } else {
        corteStartDateObj = new Date(corteRangeStart + 'T00:00:00');
    }
    const corteTotals = computeCorteTotals(corteTickets, corteExpenses, corteDrops, corteCashIns, corteStartDateObj, getOpeningCash, exRate);

    const printCorte = () => {
        const relevantArqueos = cashCounts.filter(c => isDateInMode(new Date(c.timestamp))).sort((a, b) => a.timestamp - b.timestamp);

        let typeLabel = 'Diario';
        let dateLabelText = corteDate;
        if (corteMode === 'MONTH') { typeLabel = 'Mensual'; dateLabelText = corteMonth; }
        else if (corteMode === 'RANGE') { typeLabel = 'Rango'; dateLabelText = `${corteRangeStart} al ${corteRangeEnd}`; }

        const data = {
            type: typeLabel,
            dateLabel: dateLabelText,
            totals: corteTotals,
            tickets: corteTickets,
            expenses: corteExpenses.filter(e => e.status === 'APPROVED'),
            cashIns: corteCashIns,
            itemStats: itemStats,
            arqueos: {
                first: relevantArqueos.length > 0 ? relevantArqueos[0] : null,
                last: relevantArqueos.length > 0 ? relevantArqueos[relevantArqueos.length - 1] : null
            }
        };
        PdfService.generateCorte(data);
    };

    const saveEditedExpense = () => { if (editingExpenseId) { updateExpense(editingExpenseId, { description: editExpDesc, amount: parseFloat(editExpAmt) || 0 }); setEditingExpenseId(null); } };

    const overnightDescuadre = (() => {
        const todayStr = getLocalDateStr();
        const todayArqueos = cashCounts
            .filter(c => getLocalDateStr(c.timestamp) === todayStr)
            .sort((a, b) => a.timestamp - b.timestamp);

        if (todayArqueos.length === 0) return null;

        const todayFirst = todayArqueos[0];
        const prevArqueos = cashCounts
            .filter(c => getLocalDateStr(c.timestamp) < todayStr)
            .sort((a, b) => b.timestamp - a.timestamp);

        if (prevArqueos.length === 0) return null;

        const lastPrevDay = getLocalDateStr(prevArqueos[0].timestamp);
        const prevClosing = prevArqueos[0];

        const diffMxn = (todayFirst.declaredMxn || 0) - (prevClosing.declaredMxn || 0);
        const diffUsd = (todayFirst.declaredUsd || 0) - (prevClosing.declaredUsd || 0);

        if (Math.abs(diffMxn) <= 1 && Math.abs(diffUsd) <= 0.1) return null;

        return { prevClosing, todayFirst, diffMxn, diffUsd, lastPrevDay };
    })();

    if (isFetching) return (
        <div className="flex items-center justify-center p-16 text-gray-400 gap-3">
            <Loader2 className="animate-spin w-6 h-6" />
            <span>Cargando datos históricos...</span>
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {overnightDescuadre && (
                <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded shadow-sm flex items-start gap-3">
                    <AlertTriangle className="shrink-0 mt-1" />
                    <div>
                        <p className="font-bold">¡Descuadre Nocturno! El saldo cambió entre el cierre y la apertura</p>
                        <p className="text-sm">
                            Cierre del {overnightDescuadre.lastPrevDay}: MXN {formatCurrency(overnightDescuadre.prevClosing.declaredMxn)} / USD ${(overnightDescuadre.prevClosing.declaredUsd || 0).toFixed(2)}<br />
                            Apertura de hoy: MXN {formatCurrency(overnightDescuadre.todayFirst.declaredMxn)} / USD ${(overnightDescuadre.todayFirst.declaredUsd || 0).toFixed(2)}<br />
                            Diferencia: MXN {formatCurrency(overnightDescuadre.diffMxn)} / USD ${overnightDescuadre.diffUsd.toFixed(2)}
                        </p>
                    </div>
                </div>
            )}

            <div className="bg-white p-4 rounded-xl shadow-sm border flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
                    <button onClick={() => setCorteMode('DAY')} className={`px-3 py-1 rounded-md text-sm font-bold ${corteMode === 'DAY' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}>Día</button>
                    <button onClick={() => setCorteMode('MONTH')} className={`px-3 py-1 rounded-md text-sm font-bold ${corteMode === 'MONTH' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}>Mes</button>
                    <button onClick={() => setCorteMode('RANGE')} className={`px-3 py-1 rounded-md text-sm font-bold ${corteMode === 'RANGE' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}>Rango</button>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {corteMode === 'DAY' && <CustomDateInput type="date" value={corteDate} onChange={setCorteDate} />}
                    {corteMode === 'MONTH' && <CustomDateInput type="month" value={corteMonth} onChange={setCorteMonth} />}
                    {corteMode === 'RANGE' && (
                        <DateRangeSelector start={corteRangeStart} end={corteRangeEnd} onRangeChange={(s, e) => { setCorteRangeStart(s); setCorteRangeEnd(e); }} />
                    )}
                </div>
                <Button onClick={printCorte}><Printer size={18} /> PDF</Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div onClick={() => setView('HISTORY')} className="cursor-pointer hover:scale-105 transition-transform bg-gradient-to-br from-green-500 to-emerald-600 text-white p-6 rounded-xl shadow-lg"><div className="flex items-center gap-2 mb-1 opacity-90"><TrendingUp size={18} /> Venta Total</div><div className="text-3xl font-bold">{formatCurrency(corteTotals.total)}</div><div className="text-sm opacity-80 mt-1">{corteTickets.length} Tickets</div></div>

                <div onClick={printCorte} className="cursor-pointer hover:scale-105 transition-transform bg-white p-4 rounded-xl shadow border border-gray-100 flex flex-col justify-center">
                    <div className="flex items-center gap-2 mb-2 text-gray-500 font-bold text-sm"><Banknote size={18} /> En Caja </div>
                    <div className="mb-2">
                        <div className="flex justify-between items-end">
                            <span className="text-xs text-gray-400 font-bold">MXN</span>
                            <span className="text-2xl font-bold text-blue-900">{formatCurrency(corteTotals.cashNetMxn)}</span>
                        </div>
                        {corteTotals.cashInsMxn > 0 && <div className="text-xs text-green-600 text-right font-bold">Incl. +{formatCurrency(corteTotals.cashInsMxn)} Ingresos</div>}
                    </div>
                    <div className="pt-2 border-t border-dashed">
                        <div className="flex justify-between items-end">
                            <span className="text-xs text-gray-400 font-bold">USD</span>
                            <span className="text-2xl font-bold text-green-700">${corteTotals.cashNetUsd.toFixed(2)}</span>
                        </div>
                        {corteTotals.cashInsUsd > 0 && <div className="text-xs text-green-600 text-right font-bold">Incl. +${corteTotals.cashInsUsd.toFixed(2)} Ingresos</div>}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow border border-gray-100"><div className="flex items-center gap-2 mb-1 text-gray-500 font-bold text-sm"><ShieldCheck size={18} /> Envios/Retiros</div><div className="text-3xl font-bold text-orange-600">{formatCurrency(corteTotals.dropsMxn)}</div><div className="text-xs text-green-600 font-bold mt-1">+ ${corteTotals.dropsUsd.toFixed(2)} USD</div></div>
                <div className="bg-white p-6 rounded-xl shadow border border-gray-100"><div className="flex items-center gap-2 mb-1 text-gray-500 font-bold text-sm"><CreditCard size={18} /> Tarjeta</div><div className="text-3xl font-bold text-blue-600">{formatCurrency(corteTotals.card)}</div></div>
            </div>

            <div className="bg-white rounded-xl shadow border overflow-hidden">
                <div className="p-4 bg-orange-50 border-b border-orange-100 font-bold text-orange-800 flex justify-between items-center">
                    <span>Retiros de Efectivo (Drops)</span>
                    <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-orange-100 text-orange-800">
                            <tr>
                                <th className="p-3">Código</th>
                                <th className="p-3">Hora</th>
                                <th className="p-3">Usuario</th>
                                <th className="p-3 text-right">Monto MXN</th>
                                <th className="p-3 text-right">Monto USD</th>
                            </tr>
                        </thead>
                        <tbody>
                            {corteDrops.length === 0 ? <tr><td colSpan="5" className="p-4 text-center text-gray-400">No hay retiros registrados en este periodo.</td></tr> : corteDrops.map(d => (
                                <tr key={d.id} className="border-t hover:bg-orange-50">
                                    <td className="p-3 font-mono font-bold text-xs">{d.code}</td>
                                    <td className="p-3">{d.timestamp.toLocaleTimeString()}</td>
                                    <td className="p-3">{d.user}</td>
                                    <td className="p-3 text-right font-bold">{formatCurrency(d.amountMxn)}</td>
                                    <td className="p-3 text-right font-bold text-green-600">${d.amountUsd.toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow border overflow-hidden">
                <div className="p-4 bg-gray-50 border-b font-bold text-gray-700 flex justify-between items-center"><span>Gastos</span><span className="text-sm text-red-500 font-bold">Total: {formatCurrency(corteTotals.expenses)}</span></div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left"><thead className="bg-gray-50 text-gray-500"><tr><th className="p-3">Concepto</th><th className="p-3">Monto</th><th className="p-3">Estado</th><th className="p-3 text-right">Acción</th></tr></thead><tbody>{corteExpenses.map(e => <tr key={e.id} className="border-t hover:bg-gray-50"><td className="p-3">{editingExpenseId === e.id ? <input value={editExpDesc} onChange={ev => setEditExpDesc(ev.target.value)} className="border p-1 rounded w-full" /> : e.description}</td><td className="p-3 font-bold text-red-600">{editingExpenseId === e.id ? <input type="number" value={editExpAmt} onChange={ev => setEditExpAmt(ev.target.value)} className="border p-1 rounded w-24" /> : `-${formatCurrency(e.amount)}`}</td><td className="p-3"><span className={`px-2 py-1 rounded text-xs font-bold ${e.status === 'APPROVED' ? 'bg-green-100 text-green-700' : (e.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700')}`}>{e.status}</span></td><td className="p-3 text-right">{editingExpenseId === e.id ? <div className="flex justify-end gap-2"><button onClick={saveEditedExpense} className="bg-blue-100 text-blue-700 p-1 rounded hover:bg-blue-200"><Save size={16} /></button><button onClick={() => setEditingExpenseId(null)} className="bg-gray-100 text-gray-700 p-1 rounded hover:bg-gray-200"><X size={16} /></button></div> : <div className="flex justify-end gap-2 items-center">{e.status === 'APPROVED' && <button onClick={() => { setEditingExpenseId(e.id); setEditExpDesc(e.description); setEditExpAmt(e.amount); }} className="text-gray-400 hover:text-blue-500"><Pencil size={14} /></button>}{e.status === 'PENDING' && <><button onClick={() => resolveExpense(e.id, 'APPROVED')} className="bg-green-100 text-green-700 p-1 rounded hover:bg-green-200"><Check size={16} /></button><button onClick={() => resolveExpense(e.id, 'REJECTED')} className="bg-red-100 text-red-700 p-1 rounded hover:bg-red-200"><X size={16} /></button></>}</div>}</td></tr>)}</tbody></table>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow border overflow-hidden">
                <div className="p-4 bg-gray-50 border-b font-bold text-gray-700 flex justify-between items-center">
                    <span>Historial de Cortes (Últimos 14 días)</span>
                    <ClipboardList className="w-4 h-4 text-gray-400" />
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500">
                            <tr>
                                <th className="p-3">Fecha</th>
                                <th className="p-3">Primer Arqueo</th>
                                <th className="p-3">Último Arqueo</th>
                                <th className="p-3 text-right">Dif Total (MXN)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(() => {
                                const days = [];
                                const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
                                const todayStr = getLocalDateStr();
                                for (let i = 1; i <= 14; i++) {
                                    const d = new Date();
                                    d.setDate(d.getDate() - i);
                                    const ds = getLocalDateStr(d);
                                    if (ds !== todayStr) days.push(ds);
                                }
                                if (!historialData) return null;
                                return days.map(dateStr => {
                                    const dayStart = new Date(dateStr + 'T00:00:00');
                                    const dayEnd = new Date(dateStr + 'T23:59:59.999');
                                    const dayTickets = historialData.tickets.filter(t => {
                                        const pd = t.paidAt || t.timestamp;
                                        return pd >= dayStart && pd <= dayEnd;
                                    });
                                    const dayExpenses = historialData.expenses.filter(e => { const d = new Date(e.timestamp); return d >= dayStart && d <= dayEnd; });
                                    const dayDrops = historialData.cashDrops.filter(d => { const dt = new Date(d.timestamp); return dt >= dayStart && dt <= dayEnd; });
                                    const dayCashIns = historialData.cashIns.filter(d => { const dt = new Date(d.timestamp); return dt >= dayStart && dt <= dayEnd; });
                                    const dayArqueos = cashCounts.filter(c => { const dt = new Date(c.timestamp); return dt >= dayStart && dt <= dayEnd; }).sort((a, b) => a.timestamp - b.timestamp);
                                    const totals = computeCorteTotals(dayTickets, dayExpenses, dayDrops, dayCashIns, dayStart, getOpeningCash, exRate);
                                    const dateObj = new Date(dateStr + 'T12:00:00');
                                    const dayLabel = `${dayNames[dateObj.getDay()]} ${dateStr}`;
                                    const firstArqueoObj = dayArqueos.length > 0 ? dayArqueos[0] : null;
                                    const lastArqueoObj = dayArqueos.length > 0 ? dayArqueos[dayArqueos.length - 1] : null;
                                    const firstArqueo = firstArqueoObj ? firstArqueoObj.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';
                                    const lastArqueo = lastArqueoObj ? lastArqueoObj.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';
                                    const finalRate = lastArqueoObj ? (lastArqueoObj.exchangeRate || exRate) : exRate;
                                    const totalDiffMxn = lastArqueoObj
                                        ? (lastArqueoObj.declaredMxn - totals.cashNetMxn) + ((lastArqueoObj.declaredUsd - totals.cashNetUsd) * finalRate)
                                        : 0;
                                    const isPositive = totalDiffMxn >= 0;
                                    return (
                                        <tr key={dateStr} className="border-t hover:bg-gray-50">
                                            <td className="p-3 font-semibold text-gray-700">{dayLabel}</td>
                                            <td className="p-3 text-gray-500">{firstArqueo}</td>
                                            <td className="p-3 text-gray-500">{lastArqueo}</td>
                                            <td className={`p-3 text-right font-black ${isPositive ? 'text-green-700' : 'text-red-700'}`}>{formatCurrency(totalDiffMxn)}</td>
                                        </tr>
                                    );
                                });
                            })()}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

LP.AdminCorte = AdminCorte;
