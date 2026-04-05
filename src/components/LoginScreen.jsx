// LoginScreen.jsx — PIN login screen
window.LP = window.LP || {};
const LP = window.LP;

const { useState, useContext } = React;
const Button = LP.Button;
const validatePin = LP.validatePin;

const LoginScreen = () => {
    const { login } = useContext(LP.AppContext);
    const [pin, setPin] = useState('');
    const handleLogin = () => {
        const role = validatePin(pin);
        if (role) login(role); else { alert('PIN Incorrecto'); setPin(''); }
    };
    return (
        <div className="flex h-screen bg-gray-900 justify-center items-center p-4">
            <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-sm text-center">
                <h1 className="text-3xl font-bold mb-6 text-gray-800">LAVAMEX POS</h1>
                <div className="flex flex-col gap-4">
                    <input type="password" value={pin} onChange={e => setPin(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} placeholder="PIN" className="w-full p-4 border rounded-lg text-center text-3xl tracking-widest mb-2" autoFocus />
                    <Button onClick={handleLogin} className="w-full p-4 text-lg">ENTRAR</Button>
                </div>
            </div>
        </div>
    );
};

LP.LoginScreen = LoginScreen;
