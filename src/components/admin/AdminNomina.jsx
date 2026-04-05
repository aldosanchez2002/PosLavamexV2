(function() {
window.LP = window.LP || {};
const LP = window.LP;

const { useState, useEffect, useContext } = React;
const { Users, Printer, FileText, Loader2 } = window.lucideReact;

const AdminNomina = () => {
    const { employees, history, deductions, commissions, extrasList, db, tickets } = useContext(LP.AppContext);

    const formatCurrency = LP.formatCurrency;
    const getLocalDateStr = LP.getLocalDateStr;
    const getDefaultPayPeriod = LP.getDefaultPayPeriod;
    const calculatePayroll = LP.calculatePayroll;
    const DateRangeSelector = LP.DateRangeSelector;
    const Modal = LP.Modal;
    const Button = LP.Button;
    const PdfService = LP.PdfService;
    const SIZES = LP.SIZES;
    const SERVICES = LP.SERVICES;

    const [startDate, setStartDate] = useState(() => getDefaultPayPeriod().start);
    const [endDate, setEndDate] = useState(() => getDefaultPayPeriod().end);
    const [attendanceData, setAttendanceData] = useState([]);
    const [localHistory, setLocalHistory] = useState(null);
    const [localDeductions, setLocalDeductions] = useState(null);
    const [isFetchingNomina, setIsFetchingNomina] = useState(false);

    const [previewData, setPreviewData] = useState(null);
    const [previewName, setPreviewName] = useState(null);

    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T23:59:59.999');

    useEffect(() => {
        const { getDocs, query, collection, where } = LP.firebase;
        const fetchAttendance = async () => {
            const q = query(collection(db, "attendance"), where("date", ">=", startDate), where("date", "<=", endDate));
            const snap = await getDocs(q);
            setAttendanceData(snap.docs.map(d => d.data()));
        };
        fetchAttendance();
    }, [startDate, endDate, db]);

    useEffect(() => {
        const { getDocs, query, collection, where, orderBy } = LP.firebase;

        if (startDate === getLocalDateStr() && endDate === getLocalDateStr()) { setLocalHistory(null); setLocalDeductions(null); return; }

        setIsFetchingNomina(true);
        Promise.all([
            getDocs(query(collection(db, "tickets"), where("status", "==", "PAID"), where("paidAt", ">=", start), where("paidAt", "<=", end), orderBy("paidAt", "desc"))),
            getDocs(query(collection(db, "deductions"), where("timestamp", ">=", start), where("timestamp", "<=", end), orderBy("timestamp", "desc"))),
        ]).then(([ticketsSnap, deducsSnap]) => {
            setLocalHistory(ticketsSnap.docs.map(d => ({ id: d.id, ...d.data(), timestamp: d.data().timestamp?.toDate() || new Date(), paidAt: d.data().paidAt?.toDate() || null })));
            setLocalDeductions(deducsSnap.docs.map(d => { const data = d.data(); return { id: d.id, ...data, timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : (data.timestamp || new Date()) }; }));
            setIsFetchingNomina(false);
        });
    }, [startDate, endDate]);

    const filterRange = (ts) => { if (!ts) return true; const date = new Date(ts.toDate ? ts.toDate() : ts); return date >= start && date <= end; };

    const activeNominaHistory = localHistory !== null ? localHistory : history.concat(tickets.filter(t => t.status === 'PAID'));
    const activeNominaDeductions = localDeductions !== null ? localDeductions : deductions;

    const rangeHistory = activeNominaHistory.filter(t => t.status === 'PAID' && filterRange(t.paidAt || t.timestamp));
    const rangeDeductions = activeNominaDeductions.filter(d => d.status === 'PENDING' && filterRange(d.timestamp));
    const payroll = calculatePayroll(employees, rangeHistory, rangeDeductions, commissions, extrasList);

    attendanceData.forEach(record => {
        Object.entries(record.records || {}).forEach(([empName, isPresent]) => {
            if (isPresent && payroll[empName]) {
                payroll[empName].daysWorked = (payroll[empName].daysWorked || 0) + 1;
                payroll[empName].datesWorked.push(record.date);
            }
        });
    });

    const totalNomina = Object.values(payroll).reduce((acc, p) => acc + p.netPay, 0);

    const printNomina = () => {
        PdfService.generateNomina(payroll, startDate, endDate, rangeHistory);
    };

    const printDetailedNomina = () => {
        if (!previewName) return;
        const { jsPDF } = window.jspdf;

        const empTickets = rangeHistory.filter(t => {
            const wList = t.washers || (t.washer ? [t.washer] : []);
            return wList.includes(previewName);
        }).map(t => {
            const wList = t.washers || (t.washer ? [t.washer] : []);
            const wCount = wList.length;
            let totalComm = t.commission || 0;
            if (!totalComm || totalComm === 0) {
                let base = 0;
                if (t.service && t.size && commissions[t.service?.id]) {
                    base = commissions[t.service.id][t.size.id] || 0;
                }
                const extrasTotal = (t.extras || []).reduce((acc, e) => {
                    const dbEx = extrasList.find(x => x.id === e.id);
                    return acc + (dbEx ? (dbEx.commission || 0) : (e.commission || 0));
                }, 0);
                totalComm = base + extrasTotal;
            }
            const dateObj = t.paidAt || t.timestamp;
            return {
                id: t.id,
                dateObj: dateObj,
                date: getLocalDateStr(dateObj),
                time: dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                vehicleDesc: t.vehicleDesc || '-',
                size: t.size?.label || '-',
                service: t.service?.label || 'Extras',
                extrasStr: t.extras && t.extras.length > 0 ? t.extras.map(e => e.label).join(', ') : '-',
                share: totalComm / wCount
            };
        }).sort((a, b) => a.dateObj - b.dateObj);

        const doc = new jsPDF();
        doc.setFontSize(16);
        doc.text(`Detalle de Nómina: ${previewName}`, 14, 20);
        doc.setFontSize(10);
        doc.text(`Periodo: ${startDate} al ${endDate}`, 14, 26);

        let currentY = 35;
        const grouped = {};
        empTickets.forEach(t => {
            if (!grouped[t.date]) grouped[t.date] = { tickets: [], subtotal: 0 };
            grouped[t.date].tickets.push(t);
            grouped[t.date].subtotal += t.share;
        });

        let grandTotal = 0;

        Object.keys(grouped).sort().forEach(date => {
            const group = grouped[date];
            grandTotal += group.subtotal;

            doc.setFontSize(12);
            doc.text(`Fecha: ${date} (Subtotal: ${formatCurrency(group.subtotal)})`, 14, currentY);
            currentY += 5;

            const body = group.tickets.map(t => [
                t.time,
                `#${t.id.slice(-4).toUpperCase()}`,
                t.vehicleDesc,
                t.size,
                t.service,
                t.extrasStr,
                formatCurrency(t.share)
            ]);

            doc.autoTable({
                startY: currentY,
                head: [['Hora', 'Ticket', 'Vehículo', 'Tamaño', 'Paquete', 'Extras', 'Comisión']],
                body: body,
                theme: 'grid',
                styles: { fontSize: 7, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.1 },
                headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0] },
                margin: { left: 10, right: 10 }
            });
            currentY = doc.lastAutoTable.finalY + 10;
            if (currentY > 270) {
                doc.addPage();
                currentY = 20;
            }
        });

        doc.setFontSize(14);
        doc.text(`TOTAL COMISIONES PERIODO: ${formatCurrency(grandTotal)}`, 14, currentY + 5);
        doc.save(`Detalle_Nomina_${previewName}_${startDate}_${endDate}.pdf`);
    };

    if (isFetchingNomina) return (
        <div className="flex items-center justify-center p-16 text-gray-400 gap-3">
            <Loader2 className="animate-spin w-6 h-6" />
            <span>Cargando datos históricos...</span>
        </div>
    );

    return (
        <div>
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-6 rounded-xl shadow-lg mb-6 flex justify-between items-center">
                <div><h2 className="text-2xl font-bold m-0 flex items-center gap-2"><Users className="w-6 h-6" /> Total Nómina</h2></div>
                <div className="text-4xl font-bold">{formatCurrency(totalNomina)}</div>
            </div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-100 gap-4">
                <div className="flex flex-wrap gap-3 items-end">
                    <DateRangeSelector label="Rango de Fechas" start={startDate} end={endDate} onRangeChange={(s, e) => { setStartDate(s); setEndDate(e); }} />
                    <Button onClick={printNomina} variant="success"><Printer className="w-4 h-4" /> PDF</Button>
                </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.keys(payroll).map(name => (
                    <div key={name} onClick={() => { setPreviewData(payroll[name]); setPreviewName(name); }} className="bg-white p-5 rounded-xl shadow-sm border border-l-4 border-l-blue-500 cursor-pointer hover:shadow-md transition-all hover:bg-blue-50/30">
                        <div className="font-bold text-xl text-gray-800 mb-1">{name}</div>
                        <div className="text-sm font-bold text-blue-600 mb-2">Días trabajados: {payroll[name].daysWorked || 0}</div>
                        <div className="text-3xl font-bold text-green-700">{formatCurrency(payroll[name].netPay)}</div>
                        <div className="text-sm text-gray-500 mt-2 flex justify-between border-t pt-2"><span>Com: {formatCurrency(payroll[name].total)}</span><span className="text-red-500 font-medium">Ded: {formatCurrency(payroll[name].deductionTotal)}</span></div>
                    </div>
                ))}
            </div>

            {previewData && (
                <Modal title={`Nómina: ${previewName}`} icon={FileText} onClose={() => { setPreviewData(null); setPreviewName(null); }}
                    footer={
                        <div className="flex gap-2">
                            <Button onClick={() => { setPreviewData(null); setPreviewName(null); }} variant="secondary" className="flex-1">Cerrar</Button>
                            <Button onClick={printDetailedNomina} variant="primary" className="flex-1"><Printer className="w-4 h-4" /> Detalle</Button>
                        </div>
                    }>
                    <div className="space-y-4">
                        <div className="bg-gray-50 p-4 rounded-lg border flex justify-between items-center">
                            <div>
                                <div className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Total a Pagar</div>
                                <div className="text-3xl font-bold text-green-700">{formatCurrency(previewData.netPay)}</div>
                            </div>
                            <div className="text-right text-xs">
                                <div className="text-gray-600 font-medium">Ingresos: {formatCurrency(previewData.total)}</div>
                                <div className="text-red-500 font-medium">Deducciones: -{formatCurrency(previewData.deductionTotal)}</div>
                            </div>
                        </div>

                        <div>
                            <h4 className="font-bold text-xs uppercase text-gray-500 mb-2 border-b pb-1">Desglose de Servicios</h4>
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs text-left">
                                    <thead>
                                        <tr className="bg-gray-100">
                                            <th className="p-1">Svc</th>
                                            {SIZES.map(s => <th key={s.id} className="p-1 text-center">{s.label.substring(0, 3)}</th>)}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {SERVICES.map(svc => {
                                            const rowCounts = SIZES.map(sz => previewData.serviceGrid[svc.id][sz.id] || 0);
                                            if (!rowCounts.some(c => c > 0)) return null;
                                            return (
                                                <tr key={svc.id} className="border-b last:border-0 hover:bg-gray-50">
                                                    <td className="p-1 font-medium">{svc.label}</td>
                                                    {rowCounts.map((c, i) => <td key={i} className="p-1 text-center text-gray-600">{c || '-'}</td>)}
                                                </tr>
                                            )
                                        })}
                                        {!SERVICES.some(svc => SIZES.some(sz => (previewData.serviceGrid[svc.id][sz.id] || 0) > 0)) && (
                                            <tr><td colSpan="5" className="p-2 text-center text-gray-400 italic">Sin servicios de lavado registrados</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {Object.keys(previewData.extrasData).length > 0 && (
                            <div>
                                <h4 className="font-bold text-xs uppercase text-blue-500 mb-2 border-b pb-1 mt-4">Comisiones Extra</h4>
                                <table className="w-full text-xs">
                                    <tbody>
                                        {Object.keys(previewData.extrasData).sort().map(k => (
                                            <tr key={k} className="border-b last:border-0">
                                                <td className="p-1">{k}</td>
                                                <td className="p-1 text-center text-gray-500">x{previewData.extrasData[k].count}</td>
                                                <td className="p-1 text-right font-bold text-gray-700">{formatCurrency(previewData.extrasData[k].total)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {previewData.deductionDetails.length > 0 && (
                            <div>
                                <h4 className="font-bold text-xs uppercase text-red-500 mb-2 border-b pb-1 mt-4">Deducciones</h4>
                                <table className="w-full text-xs">
                                    <tbody>
                                        {Object.entries(
                                            previewData.deductionDetails.reduce((acc, d) => {
                                                const rawDesc = d.desc || 'Varios';
                                                const isSnack = rawDesc.toLowerCase().includes('snack');
                                                const desc = isSnack ? 'Snacks' : rawDesc;
                                                if (!acc[desc]) acc[desc] = { count: 0, amount: 0 };
                                                acc[desc].count += 1;
                                                acc[desc].amount += d.amount;
                                                return acc;
                                            }, {})
                                        ).map(([desc, item], i) => (
                                            <tr key={i} className="border-b last:border-0">
                                                <td className="p-1">{item.count > 1 && desc === 'Snacks' ? `${desc} (x${item.count})` : desc}</td>
                                                <td className="p-1 text-right text-red-600 font-medium">-{formatCurrency(item.amount)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </Modal>
            )}
        </div>
    );
};

LP.AdminNomina = AdminNomina;

})();
