(function() {
// constants.js — App-wide constants and Firebase config
window.LP = window.LP || {};
const LP = window.LP;

LP.FIREBASE_CONFIG = {
    apiKey: "AIzaSyByIvJpBZv32Zd22fxlYWL9etzBa66Q2rE",
    authDomain: "poslavamex.firebaseapp.com",
    projectId: "poslavamex",
    storageBucket: "poslavamex.firebasestorage.app",
    messagingSenderId: "883264129",
    appId: "1:883264129:web:39a352e2ade3888b4f1b80"
};

LP.SIZES = [
    { id: 'AUTO', label: 'Auto' },
    { id: 'SUV_CHICA', label: 'SUV Chica' },
    { id: 'PICKUP', label: 'Pick-Up / SUV MD' },
    { id: 'SUV_GDE', label: 'SUV Gde' }
];

LP.SERVICES = [
    { id: 'GENERAL', label: 'Lavado General' },
    { id: 'WAX', label: 'Lavado + Cera' },
    { id: 'COMPLETE', label: 'Paquete Completo' },
    { id: 'PREMIUM', label: 'Paquete Premium' },
    { id: 'PRESIDENTIAL', label: 'Paquete Presidencial' }
];

LP.DEFAULTS = {
    PINS: {
        GREETER: ['bWVsdnkxMDYx', 'NXJpdG83'],
        CASHIER: 'c2VyZ2lvOTE5MQ==',
        ADMIN: 'Y292aW5ndG9uNTIx'
    },
    EXCHANGE_RATE: 18.10,
    SNACK_PRICE: 30,
    INITIAL_EMPLOYEES: [],
    PRICES: {
        GENERAL:      { AUTO: 200,  SUV_CHICA: 240,  PICKUP: 360,  SUV_GDE: 360  },
        WAX:          { AUTO: 540,  SUV_CHICA: 640,  PICKUP: 820,  SUV_GDE: 820  },
        COMPLETE:     { AUTO: 840,  SUV_CHICA: 1040, PICKUP: 1160, SUV_GDE: 1640 },
        PREMIUM:      { AUTO: 1180, SUV_CHICA: 1440, PICKUP: 1620, SUV_GDE: 2100 },
        PRESIDENTIAL: { AUTO: 1540, SUV_CHICA: 1940, PICKUP: 2320, SUV_GDE: 2320 },
    },
    COMMISSIONS: {
        GENERAL:      { AUTO: 70,  SUV_CHICA: 84,  PICKUP: 126, SUV_GDE: 126 },
        WAX:          { AUTO: 189, SUV_CHICA: 224, PICKUP: 287, SUV_GDE: 287 },
        COMPLETE:     { AUTO: 294, SUV_CHICA: 364, PICKUP: 406, SUV_GDE: 574 },
        PREMIUM:      { AUTO: 413, SUV_CHICA: 504, PICKUP: 567, SUV_GDE: 735 },
        PRESIDENTIAL: { AUTO: 539, SUV_CHICA: 679, PICKUP: 812, SUV_GDE: 812 },
    },
    EXTRAS: [
        { id: 'MOTOR',            label: 'Lavado Motor',         price: 400, commission: 140   },
        { id: 'CHASIS',           label: 'Chasis',               price: 400, commission: 140   },
        { id: 'AROMA',            label: 'Aroma',                price: 30,  commission: 10.50 },
        { id: 'ARMORALL',         label: 'Armor-All',            price: 40,  commission: 14    },
        { id: 'LIMP_FOCOS',       label: 'Limpieza de Focos',    price: 340, commission: 120   },
        { id: 'ASPIRADO_CAJUELA', label: 'Aspirado de Cajuela',  price: 40,  commission: 14    },
        { id: 'BOLEADA',          label: 'Boleada',              price: 60,  commission: 0     },
        { id: 'LIMP_ZONA',        label: 'Limpieza por Zona',    price: 200, commission: 70    },
    ]
};

})();
