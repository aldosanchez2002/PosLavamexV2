window.LP = window.LP || {};
const LP = window.LP;

const { useState, useEffect, useContext } = React;
const { Lock, LogOut, Car, CheckCircle, Calculator, History, Settings } = window.lucideReact;

const LavamexPOS = () => {
    const { role, view, setView, logout } = useContext(LP.AppContext);
    const Button = LP.Button;

    const [isLocked, setIsLocked] = useState(false);

    useEffect(() => {
        const checkTime = () => {
            const now = new Date();
            const hours = now.getHours();
            const outsideHours = hours < 6 || hours >= 20;
            setIsLocked(outsideHours && role !== 'ADMIN');
        };

        checkTime();
        const interval = setInterval(checkTime, 60000);
        return () => clearInterval(interval);
    }, [role]);

    if (!role) return <LP.LoginScreen />;

    if (isLocked) return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-900 text-white p-4">
            <div className="bg-gray-800 p-8 rounded-2xl shadow-2xl text-center max-w-md w-full border border-gray-700">
                <div className="bg-red-900/30 p-4 rounded-full w-fit mx-auto mb-6">
                    <Lock size={48} className="text-red-500" />
                </div>
                <h1 className="text-2xl font-bold mb-2">El sistema está bloqueado</h1>
                <Button onClick={logout} variant="danger" className="w-full py-3">
                    <LogOut className="mr-2" size={18} /> Cerrar Sesión
                </Button>
            </div>
        </div>
    );

    return (
        <div className="h-[100dvh] flex flex-col bg-gray-100 font-sans">
            <header className="bg-slate-900 text-white p-3 flex justify-between items-center shadow-md shrink-0 z-50">
                <a href="https://lavamex.work/menu" className="flex items-center gap-2 font-bold text-lg md:text-xl truncate hover:opacity-80 transition-opacity">
                    <Car className="text-blue-400 shrink-0" /> <span>LAVAMEX</span>
                </a>
                <div className="flex gap-2 overflow-x-auto no-scrollbar">
                    <button onClick={() => setView('GREETER')} className={`px-3 py-2 rounded flex gap-2 items-center text-sm font-bold whitespace-nowrap transition-colors ${view === 'GREETER' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800'}`}><CheckCircle size={18} /> <span className="hidden sm:inline">Entrada</span></button>
                    {(role === 'CASHIER' || role === 'ADMIN') && <><button onClick={() => setView('CASHIER')} className={`px-3 py-2 rounded flex gap-2 items-center text-sm font-bold whitespace-nowrap transition-colors ${view === 'CASHIER' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800'}`}><Calculator size={18} /> <span className="hidden sm:inline">Caja</span></button><button onClick={() => setView('HISTORY')} className={`px-3 py-2 rounded flex gap-2 items-center text-sm font-bold whitespace-nowrap transition-colors ${view === 'HISTORY' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800'}`}><History size={18} /> <span className="hidden sm:inline">Historial</span></button></>}
                    {role === 'ADMIN' && <button onClick={() => setView('ADMIN')} className={`px-3 py-2 rounded flex gap-2 items-center text-sm font-bold whitespace-nowrap transition-colors ${view === 'ADMIN' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800'}`}><Settings size={18} /> <span className="hidden sm:inline">Admin</span></button>}
                    <button onClick={logout} className="bg-red-900/80 px-3 rounded ml-2 hover:bg-red-700 shrink-0"><LogOut size={18} /></button>
                </div>
            </header>
            <main className="flex-1 overflow-hidden relative">
                {view === 'GREETER' && <LP.GreeterView />}
                {view === 'CASHIER' && <LP.CashierView />}
                {view === 'HISTORY' && <LP.HistoryView />}
                {view === 'ADMIN' && <LP.AdminPanel />}
            </main>
        </div>
    );
};

LP.LavamexPOS = LavamexPOS;
