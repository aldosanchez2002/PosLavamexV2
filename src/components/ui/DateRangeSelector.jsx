// DateRangeSelector.jsx — Date picker and range selector components
window.LP = window.LP || {};
const LP = window.LP;

const { useState, useRef } = React;
const { ChevronLeft, ChevronRight, Calendar } = window.lucideReact;
const Button = LP.Button;
const Modal = LP.Modal;

const CustomDateInput = ({ type, value, onChange, label }) => {
    const inputRef = useRef(null);
    let formatted = "";
    if (value) {
        try {
            if (type === 'month') {
                const d = new Date(value + '-01T00:00:00');
                formatted = new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric' }).format(d);
            } else {
                const d = new Date(value + 'T00:00:00');
                formatted = new Intl.DateTimeFormat('es-MX', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }).format(d);
            }
        } catch (e) { }
    }

    const handleClick = () => {
        if (inputRef.current && inputRef.current.showPicker) {
            try { inputRef.current.showPicker(); } catch (e) { }
        }
    };

    return (
        <div className="flex flex-col w-full sm:w-auto">
            {label && <label className="text-xs font-bold text-gray-500 block mb-1">{label}</label>}
            <div onClick={handleClick} className="relative border border-gray-300 p-2 rounded-lg bg-white flex items-center justify-center min-w-[150px] shadow-sm hover:bg-gray-50 transition-colors cursor-pointer overflow-hidden">
                <span className="font-bold text-gray-700 capitalize text-sm">{formatted || 'Seleccionar'}</span>
                <input ref={inputRef} type={type} value={value} onChange={e => onChange(e.target.value)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer invisible-date-input" />
            </div>
        </div>
    );
};

const CalendarRangeModal = ({ start, end, onSave, onClose }) => {
    const [s, setS] = useState(start);
    const [e, setE] = useState(end);
    const [view, setView] = useState(new Date(start ? start + 'T00:00:00' : Date.now()));

    const daysInMonth = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
    const startOffset = new Date(view.getFullYear(), view.getMonth(), 1).getDay();

    const handleDayClick = (day) => {
        const clicked = `${view.getFullYear()}-${String(view.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        if (!s || (s && e)) { setS(clicked); setE(null); }
        else {
            if (clicked < s) { setS(clicked); }
            else { setE(clicked); }
        }
    };

    const renderDays = () => {
        let cells = [];
        for (let i = 0; i < startOffset; i++) cells.push(<div key={`empty-${i}`} />);
        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${view.getFullYear()}-${String(view.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            let isSel = dateStr === s || dateStr === e;
            let inRange = s && e && dateStr > s && dateStr < e;
            let classes = "p-2 text-center text-sm font-bold cursor-pointer rounded-full transition-colors ";
            if (isSel) classes += "bg-blue-600 text-white shadow-md relative z-10";
            else if (inRange) classes += "bg-blue-100 text-blue-800 rounded-none";
            else classes += "hover:bg-gray-100 text-gray-700";

            cells.push(<div key={d} onClick={() => handleDayClick(d)} className={classes}>{d}</div>);
        }
        return cells;
    };

    const prevMonth = () => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1));
    const nextMonth = () => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1));
    const monthName = new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric' }).format(view);

    return (
        <Modal title="Seleccionar Rango" onClose={onClose} footer={
            <div className="flex gap-2">
                <Button onClick={onClose} variant="secondary" className="flex-1">Cancelar</Button>
                <Button onClick={() => onSave(s, e || s)} disabled={!s} variant="primary" className="flex-1">Aplicar</Button>
            </div>
        }>
            <div className="flex justify-between items-center mb-4">
                <button onClick={prevMonth} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"><ChevronLeft size={18} /></button>
                <div className="font-bold capitalize text-lg">{monthName}</div>
                <button onClick={nextMonth} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"><ChevronRight size={18} /></button>
            </div>
            <div className="grid grid-cols-7 mb-2 text-center text-xs font-bold text-gray-400">
                <div>Do</div><div>Lu</div><div>Ma</div><div>Mi</div><div>Ju</div><div>Vi</div><div>Sa</div>
            </div>
            <div className="grid grid-cols-7 gap-y-2 mb-4">
                {renderDays()}
            </div>
            <div className="text-center text-sm font-bold text-gray-600 border-t pt-3">
                {s ? s : 'Inicio'} &nbsp; - &nbsp; {e ? e : 'Fin'}
            </div>
        </Modal>
    );
};

const DateRangeSelector = ({ start, end, onRangeChange, label }) => {
    const [isOpen, setIsOpen] = useState(false);
    const formatStr = (d) => {
        if (!d) return "";
        try { return new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(d + 'T00:00:00')); } catch (err) { return d; }
    };
    const text = start && end && start !== end ? `${formatStr(start)} - ${formatStr(end)}` : formatStr(start);

    return (
        <div className="flex flex-col w-full sm:w-auto">
            {label && <label className="text-xs font-bold text-gray-500 block mb-1">{label}</label>}
            <div onClick={() => setIsOpen(true)} className="relative border border-gray-300 p-2 rounded-lg bg-white flex items-center justify-center min-w-[240px] shadow-sm hover:bg-gray-50 transition-colors cursor-pointer overflow-hidden">
                <Calendar size={16} className="mr-2 text-gray-400" />
                <span className="font-bold text-gray-700 capitalize text-sm">{text || 'Seleccionar Rango'}</span>
            </div>
            {isOpen && <CalendarRangeModal start={start} end={end} onClose={() => setIsOpen(false)} onSave={(s, e) => { onRangeChange(s, e); setIsOpen(false); }} />}
        </div>
    );
};

LP.CustomDateInput = CustomDateInput;
LP.CalendarRangeModal = CalendarRangeModal;
LP.DateRangeSelector = DateRangeSelector;
