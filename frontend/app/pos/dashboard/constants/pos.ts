

export const fmt = (n: number) => `Rs. ${Math.abs(n).toFixed(2)}`;// Simple currency formatter for displaying amounts in the POS dashboard, using Sri Lankan Rupees as default

export const genId = () => "ORD-" + Math.random().toString(36).slice(2, 8).toUpperCase();// Generates a random order ID with "ORD-" prefix followed by 6 random alphanumeric characters, used for identifying transactions in the POS system