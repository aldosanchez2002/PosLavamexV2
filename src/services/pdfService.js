// pdfService.js — PDF generation service
// Requires jsPDF UMD (window.jspdf) and jspdf-autotable UMD loaded before this file
window.LP = window.LP || {};
const LP = window.LP;

const SIZES = LP.SIZES;
const SERVICES = LP.SERVICES;
const formatCurrency = LP.formatCurrency;

const PdfService = {
    generateNomina: (payroll, startDate, endDate, history = []) => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const formatDate = (s) => s ? s.split('-').reverse().join('-') : '';

        Object.keys(payroll).forEach((name, index) => {
            const p = payroll[name];
            if (p.count === 0 && p.deductionTotal === 0 && p.total === 0) return;
            if (index > 0) doc.addPage();

            if (p.role === 'SUPERVISOR') {
                doc.setFontSize(14);
                doc.text(`${name}`, 14, 25);
                doc.setFontSize(10);
                doc.text(`CURP: ${p.curp || 'NO REGISTRADO'}`, 14, 30);
                doc.text(`Periodo: ${formatDate(startDate)} al ${formatDate(endDate)}`, 14, 34);

                const dailyRate = 440.87;
                const daysWorked = p.daysWorked || 0;
                const baseWorked = daysWorked * dailyRate;
                const septimoDia = 440.87;
                const totalLegal = baseWorked + septimoDia;

                const targetTotal = p.total;
                const bono = targetTotal - totalLegal;

                let curY = 50;
                doc.text(`Salario Diario:`, 14, curY);
                doc.text(formatCurrency(dailyRate), 70, curY);

                curY += 6;
                doc.text(`Séptimo Día (Descanso Martes):`, 14, curY);
                doc.text(formatCurrency(septimoDia), 70, curY);

                curY += 6;
                doc.text(`${daysWorked} Días Trabajados.`, 14, curY);
                doc.text(formatCurrency(baseWorked), 70, curY);

                if (p.datesWorked && p.datesWorked.length > 0) {
                    doc.setFontSize(8);
                    doc.setTextColor(100, 100, 100);
                    p.datesWorked.sort().forEach(dateStr => {
                        curY += 4;
                        const dObj = new Date(dateStr + 'T00:00:00');
                        const formattedDate = new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }).format(dObj);
                        const displayDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
                        doc.text(`  - ${displayDate}`, 14, curY);
                    });
                    doc.setFontSize(10);
                    doc.setTextColor(0, 0, 0);
                }

                curY += 8;
                doc.setFont(undefined, 'bold');
                doc.text(`Total:`, 14, curY);
                doc.text(formatCurrency(totalLegal), 70, curY);
                doc.setFont(undefined, 'normal');

                curY += 15;
                doc.setFontSize(9);
                const legalText = "Recibí de LAVAMEX y/o Nancy Carmona Carrasco a mi entera conformidad el importe de mi sueldo normal por jornada diurna y demás prestaciones por el periodo que termina en la fecha que se anota, dando mi conformidad también a los descuentos de la ley de carácter privado que se me hacen, manifestando que a la fecha no se me adeuda ninguna cantidad por otro concepto.";
                const splitText = doc.splitTextToSize(legalText, 180);
                doc.text(splitText, 14, curY);

                curY += (splitText.length * 4) + 25;
                doc.line(70, curY, 140, curY);
                doc.text("Firma de Conformidad", 105, curY + 5, { align: 'center' });
                doc.text(name, 105, curY + 10, { align: 'center' });

                curY += 25;
                doc.setFontSize(10);
                doc.text(`Bono por desempeño:`, 14, curY);
                doc.text(formatCurrency(bono), 70, curY);

                curY += 6;
                doc.text(`Deducciones:`, 14, curY);
                doc.text(`-${formatCurrency(p.deductionTotal)}`, 70, curY);

                let boxY = curY + 15;
                doc.setDrawColor(0);
                doc.setFillColor(255, 255, 255);
                doc.rect(140, boxY, 50, 20);
                doc.setFontSize(12);
                doc.setFont(undefined, 'bold');
                doc.text("TOTAL A PAGAR", 165, boxY + 6, { align: 'center' });
                doc.setFontSize(16);
                doc.text(formatCurrency(p.netPay), 165, boxY + 15, { align: 'center' });
                doc.setFont(undefined, 'normal');

            } else {
                doc.setFontSize(14);
                doc.text(`${name}`, 14, 25);
                doc.setFontSize(10);
                doc.text(`Periodo: ${formatDate(startDate)} al ${formatDate(endDate)}`, 14, 30);

                doc.setFontSize(9);
                doc.setTextColor(60, 60, 60);
                doc.text(`${formatCurrency(p.total)} Subtotal Ingresos`, 14, 38);
                doc.text(`-${formatCurrency(p.deductionTotal)} Deducciones`, 14, 42);
                doc.setFont(undefined, 'bold');
                doc.text(`${formatCurrency(p.netPay)} Total`, 14, 46);
                doc.setFont(undefined, 'normal');
                doc.setTextColor(0);

                const head = [['Servicio', ...SIZES.map(s => s.label)]];
                const body = [];
                SERVICES.forEach(svc => {
                    const rowCounts = SIZES.map(sz => p.serviceGrid[svc.id][sz.id] || 0);
                    if (rowCounts.some(c => c > 0)) {
                        body.push([svc.label, ...rowCounts.map(c => c || '-')]);
                    }
                });

                const tableStyles = {
                    theme: 'grid',
                    headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', lineWidth: 0.1, lineColor: [0, 0, 0] },
                    bodyStyles: { textColor: [0, 0, 0], lineWidth: 0.1, lineColor: [0, 0, 0] },
                    styles: { fontSize: 8, cellPadding: 1, lineColor: [0, 0, 0] }
                };

                if (body.length > 0) {
                    doc.autoTable({
                        startY: 52,
                        head: head,
                        body: body,
                        ...tableStyles
                    });
                } else {
                    doc.lastAutoTable = { finalY: 52 };
                }

                let currentY = doc.lastAutoTable.finalY + 10;

                const extraKeys = Object.keys(p.extrasData)
                    .filter(k => p.extrasData[k].total > 0)
                    .sort();

                if (extraKeys.length > 0) {
                    const extrasBody = extraKeys.map(k => [k, p.extrasData[k].count, formatCurrency(p.extrasData[k].total)]);
                    doc.autoTable({
                        startY: currentY,
                        head: [['Concepto', 'Cant', 'Total']],
                        body: extrasBody,
                        ...tableStyles,
                        margin: { right: 100 }
                    });
                    currentY = doc.lastAutoTable.finalY + 10;
                }

                if (p.deductionDetails && p.deductionDetails.length > 0) {
                    const groupedDeductions = {};
                    p.deductionDetails.forEach(d => {
                        const rawDesc = d.desc || 'Varios';
                        const isSnack = rawDesc.toLowerCase().includes('snack');
                        const desc = isSnack ? 'Snacks' : rawDesc;

                        if (!groupedDeductions[desc]) {
                            groupedDeductions[desc] = { count: 0, amount: 0 };
                        }
                        groupedDeductions[desc].count += 1;
                        groupedDeductions[desc].amount += d.amount;
                    });

                    const dedBody = Object.keys(groupedDeductions).map(desc => {
                        const item = groupedDeductions[desc];
                        const label = item.count > 1 ? `${desc} (x${item.count})` : desc;
                        return [label, formatCurrency(item.amount)];
                    });

                    dedBody.push(['TOTAL DEDUCCIONES', formatCurrency(p.deductionTotal)]);

                    doc.autoTable({
                        startY: currentY,
                        head: [['Concepto', 'Monto']],
                        body: dedBody,
                        ...tableStyles,
                        margin: { right: 100 },
                        didParseCell: function (data) {
                            if (data.row.index === dedBody.length - 1) {
                                data.cell.styles.fontStyle = 'bold';
                            }
                        }
                    });
                    currentY = doc.lastAutoTable.finalY + 10;
                } else if (p.deductionTotal > 0) {
                    doc.setTextColor(0, 0, 0);
                    doc.text(`Deducciones: -${formatCurrency(p.deductionTotal)}`, 14, currentY);
                    doc.setTextColor(0);
                    currentY += 10;
                }

                if (p.debugDetails && p.debugDetails.length > 0) {
                    doc.setFontSize(8);
                    doc.setTextColor(255, 0, 0);
                    doc.text("DEBUG: Detalle por Ticket (Vehículo | Comisión)", 14, currentY);
                    doc.setTextColor(0);

                    const debugBody = p.debugDetails.map(d => [
                        d.id,
                        d.desc,
                        formatCurrency(d.amount)
                    ]);

                    doc.autoTable({
                        startY: currentY + 2,
                        head: [['ID', 'Vehículo', 'Comisión']],
                        body: debugBody,
                        theme: 'grid',
                        styles: { fontSize: 7, cellPadding: 1 },
                        headStyles: { fillColor: [220, 50, 50], textColor: [255, 255, 255] },
                        margin: { right: 100 }
                    });
                    currentY = doc.lastAutoTable.finalY + 10;
                }

                doc.setFontSize(8);
                const legalText = "Recibí la cantidad descrita a mi entera satisfacción. Recibi el importe indicado a el periodo señalado por jornada  diurna. No reservándome acción ni derecho alguno que ejercitar por ninguna vía laboral o civil";
                const splitText = doc.splitTextToSize(legalText, 180);
                doc.text(splitText, 14, currentY + 10);

                let sigY = currentY + 40;
                doc.line(70, sigY, 140, sigY);
                doc.text(name, 105, sigY + 5, { align: 'center' });
                doc.text("Firma de Conformidad", 105, sigY + 10, { align: 'center' });

                let boxY = sigY + 20;
                doc.setDrawColor(0);
                doc.setFillColor(255, 255, 255);
                doc.rect(140, boxY, 50, 20);
                doc.setFontSize(12);
                doc.setFont(undefined, 'bold');
                doc.text("TOTAL A PAGAR", 165, boxY + 6, { align: 'center' });
                doc.setFontSize(16);
                doc.setTextColor(0, 0, 0);
                doc.text(formatCurrency(p.netPay), 165, boxY + 15, { align: 'center' });
                doc.setTextColor(0);
                doc.setFont(undefined, 'normal');
            }
        });

        doc.save(`Nomina_${startDate}_${endDate}.pdf`);
    },

    generateCorte: (data) => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const { totals, itemStats, expenses, cashIns, arqueos } = data;
        const pageWidth = doc.internal.pageSize.width;

        const lightGrey = [240, 240, 240];
        const black = [0, 0, 0];

        const centerText = (text, y, size = 12) => {
            doc.setFontSize(size);
            doc.text(text, pageWidth / 2, y, { align: 'center' });
        };

        centerText(`CORTE ${data.type.toUpperCase()}`, 15, 18);
        centerText(`Fecha: ${data.dateLabel}`, 22, 10);

        const balanceBody = [
            ['FONDO INICIAL (SISTEMA)', formatCurrency(totals.initialMxn), `$${totals.initialUsd.toFixed(2)}`],
            ['+ VENTAS (EFECTIVO)', formatCurrency(totals.cashMxn), `$${totals.cashUsd.toFixed(2)}`],
            ['+ INGRESOS EXTRA', formatCurrency(totals.cashInsMxn), `$${totals.cashInsUsd.toFixed(2)}`],
            ['- GASTOS', `(${formatCurrency(totals.expenses)})`, `$0.00`],
            ['- ENVÍOS (RETIROS)', `(${formatCurrency(totals.dropsMxn)})`, `($${totals.dropsUsd.toFixed(2)})`],
            ['= TOTAL EN CAJA (DEBE HABER)', formatCurrency(totals.cashNetMxn), `$${totals.cashNetUsd.toFixed(2)}`]
        ];

        doc.autoTable({
            startY: 28,
            head: [['CONCEPTO', 'MXN', 'USD']],
            body: balanceBody,
            theme: 'grid',
            headStyles: { fillColor: lightGrey, textColor: black, halign: 'center', fontSize: 9, lineWidth: 0.1, lineColor: [200, 200, 200] },
            columnStyles: {
                0: { cellWidth: 80 },
                1: { halign: 'right', cellWidth: 50 },
                2: { halign: 'right', cellWidth: 50 }
            },
            styles: { fontSize: 8, cellPadding: 1.5, textColor: black },
            didParseCell: (data) => {
                if (data.row.index === balanceBody.length - 1) {
                    data.cell.styles.fontStyle = 'bold';
                    data.cell.styles.fillColor = [250, 250, 250];
                }
            }
        });

        let currentY = doc.lastAutoTable.finalY + 6;
        doc.setFontSize(11);
        doc.text("Resumen Operativo", 14, currentY);

        const statsBody = [
            ['Tickets Pagados', data.tickets.length, formatCurrency(totals.total)],
            ['Venta Tarjeta', '-', formatCurrency(totals.card)],
            ['Pinos', itemStats.pinos.count, formatCurrency(itemStats.pinos.money)],
            ['Boleadas', itemStats.boleadas.count, formatCurrency(itemStats.boleadas.money)],
            ['Snacks (Clientes)', itemStats.snacks.customerCount, formatCurrency(itemStats.snacks.moneyCustomer)],
            ['Snacks (Interno)', itemStats.snacks.internalCount, formatCurrency(itemStats.snacks.moneyInternal)],
        ];

        doc.autoTable({
            startY: currentY + 2,
            head: [['CONCEPTO', 'CANTIDAD', 'TOTAL (MXN)']],
            body: statsBody,
            theme: 'striped',
            headStyles: { fillColor: lightGrey, textColor: black, fontSize: 9, lineWidth: 0.1, lineColor: [200, 200, 200] },
            columnStyles: {
                1: { halign: 'center' },
                2: { halign: 'right' }
            },
            styles: { fontSize: 8, cellPadding: 1.5, textColor: black }
        });

        currentY = doc.lastAutoTable.finalY + 6;
        if (expenses.length > 0) {
            doc.setFontSize(11);
            doc.text("Desglose de Gastos", 14, currentY);
            const expenseBody = expenses.map(e => [
                e.description,
                e.status,
                formatCurrency(e.amount)
            ]);
            expenseBody.push(['TOTAL GASTOS', '', formatCurrency(totals.expenses)]);

            doc.autoTable({
                startY: currentY + 2,
                head: [['DESCRIPCIÓN', 'ESTADO', 'MONTO']],
                body: expenseBody,
                theme: 'striped',
                headStyles: { fillColor: lightGrey, textColor: black, fontSize: 9, lineWidth: 0.1, lineColor: [200, 200, 200] },
                columnStyles: { 2: { halign: 'right' } },
                styles: { fontSize: 8, cellPadding: 1.5, textColor: black },
                didParseCell: (data) => {
                    if (data.row.index === expenseBody.length - 1) {
                        data.cell.styles.fontStyle = 'bold';
                    }
                }
            });
        }

        currentY = doc.lastAutoTable.finalY + 10;

        if (arqueos && arqueos.first && arqueos.last) {
            doc.setFontSize(11);
            doc.text("Corte de Caja", 14, currentY);

            const first = arqueos.first;
            const last = arqueos.last;
            const isSame = first.id === last.id;

            const sysExpectedMxn = totals.cashNetMxn;
            const sysExpectedUsd = totals.cashNetUsd;

            const diffMxn = last.declaredMxn - sysExpectedMxn;
            const diffUsd = last.declaredUsd - sysExpectedUsd;

            const finalRate = last.exchangeRate || totals.exchangeRate || 18.0;
            const totalDiffMxn = diffMxn + (diffUsd * finalRate);

            const formatTime = (ts) => ts && ts.toDate ? ts.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (ts instanceof Date ? ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '');

            const arqueoBody = [
                [`Arqueo Inicial (${formatTime(first.timestamp)})`, formatCurrency(first.declaredMxn), `$${first.declaredUsd.toFixed(2)}`],
                [`Arqueo Final (${formatTime(last.timestamp)})`, formatCurrency(last.declaredMxn), `$${last.declaredUsd.toFixed(2)}`],
                ['Sistema Esperaba (Debe Haber)', formatCurrency(sysExpectedMxn), `$${sysExpectedUsd.toFixed(2)}`],
                ['DIFERENCIA OPERATIVA', formatCurrency(diffMxn), `$${diffUsd.toFixed(2)}`]
            ];

            doc.autoTable({
                startY: currentY + 3,
                head: [['CONCEPTO', 'MXN', 'USD']],
                body: arqueoBody,
                theme: 'grid',
                headStyles: { fillColor: lightGrey, textColor: black, fontSize: 9, lineWidth: 0.1, lineColor: [200, 200, 200] },
                columnStyles: {
                    1: { halign: 'right' },
                    2: { halign: 'right' }
                },
                styles: { fontSize: 8, cellPadding: 1.5, textColor: black },
                didParseCell: (data) => {
                    if (data.row.index === arqueoBody.length - 1) {
                        data.cell.styles.fontStyle = 'bold';
                        if (totalDiffMxn < -5) data.cell.styles.textColor = [0, 0, 0];
                        else if (totalDiffMxn > 5) data.cell.styles.textColor = [0, 0, 0];
                    }
                }
            });

            const boxY = doc.lastAutoTable.finalY + 6;
            doc.setDrawColor(0);
            doc.setFillColor(252, 252, 252);

            doc.roundedRect(pageWidth - 90, boxY, 80, 20, 3, 3, 'S');

            doc.setFontSize(9);
            doc.setTextColor(50);
            doc.text("DIFERENCIA TOTAL (MXN)", pageWidth - 50, boxY + 6, { align: 'center' });

            doc.setFontSize(14);
            doc.setFont(undefined, 'bold');

            let diffColor = [0, 0, 0];
            let diffPrefix = "";

            if (totalDiffMxn > 1) {
                diffColor = [0, 150, 0];
                diffPrefix = "+";
            } else if (totalDiffMxn < -1) {
                diffColor = [200, 0, 0];
            }

            doc.setTextColor(...diffColor);
            doc.text(`${diffPrefix}${formatCurrency(totalDiffMxn)}`, pageWidth - 50, boxY + 14, { align: 'center' });
            doc.setTextColor(0);
            doc.setFont(undefined, 'normal');

            doc.roundedRect(14, boxY, 80, 20, 3, 3, 'S');

            doc.setFontSize(9);
            doc.setTextColor(50);
            doc.text("TOTAL VENTAS (MXN)", 54, boxY + 6, { align: 'center' });

            doc.setFontSize(14);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(0);
            doc.text(formatCurrency(totals.total), 54, boxY + 14, { align: 'center' });
            doc.setFont(undefined, 'normal');

            if (isSame) {
                doc.setFontSize(7);
                doc.text("* Nota: Solo se registró un arqueo en este periodo.", 14, boxY + 25);
            }

        } else {
            doc.setFontSize(9);
            doc.setTextColor(150);
            doc.text("No hay suficientes registros de arqueo para calcular el flujo comparativo.", 14, currentY + 6);
        }

        doc.save(`Corte_${data.dateLabel}.pdf`);
    },

    generateAttendance: (monthLabel, employees, attendanceData, daysInMonth) => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'landscape' });

        doc.setFontSize(18);
        doc.text(`REPORTE DE ASISTENCIA: ${monthLabel}`, 14, 20);

        const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

        const head = [['Empleado', ...days.map(d => String(d)), 'Total']];
        const body = employees.map(emp => {
            const row = [emp.name];
            let total = 0;
            days.forEach(day => {
                const dateStr = `${monthLabel}-${String(day).padStart(2, '0')}`;
                const isPresent = attendanceData[dateStr]?.[emp.name];
                if (isPresent) total++;
                row.push(isPresent ? 'X' : '');
            });
            row.push(String(total));
            return row;
        });

        const totalColIdx = days.length + 1;
        doc.autoTable({
            startY: 30,
            head: head,
            body: body,
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 1, halign: 'center' },
            columnStyles: {
                0: { halign: 'left', fontStyle: 'bold', cellWidth: 40 },
                [totalColIdx]: { fontStyle: 'bold', fillColor: [220, 234, 255] }
            },
            headStyles: { fillColor: [44, 62, 80] }
        });

        doc.save(`Asistencia_${monthLabel}.pdf`);
    },

    generateAttendanceYearly: (yearLabel, employees, attendanceData) => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'landscape' });

        doc.setFontSize(18);
        doc.text(`REPORTE DE ASISTENCIA ANUAL: ${yearLabel}`, 14, 20);

        const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        const months = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));

        const head = [['Empleado', ...monthNames, 'Total']];
        const body = employees.map(emp => {
            const row = [emp.name];
            let yearTotal = 0;
            months.forEach(m => {
                const monthPrefix = `${yearLabel}-${m}`;
                let monthTotal = 0;
                Object.entries(attendanceData).forEach(([dateKey, records]) => {
                    if (dateKey.startsWith(monthPrefix) && records[emp.name]) monthTotal++;
                });
                yearTotal += monthTotal;
                row.push(monthTotal > 0 ? String(monthTotal) : '');
            });
            row.push(String(yearTotal));
            return row;
        });

        doc.autoTable({
            startY: 30,
            head: head,
            body: body,
            theme: 'grid',
            styles: { fontSize: 9, cellPadding: 2, halign: 'center' },
            columnStyles: {
                0: { halign: 'left', fontStyle: 'bold', cellWidth: 45 },
                13: { fontStyle: 'bold', fillColor: [220, 234, 255] }
            },
            headStyles: { fillColor: [44, 62, 80] }
        });

        doc.save(`Asistencia_Anual_${yearLabel}.pdf`);
    }
};

LP.PdfService = PdfService;
