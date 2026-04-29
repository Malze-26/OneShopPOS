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

export interface Category {
  _id: string;
  name: string;
  icon: string;
}

export function useProductsData() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");

  return {
    products,
    setProducts,
    categories,
    setCategories,
    loadingData,
    setLoadingData,
    activeCategory,
    setActiveCategory,
    search,
    setSearch,
  };
}
