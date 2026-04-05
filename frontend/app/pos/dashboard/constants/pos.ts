export const TAX_RATE = 0.08;

export const fmt = (n: number) => `Rs. ${Math.abs(n).toFixed(2)}`;

export const genId = () => "ORD-" + Math.random().toString(36).slice(2, 8).toUpperCase();