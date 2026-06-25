"use client";

import { createContext, useCallback, useContext, useState } from "react";

interface CartUiContextValue {
  cartCount: number;
  setCartCount: (n: number) => void;
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
}

const CartUiContext = createContext<CartUiContextValue>({
  cartCount: 0,
  setCartCount: () => {},
  isCartOpen: false,
  openCart: () => {},
  closeCart: () => {},
});

export function CartUiProvider({ children }: { children: React.ReactNode }) {
  const [cartCount, setCartCount] = useState(0);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const openCart = useCallback(() => setIsCartOpen(true), []);
  const closeCart = useCallback(() => setIsCartOpen(false), []);

  return (
    <CartUiContext.Provider value={{ cartCount, setCartCount, isCartOpen, openCart, closeCart }}>
      {children}
    </CartUiContext.Provider>
  );
}

export const useCartUi = () => useContext(CartUiContext);
