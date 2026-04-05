window.LP = window.LP || {};
const LP = window.LP;

const { useState, useEffect, useContext } = React;
const { Upload } = window.lucideReact;

const AdminPrecios = () => {
    const { prices, commissions, extrasList, db } = useContext(LP.AppContext);
    const Button = LP.Button;
    const handleDbAction = LP.handleDbAction;
    const SIZES = LP.SIZES;
    const SERVICES = LP.SERVICES;

    const [editPrices, setEditPrices] = useState({});
    const [editComms, setEditComms] = useState({});
    const [editExtras, setEditExtras] = useState([]);

    useEffect(() => {
        setEditPrices(JSON.parse(JSON.stringify(prices)));
        setEditComms(JSON.parse(JSON.stringify(commissions)));
        setEditExtras(JSON.parse(JSON.stringify(extrasList)));
    }, [prices, commissions, extrasList]);

    const updateLocalPrice = (type, svcId, sizeId, val) => {
        const target = type === 'prices' ? editPrices : editComms;
        const setTarget = type === 'prices' ? setEditPrices : setEditComms;
        const newObj = { ...target };
        if (!newObj[svcId]) newObj[svcId] = {};
        newObj[svcId][sizeId] = parseFloat(val) || 0;
        setTarget(newObj);
    };

    const updateLocalExtra = (index, field, val) => {
        const arr = [...editExtras];
        arr[index][field] = val;
        setEditExtras(arr);
    };

    const saveAllSettings = () => handleDbAction(async () => {
        const { writeBatch, doc, collection } = LP.firebase;
        if (!confirm("¿Aplicar nuevos precios?")) return;
        const batch = writeBatch(db);

        batch.set(doc(db, "settings", "prices"), editPrices);
        batch.set(doc(db, "settings", "commissions"), editComms);

        editExtras.forEach(e => {
            if (e.docId) {
                batch.update(doc(db, "extras", e.docId), {
                    label: e.label,
                    price: parseFloat(e.price) || 0,
                    commission: parseFloat(e.commission) || 0,
                    id: e.id
                });
            } else {
                const newRef = doc(collection(db, "extras"));
                batch.set(newRef, {
                    id: e.id || `EXTRA_${Date.now()}`,
                    label: e.label,
                    price: parseFloat(e.price) || 0,
                    commission: parseFloat(e.commission) || 0
                });
            }
        });

        await batch.commit();
        alert("¡Precios Actualizados!");
    });

    return (
        <div className="space-y-6">
            <div className="bg-blue-50 border-blue-200 border p-4 rounded-xl flex justify-between items-center">
                <div><h3 className="font-bold text-blue-800">Edición de Precios</h3><p className="text-sm text-blue-600">Edita los valores y guarda para aplicar.</p></div>
                <Button onClick={saveAllSettings} className="px-6 py-3 shadow-lg"><Upload className="w-5 h-5" /> GUARDAR</Button>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                    <thead><tr className="bg-gray-100"><th className="p-3 border">Servicio</th>{SIZES.map(s => <th key={s.id} className="p-3 border">{s.label}</th>)}</tr></thead>
                    <tbody>
                        {SERVICES.map(svc => (
                            <tr key={svc.id}>
                                <td className="p-3 border font-medium">{svc.label}</td>
                                {SIZES.map(size => (
                                    <td key={size.id} className="p-2 border">
                                        <div className="flex flex-col gap-1">
                                            <input type="number" value={editPrices[svc.id]?.[size.id] || 0} onChange={(e) => updateLocalPrice('prices', svc.id, size.id, e.target.value)} className="border p-1 rounded w-full text-center text-green-700 font-bold" placeholder="Precio" />
                                            <input type="number" value={editComms[svc.id]?.[size.id] || 0} onChange={(e) => updateLocalPrice('commissions', svc.id, size.id, e.target.value)} className="border p-1 rounded w-full text-center text-blue-600 text-xs" placeholder="Com" />
                                        </div>
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 overflow-x-auto mt-6">
                <div className="flex justify-between items-center mb-4">
                    <h4 className="font-bold text-gray-700">Extras (Lista Fija)</h4>
                </div>
                <table className="w-full text-sm text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-100">
                            <th className="p-3 border">Nombre / Etiqueta</th>
                            <th className="p-3 border text-center">Precio ($)</th>
                            <th className="p-3 border text-center">Comisión ($)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {editExtras.map((ex, idx) => (
                            <tr key={idx}>
                                <td className="p-3 border font-bold text-gray-700 bg-gray-50">
                                    {ex.label}
                                </td>
                                <td className="p-2 border">
                                    <input type="number" value={ex.price} onChange={(e) => updateLocalExtra(idx, 'price', e.target.value)} className="border p-2 rounded w-full text-center text-green-700 font-bold" />
                                </td>
                                <td className="p-2 border">
                                    <input type="number" value={ex.commission} onChange={(e) => updateLocalExtra(idx, 'commission', e.target.value)} className="border p-2 rounded w-full text-center text-blue-600 font-bold" />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

LP.AdminPrecios = AdminPrecios;
