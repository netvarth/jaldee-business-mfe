import { useQuery } from "@tanstack/react-query";
import { useCommerceApi } from "./useCommerceApi";

export interface Unit {
  uid: string;
  name: string;
  symbol: string;
  description?: string;
  status?: string;
  /** Measurement family: COUNT | WEIGHT | VOLUME | LENGTH | OTHER. Governs which base unit
   *  a product should use (a weight product → a WEIGHT unit like kg/g) and whether the unit
   *  allows fractional quantities (COUNT does not). */
  unitType?: string;
}

export function useUnits() {
  const api = useCommerceApi();

  return useQuery({
    queryKey: ["units"],
    queryFn: async () => {
      const data = await api.get<any>("/v1/api/tenant/units");


      const unitsArray = Array.isArray(data) ? data : (data?.content || []);

      return unitsArray.map((unit: any) => ({
        uid: unit.uid,
        name: unit.name,
        symbol: unit.symbol,
        description: unit.description,
        status: unit.status,
        unitType: unit.unitType,
      })) as Unit[];
    },
    // Units are near-static reference data called from ~18 components; without this every
    // mount refetched (React Query's default staleTime is 0).
    staleTime: 5 * 60_000,
  });
}
