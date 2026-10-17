import { describe, expect, it } from "vitest";
import { listings } from "@/data/listings";
import {
  emptyQuery,
  isQueryActive,
  searchListings,
  type Listing,
  type ListingQuery,
} from "@/lib/search";

const homes: Listing[] = [
  {
    id: "a",
    title: "Sunny loft",
    city: "Pune",
    neighborhood: "Kothrud",
    type: "apartment",
    rent: 20000,
    bedrooms: 1,
    bathrooms: 1,
    sqft: 500,
    furnished: true,
    pets: false,
    amenities: ["Balcony"],
    description: "Quiet street near a bakery",
    availableFrom: "2026-11-01",
    postedOn: "2026-09-01",
  },
  {
    id: "b",
    title: "Garden house",
    city: "Kochi",
    neighborhood: "Fort Kochi",
    type: "house",
    rent: 40000,
    bedrooms: 3,
    bathrooms: 2,
    sqft: 1400,
    furnished: false,
    pets: true,
    amenities: ["Garden", "Parking"],
    description: "Pet friendly home with a mango tree",
    availableFrom: "2026-12-01",
    postedOn: "2026-10-01",
  },
  {
    id: "c",
    title: "Shared room",
    city: "Pune",
    neighborhood: "Viman Nagar",
    type: "room",
    rent: 12000,
    bedrooms: 1,
    bathrooms: 1,
    sqft: 180,
    furnished: true,
    pets: true,
    amenities: ["Wifi"],
    description: "Furnished room in a flat",
    availableFrom: "2026-10-20",
    postedOn: "2026-08-15",
  },
];

function query(overrides: Partial<ListingQuery> = {}): ListingQuery {
  return { ...emptyQuery, ...overrides };
}

describe("searchListings", () => {
  it("returns every home, cheapest first, when the query is empty", () => {
    const ids = searchListings(homes, emptyQuery, "rent-asc").map((home) => home.id);
    expect(ids).toEqual(["c", "a", "b"]);
  });

  it("matches text across description, city, and amenities without case sensitivity", () => {
    expect(searchListings(homes, query({ text: "mango" }), "rent-asc").map((home) => home.id)).toEqual([
      "b",
    ]);
    expect(searchListings(homes, query({ text: "  PUNe balcony " }), "rent-asc").map((home) => home.id)).toEqual([
      "a",
    ]);
  });

  it("requires every search term to match", () => {
    expect(searchListings(homes, query({ text: "pune house" }), "rent-asc")).toEqual([]);
  });

  it("filters by city, home type, rent ceiling, and bedroom count", () => {
    expect(searchListings(homes, query({ city: "Pune" }), "rent-asc").map((home) => home.id)).toEqual([
      "c",
      "a",
    ]);
    expect(searchListings(homes, query({ type: "house" }), "rent-asc").map((home) => home.id)).toEqual(["b"]);
    expect(searchListings(homes, query({ maxRent: 20000 }), "rent-asc").map((home) => home.id)).toEqual([
      "c",
      "a",
    ]);
    expect(searchListings(homes, query({ minBedrooms: 3 }), "rent-asc").map((home) => home.id)).toEqual(["b"]);
    expect(searchListings(homes, query({ maxRent: 10000 }), "rent-asc")).toEqual([]);
  });

  it("combines pets and furnished filters", () => {
    const ids = searchListings(homes, query({ pets: true, furnished: true }), "rent-asc").map(
      (home) => home.id,
    );
    expect(ids).toEqual(["c"]);
  });

  it("sorts by newest post and by descending rent without mutating the input", () => {
    const original = homes.map((home) => home.id);
    expect(searchListings(homes, emptyQuery, "newest").map((home) => home.id)).toEqual(["b", "a", "c"]);
    expect(searchListings(homes, emptyQuery, "rent-desc").map((home) => home.id)).toEqual(["b", "a", "c"]);
    expect(homes.map((home) => home.id)).toEqual(original);
  });

  it("knows when any filter is active", () => {
    expect(isQueryActive(emptyQuery)).toBe(false);
    expect(isQueryActive(query({ text: "   " }))).toBe(false);
    expect(isQueryActive(query({ city: "Pune" }))).toBe(true);
    expect(isQueryActive(query({ maxRent: 20000 }))).toBe(true);
  });
});

describe("seed listings", () => {
  it("uses unique ids and stays searchable by neighborhood", () => {
    const ids = new Set(listings.map((listing) => listing.id));
    expect(ids.size).toBe(listings.length);

    const found = searchListings(listings, query({ text: "Indiranagar" }), "rent-asc");
    expect(found).toHaveLength(1);
    expect(found[0]?.neighborhood).toBe("Indiranagar");
  });
});
