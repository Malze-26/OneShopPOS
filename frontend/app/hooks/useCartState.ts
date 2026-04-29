import { useState } from "react";

export interface CartItem {
  id: string;
  name: string;
  sku: string;
  price: number;
  qty: number;
  unit: string;
  weight: number | null;
}

export function useCartState() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [addedId, setAddedId] = useState<string | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);

  return {
    cart,
    setCart,
    addedId,
    setAddedId,
    showCheckout,
    setShowCheckout,
  };
}
