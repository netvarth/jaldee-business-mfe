import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface StorefrontCartItem {
  id: string;
  name: string;
  price: number;
  qty: number;
  image?: string;
  variant?: { size?: string; color?: string };
}

interface StorefrontCartContextType {
  cart: StorefrontCartItem[];
  addToCart: (item: StorefrontCartItem) => void;
  removeFromCart: (id: string) => void;
  updateQty: (id: string, delta: number) => void;
  clearCart: () => void;
  cartTotal: number;
  cartCount: number;
}

const StorefrontCartContext = createContext<StorefrontCartContextType | undefined>(undefined);

export const StorefrontCartProvider = ({ children }: { children: ReactNode }) => {
  const [cart, setCart] = useState<StorefrontCartItem[]>([]);

  const addToCart = (item: StorefrontCartItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, qty: i.qty + item.qty } : i);
      }
      return [...prev, item];
    });
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(i => i.id !== id));
  };

  const updateQty = (id: string, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.id === id) {
        const newQty = Math.max(1, i.qty + delta);
        return { ...i, qty: newQty };
      }
      return i;
    }));
  };

  const clearCart = () => setCart([]);

  const cartTotal = cart.reduce((acc, curr) => acc + (curr.price * curr.qty), 0);
  const cartCount = cart.reduce((acc, curr) => acc + curr.qty, 0);

  return (
    <StorefrontCartContext.Provider value={{
      cart, addToCart, removeFromCart, updateQty, clearCart, cartTotal, cartCount
    }}>
      {children}
    </StorefrontCartContext.Provider>
  );
};

export const useStorefrontCart = () => {
  const context = useContext(StorefrontCartContext);
  if (!context) throw new Error("useStorefrontCart must be used within StorefrontCartProvider");
  return context;
};
