import type { HomeType } from "@/lib/search";

const rentFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export function formatRent(amount: number): string {
  return rentFormatter.format(amount);
}

export function formatDate(isoDate: string): string {
  return dateFormatter.format(new Date(`${isoDate}T00:00:00`));
}

export function homeLabel(type: HomeType): string {
  if (type === "apartment") return "Apartment";
  if (type === "house") return "House";
  return "Room";
}

export function resultCountLabel(count: number): string {
  return count === 1 ? "1 home" : `${count} homes`;
}
