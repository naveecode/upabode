"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  HOME_TYPES,
  citiesIn,
  emptyQuery,
  isQueryActive,
  searchListings,
  type HomeType,
  type Listing,
  type ListingQuery,
  type SortKey,
} from "@/lib/search";
import { formatDate, formatRent, homeLabel, resultCountLabel } from "@/lib/format";

const RENT_CAPS = [15000, 25000, 35000, 50000, 70000];
const BEDROOM_OPTIONS = [1, 2, 3];

type ListingExplorerProps = {
  listings: Listing[];
};

export function ListingExplorer({ listings }: ListingExplorerProps) {
  const [query, setQuery] = useState<ListingQuery>(emptyQuery);
  const [sort, setSort] = useState<SortKey>("rent-asc");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const searchId = useId();

  const cities = useMemo(() => citiesIn(listings), [listings]);
  const results = useMemo(
    () => searchListings(listings, query, sort),
    [listings, query, sort],
  );
  const selected = listings.find((listing) => listing.id === selectedId) ?? null;
  const lowestRent = listings.reduce(
    (lowest, listing) => Math.min(lowest, listing.rent),
    Number.POSITIVE_INFINITY,
  );
  const filtersActive = isQueryActive(query);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (selected && !dialog.open) dialog.showModal();
    if (!selected && dialog.open) dialog.close();
  }, [selected]);

  function update(patch: Partial<ListingQuery>) {
    setQuery((current) => ({ ...current, ...patch }));
  }

  return (
    <div className="page">
      <a className="skip" href="#results">
        Skip to listings
      </a>
      <header className="topbar">
        <a className="brand" href="#top">
          Upabode
        </a>
        <p>Sample homes, stored in the browser</p>
      </header>

      <main id="top">
        <section className="hero">
          <p className="eyebrow">Rental listing finder</p>
          <h1>Find a place that feels like yours.</h1>
          <p className="lede">
            Upabode is a small demo for browsing rentals. {listings.length} homes across{" "}
            {cities.length} cities are seeded in the page, from {formatRent(lowestRent)} a month.
            Search and filters run locally.
          </p>
          <form className="search" role="search" onSubmit={(event) => event.preventDefault()}>
            <label htmlFor={searchId}>Search homes</label>
            <input
              id={searchId}
              type="search"
              value={query.text}
              placeholder="Try Indiranagar, metro, or pet friendly"
              onChange={(event) => update({ text: event.target.value })}
            />
          </form>
        </section>

        <section className="filters" aria-label="Filters">
          <label>
            City
            <select value={query.city} onChange={(event) => update({ city: event.target.value })}>
              <option value="all">All cities</option>
              {cities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </label>

          <fieldset>
            <legend>Home type</legend>
            <div className="segments">
              <button
                type="button"
                aria-pressed={query.type === "all"}
                onClick={() => update({ type: "all" })}
              >
                Any
              </button>
              {HOME_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  aria-pressed={query.type === type}
                  onClick={() => update({ type: type satisfies HomeType })}
                >
                  {homeLabel(type)}
                </button>
              ))}
            </div>
          </fieldset>

          <label>
            Max rent
            <select
              value={query.maxRent ?? ""}
              onChange={(event) =>
                update({ maxRent: event.target.value ? Number(event.target.value) : null })
              }
            >
              <option value="">Any rent</option>
              {RENT_CAPS.map((cap) => (
                <option key={cap} value={cap}>
                  Up to {formatRent(cap)}
                </option>
              ))}
            </select>
          </label>

          <label>
            Bedrooms
            <select
              value={query.minBedrooms}
              onChange={(event) => update({ minBedrooms: Number(event.target.value) })}
            >
              <option value={0}>Any</option>
              {BEDROOM_OPTIONS.map((count) => (
                <option key={count} value={count}>
                  {count}+
                </option>
              ))}
            </select>
          </label>

          <label className="check">
            <input
              type="checkbox"
              checked={query.pets}
              onChange={(event) => update({ pets: event.target.checked })}
            />
            Pets allowed
          </label>

          <label className="check">
            <input
              type="checkbox"
              checked={query.furnished}
              onChange={(event) => update({ furnished: event.target.checked })}
            />
            Furnished
          </label>

          {filtersActive ? (
            <button type="button" className="text-button" onClick={() => setQuery(emptyQuery)}>
              Clear filters
            </button>
          ) : null}
        </section>

        <section id="results" className="results" aria-labelledby={titleId}>
          <div className="results-bar">
            <h2 id={titleId}>
              <span aria-live="polite">{resultCountLabel(results.length)}</span>
            </h2>
            <label>
              Sort
              <select value={sort} onChange={(event) => setSort(event.target.value as SortKey)}>
                <option value="rent-asc">Rent, low to high</option>
                <option value="rent-desc">Rent, high to low</option>
                <option value="newest">Recently posted</option>
              </select>
            </label>
          </div>

          {results.length === 0 ? (
            <div className="empty">
              <h3>No homes in that range.</h3>
              <p>Clear a filter, or search for a neighborhood, amenity, or city.</p>
              <button type="button" onClick={() => setQuery(emptyQuery)}>
                Show all homes
              </button>
            </div>
          ) : (
            <ul className="grid">
              {results.map((listing) => (
                <li key={listing.id}>
                  <article className="card">
                    <div className={`art art-${listing.type}`} aria-hidden="true">
                      <span className="house">
                        <span className="window" />
                        <span className="door" />
                      </span>
                    </div>
                    <div className="card-body">
                      <p className="meta">
                        <span>{homeLabel(listing.type)}</span>
                        <span>
                          {listing.neighborhood}, {listing.city}
                        </span>
                      </p>
                      <h3>{listing.title}</h3>
                      <p className="rent">
                        {formatRent(listing.rent)}
                        <span> / month</span>
                      </p>
                      <p className="facts">
                        {listing.bedrooms} bed · {listing.bathrooms} bath · {listing.sqft} sqft
                      </p>
                      <ul className="chips">
                        {listing.amenities.slice(0, 3).map((amenity) => (
                          <li key={amenity}>{amenity}</li>
                        ))}
                      </ul>
                      <button type="button" onClick={() => setSelectedId(listing.id)}>
                        View home
                      </button>
                    </div>
                  </article>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      <footer className="foot">
        <p>Upabode is a static demo. Listings are sample data, not live vacancies.</p>
      </footer>

      <dialog
        ref={dialogRef}
        aria-labelledby="listing-title"
        onClose={() => setSelectedId(null)}
      >
        {selected ? (
          <div className="dialog-body">
            <p className="meta">
              <span>{homeLabel(selected.type)}</span>
              <span>
                {selected.neighborhood}, {selected.city}
              </span>
            </p>
            <h2 id="listing-title">{selected.title}</h2>
            <p className="rent">
              {formatRent(selected.rent)}
              <span> / month</span>
            </p>
            <p className="facts">
              {selected.bedrooms} bed · {selected.bathrooms} bath · {selected.sqft} sqft ·{" "}
              {selected.furnished ? "Furnished" : "Unfurnished"} ·{" "}
              {selected.pets ? "Pets allowed" : "No pets"}
            </p>
            <p className="description">{selected.description}</p>
            <dl>
              <div>
                <dt>Available</dt>
                <dd>{formatDate(selected.availableFrom)}</dd>
              </div>
              <div>
                <dt>Posted</dt>
                <dd>{formatDate(selected.postedOn)}</dd>
              </div>
            </dl>
            <ul className="chips">
              {selected.amenities.map((amenity) => (
                <li key={amenity}>{amenity}</li>
              ))}
            </ul>
            <button type="button" className="close" onClick={() => dialogRef.current?.close()}>
              Close
            </button>
          </div>
        ) : null}
      </dialog>
    </div>
  );
}
