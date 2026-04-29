import { useState, useEffect } from "react";

export function useDiscounts(cart: any[]) {
  const [discount, setDiscount] = useState(0);
  const [loyaltyDiscount, setLoyaltyDiscount] = useState(0);
  const [loyaltyPointsUsed, setLoyaltyPointsUsed] = useState(0);
  const [promoCode, setPromoCode] = useState("");

  // Reset discounts and promo when cart is cleared
  useEffect(() => {
    if (cart.length === 0) {
      setDiscount(0);
      setPromoCode("");
      setLoyaltyDiscount(0);
      setLoyaltyPointsUsed(0);
    }
  }, [cart]);

  return {
    discount,
    setDiscount,
    loyaltyDiscount,
    setLoyaltyDiscount,
    loyaltyPointsUsed,
    setLoyaltyPointsUsed,
    promoCode,
    setPromoCode,
  };
}
