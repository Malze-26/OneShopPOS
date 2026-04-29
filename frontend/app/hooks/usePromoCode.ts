import { useState } from "react";

export function usePromoCode() {
  const [showPromo, setShowPromo] = useState(false);
  const [promoInput, setPromoInput] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState("");
  const [promoSuccess, setPromoSuccess] = useState("");

  return {
    showPromo,
    setShowPromo,
    promoInput,
    setPromoInput,
    promoLoading,
    setPromoLoading,
    promoError,
    setPromoError,
    promoSuccess,
    setPromoSuccess,
  };
}
