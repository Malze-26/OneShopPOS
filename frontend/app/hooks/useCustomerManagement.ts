import { useState, useEffect } from "react";

export interface Customer {
  _id: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  totalOrders: number;
  totalSpent: number;
  loyaltyPoints?: number;
}

export function useCustomerManagement() {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  // Close customer dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setShowCustomerDropdown(false);
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  return {
    selectedCustomer,
    setSelectedCustomer,
    customers,
    setCustomers,
    customerSearch,
    setCustomerSearch,
    showCustomerDropdown,
    setShowCustomerDropdown,
  };
}
