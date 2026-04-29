import { useState } from "react";

export interface Product {
  _id: string;
  name: string;
  sku: string;
  sellingPrice: number;
  category: string;
  stock: number;
  status: string;
  lowStockThreshold: number;
  isWeightBased: boolean;
  unit: string;
}

export function useWeightModal() {
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [weightProduct, setWeightProduct] = useState<Product | null>(null);
  const [weightInput, setWeightInput] = useState("");
  const [weightError, setWeightError] = useState("");

  return {
    showWeightModal,
    setShowWeightModal,
    weightProduct,
    setWeightProduct,
    weightInput,
    setWeightInput,
    weightError,
    setWeightError,
  };
}
