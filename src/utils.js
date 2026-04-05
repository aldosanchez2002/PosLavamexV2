(function() {
// utils.js — Utility functions
window.LP = window.LP || {};
const LP = window.LP;

// Read constants set by constants.js
const SIZES = LP.SIZES;
const SERVICES = LP.SERVICES;
const DEFAULTS = LP.DEFAULTS;

const handleDbAction = async (actionFn) => {
    try {
        await actionFn();
    } catch (e) {
        alert("Error: " + e.message);
        console.error(e);
    }
};

const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN'
    }).format(amount);
};

const getLocalDateStr = (d = new Date()) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

const getMonthStr = (d = new Date()) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
};

const computeCorteTotals = (tickets, expenses, drops, cashIns, startDateObj, getOpeningCash, exRate) => {
    let revenueCard = 0;
    let revenueCashTickets = 0;
    let netMxnFlow = 0;
    let netUsdFlow = 0;

    tickets.forEach(t => {
        if (t.paymentDetails?.method === 'CARD') {
            revenueCard += t.price;
        } else {
            revenueCashTickets += t.price;
            const pay = t.paymentDetails || { mxn: 0, usd: 0, changeMxn: 0, changeUsd: 0, isOnlyUsd: false };
            const mxnIn = parseFloat(pay.mxn) || 0;
            const usdIn = parseFloat(pay.usd) || 0;
            let mxnOut = 0;
            let usdOut = 0;
            if (pay.isOnlyUsd) {
                usdOut = parseFloat(pay.changeUsd) || 0;
            } else {
                mxnOut = parseFloat(pay.changeMxn) || 0;
            }
            netMxnFlow += (mxnIn - mxnOut);
            netUsdFlow += (usdIn - usdOut);
        }
    });

    const approvedExpensesTotal = expenses.filter(e => e.status === 'APPROVED').reduce((a, b) => a + (b.amount || 0), 0);
    const openingCash = getOpeningCash(startDateObj);
    const initMxn = openingCash.mxn;
    const initUsd = openingCash.usd;
    const dropsMxn = drops.reduce((a, b) => a + (b.amountMxn || 0), 0);
    const dropsUsd = drops.reduce((a, b) => a + (b.amountUsd || 0), 0);
    const cashInsMxn = cashIns.reduce((a, b) => a + (b.amountMxn || 0), 0);
    const cashInsUsd = cashIns.reduce((a, b) => a + (b.amountUsd || 0), 0);

    return {
        total: revenueCard + revenueCashTickets,
        card: revenueCard,
        cashTotal: revenueCashTickets,
        cashMxn: netMxnFlow,
        cashUsd: netUsdFlow,
        expenses: approvedExpensesTotal,
        initialMxn: initMxn,
        initialUsd: initUsd,
        cashNetMxn: (netMxnFlow + initMxn + cashInsMxn) - approvedExpensesTotal - dropsMxn,
        cashNetUsd: netUsdFlow + initUsd + cashInsUsd - dropsUsd,
        dropsMxn,
        dropsUsd,
        cashInsMxn,
        cashInsUsd,
        exchangeRate: exRate
    };
};

const getDefaultPayPeriod = () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diffToSaturday = dayOfWeek === 6 ? 0 : dayOfWeek + 1;

    const start = new Date(now);
    start.setDate(now.getDate() - diffToSaturday);

    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    return {
        start: getLocalDateStr(start),
        end: getLocalDateStr(end)
    };
};

const calculateTicketTotals = (serviceId, sizeId, extraList, prices, commissions, snackCount = 0, currentSnackPrice = 30) => {
    const basePrice = (serviceId && sizeId && prices[serviceId]?.[sizeId]) || 0;
    const baseComm = (serviceId && sizeId && commissions[serviceId]?.[sizeId]) || 0;
    const extrasPrice = extraList.reduce((a, b) => a + b.price, 0);
    const extrasComm = extraList.reduce((a, b) => a + b.commission, 0);
    const snackCost = snackCount * currentSnackPrice;

    return {
        basePrice,
        totalPrice: basePrice + extrasPrice + snackCost,
        totalCommission: baseComm + extrasComm
    };
};

const calculatePayroll = (employees, history, deductions, currentCommissions, currentExtras) => {
    const payroll = {};
    const initPayrollItem = () => {
        const item = { count: 0, total: 0, serviceGrid: {}, extrasData: {}, deductionTotal: 0, deductionDetails: [], netPay: 0, debugDetails: [], daysWorked: 0, datesWorked: [], role: null, curp: null };
        SERVICES.forEach(svc => {
            item.serviceGrid[svc.id] = {};
            SIZES.forEach(sz => item.serviceGrid[svc.id][sz.id] = 0);
        });
        return item;
    };

    employees.forEach(emp => {
        payroll[emp.name] = initPayrollItem();
        payroll[emp.name].role = emp.role;
        payroll[emp.name].curp = emp.curp;
    });

    const totalGrossSales = history.reduce((acc, t) => acc + (t.price || 0), 0);

    let totalBoleadaCount = 0;
    let totalBoleadaRevenue = 0;

    history.forEach(item => {
        if (item.extras && item.extras.length > 0) {
            item.extras.forEach(ex => {
                if (['BOLEADA', 'QA_BOLEADA'].includes(ex.id)) {
                    totalBoleadaCount++;
                    totalBoleadaRevenue += (ex.price || 0);
                }
            });
        }
    });

    employees.forEach(emp => {
        const empName = emp.name;
        const p = payroll[empName];

        history.forEach(item => {
            const washersList = item.washers || (item.washer ? [item.washer] : []);

            if (washersList.includes(empName)) {
                const washerCount = washersList.length;
                if (washerCount === 0) return;

                let totalTicketCommission = item.commission || 0;

                if (!totalTicketCommission || totalTicketCommission === 0) {
                    let base = 0;
                    if (item.service && item.size && currentCommissions && currentCommissions[item.service.id]) {
                        base = currentCommissions[item.service.id][item.size.id] || 0;
                    }
                    const extrasTotal = (item.extras || []).reduce((acc, e) => {
                        const dbExtra = currentExtras ? currentExtras.find(dbEx => dbEx.id === e.id) : null;
                        const val = dbExtra ? (dbExtra.commission || 0) : (e.commission || 0);
                        return acc + val;
                    }, 0);
                    totalTicketCommission = base + extrasTotal;
                }

                const sharePerWasher = totalTicketCommission / washerCount;
                p.total += sharePerWasher;
                p.count += 1;

                if (item.service && item.size) {
                    if (p.serviceGrid[item.service.id] && p.serviceGrid[item.service.id][item.size.id] !== undefined) {
                        p.serviceGrid[item.service.id][item.size.id] += 1;
                    }
                }

                if (item.extras && item.extras.length > 0) {
                    item.extras.forEach(ex => {
                        const dbExtra = currentExtras ? currentExtras.find(dbEx => dbEx.id === ex.id) : null;
                        const commissionValue = dbExtra ? (dbExtra.commission || 0) : (ex.commission || 0);
                        const share = commissionValue / washerCount;

                        if (!p.extrasData[ex.label]) p.extrasData[ex.label] = { count: 0, total: 0 };
                        p.extrasData[ex.label].count += 1;
                        p.extrasData[ex.label].total += share;
                    });
                }
            }
        });
    });

    employees.forEach(emp => {
        if (emp.role === 'SUPERVISOR' && payroll[emp.name]) {
            const baseSalary = parseFloat(emp.baseSalary) || 0;
            const commPct = parseFloat(emp.commissionPct) || 0;
            const salesComm = totalGrossSales * (commPct / 100);

            const newTotal = baseSalary + salesComm;

            payroll[emp.name].total = newTotal;
            payroll[emp.name].extrasData = {};
            if (baseSalary > 0) {
                payroll[emp.name].extrasData['SUELDO BASE'] = { count: 1, total: baseSalary };
            }
            if (salesComm > 0) {
                payroll[emp.name].extrasData['COMISIÓN VENTAS'] = { count: 1, total: salesComm };
            }
        } else if (emp.role === 'BOLERO' && payroll[emp.name]) {
            const commPct = parseFloat(emp.commissionPct) || 50;
            const boleroComm = totalBoleadaRevenue * (commPct / 100);

            if (totalBoleadaCount > 0) {
                payroll[emp.name].count += totalBoleadaCount;
                payroll[emp.name].total += boleroComm;
                if (!payroll[emp.name].extrasData['Boleadas']) {
                    payroll[emp.name].extrasData['Boleadas'] = { count: 0, total: 0 };
                }
                payroll[emp.name].extrasData['Boleadas'].count += totalBoleadaCount;
                payroll[emp.name].extrasData['Boleadas'].total += boleroComm;
            }
        }
    });

    deductions.forEach(d => {
        if (!payroll[d.employee]) payroll[d.employee] = initPayrollItem();
        payroll[d.employee].deductionTotal += d.amount;
        payroll[d.employee].deductionDetails.push({ date: d.timestamp, desc: d.description, amount: d.amount });
    });

    Object.keys(payroll).forEach(key => { payroll[key].netPay = payroll[key].total - payroll[key].deductionTotal; });
    return payroll;
};

const validatePin = (input) => {
    try {
        const encoded = btoa(input.toLowerCase().trim());
        if (DEFAULTS.PINS.GREETER.includes(encoded)) return 'GREETER';
        if (encoded === DEFAULTS.PINS.CASHIER) return 'CASHIER';
        if (encoded === DEFAULTS.PINS.ADMIN) return 'ADMIN';
    } catch (e) { return null; }
    return null;
};

const toggleSelection = (list, item, limit = null) => {
    const isObj = typeof item !== 'string';
    const exists = isObj ? list.some(x => x.id === item.id) : list.includes(item);
    if (!exists && limit && list.length >= limit) return list;
    return exists ? list.filter(x => isObj ? x.id !== item.id : x !== item) : [...list, item];
};

// Export to LP namespace
LP.handleDbAction = handleDbAction;
LP.formatCurrency = formatCurrency;
LP.getLocalDateStr = getLocalDateStr;
LP.getMonthStr = getMonthStr;
LP.computeCorteTotals = computeCorteTotals;
LP.getDefaultPayPeriod = getDefaultPayPeriod;
LP.calculateTicketTotals = calculateTicketTotals;
LP.calculatePayroll = calculatePayroll;
LP.validatePin = validatePin;
LP.toggleSelection = toggleSelection;

})();
