export const inputClass =
  "border-border bg-background text-foreground focus:border-primary focus:ring-primary/20 w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:outline-none";
export const labelClass = "text-foreground mb-1 block text-xs font-medium";

export type Breed = {
  id: string;
  name: string;
  species: string;
  purpose: "dairy" | "beef" | "dual" | "breeding" | null;
};
export type Vaccine = {
  id: string;
  name: string;
  manufacturer: string | null;
  disease: string | null;
  dose_ml: number | null;
  route: string | null;
  booster_days: number | null;
  withdrawal_days: number | null;
};
export type Treatment = {
  id: string;
  name: string;
  active_ingredient: string | null;
  kind: string | null;
  dose: string | null;
  route: string | null;
  withdrawal_meat_days: number | null;
  withdrawal_milk_days: number | null;
  notes: string | null;
};
export type FarmDetail = {
  id: string;
  name: string;
  legal_id: string | null;
  country: string | null;
  region: string | null;
  address: string | null;
};

export const PURPOSE_LABELS: Record<string, string> = {
  dairy: "Lechero",
  beef: "Cárnico",
  dual: "Doble propósito",
  breeding: "Reproducción",
};
