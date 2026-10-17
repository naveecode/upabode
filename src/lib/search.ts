export const HOME_TYPES = ["apartment", "house", "room"] as const;

export type HomeType = (typeof HOME_TYPES)[number];

export type Listing = {
  id: string;
  title: string;
  city: string;
  neighborhood: string;
  type: HomeType;
  rent: number;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  furnished: boolean;
  pets: boolean;
  amenities: string[];
  description: string;
  availableFrom: string;
  postedOn: string;
};

export type SortKey = "rent-asc" | "rent-desc" | "newest";

export type ListingQuery = {
  text: string;
  city: string;
  type: HomeType | "all";
  maxRent: number | null;
  minBedrooms: number;
  pets: boolean;
  furnished: boolean;
};

export const emptyQuery: ListingQuery = {
  text: "",
  city: "all",
  type: "all",
  maxRent: null,
  minBedrooms: 0,
  pets: false,
  furnished: false,
};

export function listingHaystack(listing: Listing): string {
  const parts = [
    listing.title,
    listing.city,
    listing.neighborhood,
    listing.type,
    listing.description,
    ...listing.amenities,
    `${listing.bedrooms} bhk`,
  ];
  if (listing.furnished) parts.push("furnished");
  else parts.push("unfurnished");
  if (listing.pets) parts.push("pets", "pet friendly");
  return parts.join(" ").toLowerCase();
}

export function matchesListing(listing: Listing, query: ListingQuery): boolean {
  const text = query.text.trim().toLowerCase();
  if (text) {
    const haystack = listingHaystack(listing);
    const terms = text.split(/\s+/);
    if (!terms.every((term) => haystack.includes(term))) return false;
  }

  if (query.city !== "all" && listing.city !== query.city) return false;
  if (query.type !== "all" && listing.type !== query.type) return false;
  if (query.maxRent != null && listing.rent > query.maxRent) return false;
  if (listing.bedrooms < query.minBedrooms) return false;
  if (query.pets && !listing.pets) return false;
  if (query.furnished && !listing.furnished) return false;
  return true;
}

export function filterListings(listings: readonly Listing[], query: ListingQuery): Listing[] {
  return listings.filter((listing) => matchesListing(listing, query));
}

export function sortListings(listings: readonly Listing[], sort: SortKey): Listing[] {
  return [...listings].sort((a, b) => {
    if (sort === "rent-asc") return a.rent - b.rent || a.title.localeCompare(b.title);
    if (sort === "rent-desc") return b.rent - a.rent || a.title.localeCompare(b.title);
    return b.postedOn.localeCompare(a.postedOn) || a.title.localeCompare(b.title);
  });
}

export function searchListings(
  listings: readonly Listing[],
  query: ListingQuery,
  sort: SortKey,
): Listing[] {
  return sortListings(filterListings(listings, query), sort);
}

export function citiesIn(listings: readonly Listing[]): string[] {
  return [...new Set(listings.map((listing) => listing.city))].sort((a, b) =>
    a.localeCompare(b),
  );
}

export function isQueryActive(query: ListingQuery): boolean {
  return (
    query.text.trim() !== "" ||
    query.city !== "all" ||
    query.type !== "all" ||
    query.maxRent != null ||
    query.minBedrooms > 0 ||
    query.pets ||
    query.furnished
  );
}
