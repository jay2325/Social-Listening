import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { useBrands } from "../hooks/useBrands";
import type { Brand } from "../types";

interface BrandContextValue {
  brandId:    string | undefined;
  brand:      Brand | undefined;
  setBrandId: (id: string) => void;
}

const BrandContext = createContext<BrandContextValue | null>(null);

const LS_KEY = "pulseboard:selected_brand_id";

export function BrandProvider({ children }: { children: ReactNode }) {
  const { data: brands = [] } = useBrands();

  const [brandId, setBrandIdState] = useState<string | undefined>(() => {
    // Rehydrate from localStorage on first render
    const stored = localStorage.getItem(LS_KEY);
    return stored ?? undefined;
  });

  // Auto-select first brand when none is stored and brands have loaded
  useEffect(() => {
    if (!brandId && brands.length > 0) {
      setBrandIdState(brands[0].id);
      localStorage.setItem(LS_KEY, brands[0].id);
    }
  }, [brandId, brands]);

  // Ensure stored brandId is still valid (brand might have been deleted)
  useEffect(() => {
    if (brandId && brands.length > 0 && !brands.find((b) => b.id === brandId)) {
      const fallback = brands[0]?.id;
      setBrandIdState(fallback);
      if (fallback) localStorage.setItem(LS_KEY, fallback);
    }
  }, [brandId, brands]);

  const setBrandId = (id: string) => {
    setBrandIdState(id);
    localStorage.setItem(LS_KEY, id);
  };

  const brand = brands.find((b) => b.id === brandId);

  return (
    <BrandContext.Provider value={{ brandId, brand, setBrandId }}>
      {children}
    </BrandContext.Provider>
  );
}

export function useBrandContext(): BrandContextValue {
  const ctx = useContext(BrandContext);
  if (!ctx) throw new Error("useBrandContext must be used inside <BrandProvider>");
  return ctx;
}
