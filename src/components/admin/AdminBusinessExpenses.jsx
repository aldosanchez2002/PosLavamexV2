(function() {
window.LP = window.LP || {};
const LP = window.LP;

const { useState, useContext } = React;
const { Briefcase } = window.lucideReact;

const AdminBusinessExpenses = () => {
    const { businessExpenses, addBusinessExpense } = useContext(LP.AppContext);
    const Button = LP.Button;
    const formatCurrency = LP.formatCurrency;

    const [desc, setDesc] = useState('');
    const [amt, setAmt] = useState('');

    const handleSubmit = () => {
        if (!desc || !amt) return;
        addBusinessExpense(desc, amt);
        setDesc('');
        setAmt('');
    };

    return (
        <div className="space-y-6">
            <div className="bg-purple-50 border-purple-200 border p-4 rounded-xl shadow-sm">
                <h3 className="font-bold text-purple-800 mb-2 flex items-center gap-2"><Briefcase size={20} /> Registrar Gasto Administrativo </h3>
                <p className="text-sm text-purple-600 mb-4 font-medium">Estos gastos son pagados externamente (SAM's, IMSS, etc) y NO afectan el corte de caja diario.</p>
                <div className="flex gap-2 flex-col md:flex-row">
                    <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Descripción del gasto" className="border p-3 rounded-lg flex-1 shadow-sm" />
                    <input type="number" value={amt} onChange={e => setAmt(e.target.value)} placeholder="Monto ($)" className="border p-3 rounded-lg w-full md:w-40 shadow-sm" />
                    <Button onClick={handleSubmit} variant="primary" className="bg-purple-600 hover:bg-purple-700 shadow-md">Guardar</Button>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
                <h4 className="font-bold text-gray-700 mb-4">Historial de Gastos Administrativos</h4>
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-500 border-b">
                        <tr>
                            <th className="p-3">Fecha</th>
                            <th className="p-3">Descripción</th>
                            <th className="p-3 text-right">Monto</th>
                            <th className="p-3 text-right">Registrado Por</th>
                        </tr>
                    </thead>
                    <tbody>
                        {businessExpenses.length === 0 ? <tr><td colSpan="4" className="p-4 text-center text-gray-400">No hay gastos registrados.</td></tr> : businessExpenses.map(e => (
                            <tr key={e.id} className="border-b hover:bg-gray-50 last:border-b-0">
                                <td className="p-3 text-gray-600">
                                    <div>{e.timestamp.toLocaleDateString()}</div>
                                    <div className="text-xs">{e.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                </td>
                                <td className="p-3 font-medium text-gray-800">{e.description}</td>
                                <td className="p-3 text-right font-bold text-purple-700">{formatCurrency(e.amount)}</td>
                                <td className="p-3 text-right text-xs text-gray-400 uppercase">{e.createdBy}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

LP.AdminBusinessExpenses = AdminBusinessExpenses;

})();
