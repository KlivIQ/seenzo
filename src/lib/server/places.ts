import type { ProspectImportRow } from "@/lib/types/outreach";

import { getAdminSession } from "./auth";

/**
 * Google Places API (New) Text Search. Official, key-based, so there is no scraping
 * and no blocking. Needs GOOGLE_PLACES_API_KEY (restricted to Places API (New)).
 */
const ENDPOINT = "https://places.googleapis.com/v1/places:searchText";
const FIELDS = [
  "places.displayName",
  "places.formattedAddress",
  "places.nationalPhoneNumber",
  "places.websiteUri",
  "places.businessStatus",
  "places.primaryTypeDisplayName",
  "nextPageToken",
].join(",");

/** Each page is up to 20 places; three pages is Google's maximum of 60 per query. */
const MAX_PAGES = 3;

interface PlaceResult {
  displayName?: { text?: string };
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  websiteUri?: string;
  businessStatus?: string;
  primaryTypeDisplayName?: { text?: string };
}

export interface PlacesSearchResult {
  rows: ProspectImportRow[];
  fetched: number;
  closed: number;
  noContact: number;
}

export function placesConfigured(): boolean {
  return Boolean(process.env.GOOGLE_PLACES_API_KEY);
}

export async function searchPlaces(input: {
  query: string;
  city: string;
  industry: string;
}): Promise<PlacesSearchResult> {
  if (!(await getAdminSession())) throw new Error("Unauthorized");
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) {
    throw new Error("GOOGLE_PLACES_API_KEY is not set in Vercel. Add it and redeploy.");
  }
  const query = input.query.trim();
  const city = input.city.trim();
  if (!query || !city || query.length > 80 || city.length > 60) {
    throw new Error("Pick a segment and a city");
  }

  const rows: ProspectImportRow[] = [];
  const seen = new Set<string>();
  let fetched = 0;
  let closed = 0;
  let noContact = 0;
  let pageToken: string | undefined;

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": FIELDS,
      },
      body: JSON.stringify({
        textQuery: `${query} in ${city}`,
        pageSize: 20,
        regionCode: "IN",
        languageCode: "en",
        ...(pageToken ? { pageToken } : {}),
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      const detail = (await res.text()).slice(0, 200);
      throw new Error(`Google Places returned ${res.status}. ${detail}`);
    }
    const json = (await res.json()) as { places?: PlaceResult[]; nextPageToken?: string };
    for (const p of json.places ?? []) {
      fetched += 1;
      const name = p.displayName?.text?.trim();
      if (!name) continue;
      if (p.businessStatus && p.businessStatus !== "OPERATIONAL") {
        closed += 1;
        continue;
      }
      if (!p.websiteUri && !p.nationalPhoneNumber) {
        noContact += 1;
        continue;
      }
      const dedupeKey = `${name.toLowerCase()}|${p.formattedAddress ?? ""}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      rows.push({
        business_name: name,
        website_url: p.websiteUri,
        contact_phone: p.nationalPhoneNumber,
        address: p.formattedAddress,
        city,
        industry: input.industry,
        source_type: "google_places",
      });
    }
    pageToken = json.nextPageToken;
    if (!pageToken) break;
  }
  return { rows, fetched, closed, noContact };
}
