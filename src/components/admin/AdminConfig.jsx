(function() {
window.LP = window.LP || {};
const LP = window.LP;

const { useState, useEffect, useContext } = React;
const { PlusCircle, UserCog, EyeOff } = window.lucideReact;

const AdminConfig = () => {
    const { exRate, snackPrice, updateGlobalSettings, employees, addEmployee, archiveEmployee, updateEmployee } = useContext(LP.AppContext);
    const Button = LP.Button;
    const Modal = LP.Modal;

    const [localExRate, setLocalExRate] = useState(exRate);
    const [localSnackPrice, setLocalSnackPrice] = useState(snackPrice);
    const [newEmpName, setNewEmpName] = useState('');
    const [editingEmp, setEditingEmp] = useState(null);

    useEffect(() => {
        setLocalExRate(exRate);
        setLocalSnackPrice(snackPrice);
    }, [exRate, snackPrice]);

    const handleAddEmployee = () => { if (newEmpName.trim()) { addEmployee(newEmpName.trim()); setNewEmpName(''); } };

    const handleEditEmployee = (emp) => {
        setEditingEmp({
            ...emp,
            role: emp.role || 'WASHER',
            baseSalary: emp.baseSalary || 0,
            commissionPct: emp.commissionPct || 0,
            curp: emp.curp || ''
        });
    };

    const saveEmployeeChanges = () => {
        if (!editingEmp) return;
        updateEmployee(editingEmp.id, {
            role: editingEmp.role,
            baseSalary: parseFloat(editingEmp.baseSalary) || 0,
            commissionPct: parseFloat(editingEmp.commissionPct) || 0,
            curp: editingEmp.curp || ''
        });
        setEditingEmp(null);
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 max-w-lg mx-auto">
            <h3 className="font-bold mb-4 text-gray-800">General</h3>
            <div className="mb-6 flex flex-col gap-4">
                <div><label className="block text-sm font-bold text-gray-600 mb-2">Cambio de Dólar ($)</label><input type="number" value={localExRate} onChange={e => setLocalExRate(e.target.value)} className="border p-3 rounded-lg w-full text-lg" /></div>
                <div><label className="block text-sm font-bold text-gray-600 mb-2">Precio Snack ($)</label><input type="number" value={localSnackPrice} onChange={e => setLocalSnackPrice(e.target.value)} className="border p-3 rounded-lg w-full text-lg" /></div>
                <Button onClick={() => { updateGlobalSettings(parseFloat(localExRate), parseFloat(localSnackPrice)); alert("Ajustes actualizados"); }} className="w-full mt-2">Guardar Ajustes Generales</Button>
            </div>

            <h3 className="font-bold mb-4 border-t pt-4 text-gray-800">Empleados</h3>
            <div className="flex gap-2 mb-4"><input value={newEmpName} onChange={(e) => setNewEmpName(e.target.value)} placeholder="Nuevo Empleado" className="border p-3 rounded-lg flex-1" /><Button onClick={handleAddEmployee}><PlusCircle className="w-5 h-5" /></Button></div>
            <div className="space-y-2">{employees.map((e) => (
                <div key={e.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                        <span className="font-medium block">{e.name}</span>
                        <span className="text-xs text-gray-500 uppercase font-bold">{e.role === 'SUPERVISOR' ? 'Supervisor' : (e.role === 'BOLERO' ? 'Bolero' : 'Lavador')}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className={`text-xs font-bold px-2 py-1 rounded ${e.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{e.active ? 'Presente' : 'Ausente'}</span>
                        <button onClick={() => handleEditEmployee(e)} className="text-blue-500 hover:text-blue-700" title="Editar Rol"><UserCog size={18} /></button>
                        <button onClick={() => { if (confirm(`¿Ocultar a ${e.name}?`)) archiveEmployee(e.id); }} className="text-red-500 hover:text-red-700" title="Ocultar empleado"><EyeOff size={18} /></button>
                    </div>
                </div>
            ))}</div>

            {editingEmp && (
                <Modal title={`Editar Empleado: ${editingEmp.name}`} icon={UserCog} onClose={() => setEditingEmp(null)} footer={
                    <div className="flex gap-2">
                        <Button onClick={() => setEditingEmp(null)} variant="secondary" className="flex-1">Cancelar</Button>
                        <Button onClick={saveEmployeeChanges} variant="primary" className="flex-1">Guardar</Button>
                    </div>
                }>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-600 mb-1">Rol</label>
                            <select
                                className="w-full border p-2 rounded bg-white"
                                value={editingEmp.role}
                                onChange={(e) => setEditingEmp({ ...editingEmp, role: e.target.value })}
                            >
                                <option value="WASHER">Lavador (Comisión Estandar)</option>
                                <option value="SUPERVISOR">Supervisor (Sueldo + % Ventas)</option>
                                <option value="BOLERO">Bolero (% de Boleadas)</option>
                            </select>
                        </div>
                        {editingEmp.role === 'SUPERVISOR' && (
                            <>
                                <div>
                                    <label className="block text-sm font-bold text-gray-600 mb-1">CURP</label>
                                    <input
                                        type="text"
                                        className="w-full border p-2 rounded uppercase"
                                        value={editingEmp.curp || ''}
                                        onChange={(e) => setEditingEmp({ ...editingEmp, curp: e.target.value.toUpperCase() })}
                                        placeholder="Ingrese CURP"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-600 mb-1">Sueldo Base Semanal ($)</label>
                                    <input
                                        type="number"
                                        className="w-full border p-2 rounded"
                                        value={editingEmp.baseSalary}
                                        onChange={(e) => setEditingEmp({ ...editingEmp, baseSalary: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-600 mb-1">Comisión de Ventas Totales (%)</label>
                                    <input
                                        type="number"
                                        className="w-full border p-2 rounded"
                                        value={editingEmp.commissionPct}
                                        onChange={(e) => setEditingEmp({ ...editingEmp, commissionPct: e.target.value })}
                                        placeholder="Ej. 5"
                                    />
                                </div>
                            </>
                        )}
                        {editingEmp.role === 'BOLERO' && (
                            <div>
                                <label className="block text-sm font-bold text-gray-600 mb-1">Comisión de Boleadas (%)</label>
                                <input
                                    type="number"
                                    className="w-full border p-2 rounded"
                                    value={editingEmp.commissionPct}
                                    onChange={(e) => setEditingEmp({ ...editingEmp, commissionPct: e.target.value })}
                                    placeholder="Ej. 50"
                                />
                            </div>
                        )}
                    </div>
                </Modal>
            )}
        </div>
    );
};

LP.AdminConfig = AdminConfig;

})();
