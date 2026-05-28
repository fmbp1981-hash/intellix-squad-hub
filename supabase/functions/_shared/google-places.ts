export interface GooglePlaceResult {
  place_id: string;
  name: string;
  formatted_address?: string;
  formatted_phone_number?: string;
  international_phone_number?: string;
  website?: string;
  rating?: number;
  user_ratings_total?: number;
  business_status?: string;
  types?: string[];
  geometry?: { location: { lat: number; lng: number } };
}

export interface PlacesSearchParams {
  query: string;
  apiKey: string;
  limit?: number;
}

export async function searchPlacesByQuery(
  params: PlacesSearchParams
): Promise<GooglePlaceResult[]> {
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(params.query)}&key=${params.apiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Google Places error ${res.status}`);
  const data = await res.json() as {
    status: string;
    results: GooglePlaceResult[];
    error_message?: string;
  };
  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    throw new Error(`Google Places API: ${data.status} — ${data.error_message ?? ''}`);
  }
  const limit = params.limit ?? 20;
  return (data.results ?? []).slice(0, limit);
}

export async function getPlaceDetails(
  placeId: string,
  apiKey: string
): Promise<GooglePlaceResult | null> {
  const fields = 'name,formatted_address,formatted_phone_number,international_phone_number,website,rating,user_ratings_total,business_status,types,geometry';
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json() as { status: string; result?: GooglePlaceResult };
  return data.status === 'OK' ? (data.result ?? null) : null;
}

const TYPE_MAP: Record<string, string> = {
  restaurant: 'Restaurante',
  beauty_salon: 'Salão de Beleza',
  dentist: 'Dentista',
  doctor: 'Médico',
  lawyer: 'Advogado',
  accounting: 'Contabilidade',
  real_estate_agency: 'Imobiliária',
  veterinary_care: 'Veterinária',
  gym: 'Academia',
  pharmacy: 'Farmácia',
  school: 'Escola',
  health: 'Saúde',
  spa: 'Spa',
  lodging: 'Hotel/Pousada',
};

export function translateGoogleType(types: string[] | undefined): string {
  if (!types?.length) return 'Estabelecimento';
  for (const t of types) {
    if (TYPE_MAP[t]) return TYPE_MAP[t];
  }
  return types[0].replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function extractCity(address: string | undefined, fallback = ''): string {
  if (!address) return fallback;
  const parts = address.split(',').map((p) => p.trim());
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    if (/^\d{5}-?\d{3}$/.test(p) || /^brasil$/i.test(p)) continue;
    const m = p.match(/^(.+?)\s*-\s*([A-Z]{2})$/);
    if (m) return m[1].trim();
    if (!/^\d/.test(p) && p.length > 2 && i < parts.length - 1) return p;
  }
  return fallback;
}

export function extractNeighborhood(address: string | undefined): string {
  if (!address) return '';
  const dashMatch = address.match(/\d+\s*-\s*([^,]+)/);
  if (dashMatch) {
    const b = dashMatch[1].trim();
    if (!/^[A-Z]{2}$/.test(b)) return b;
  }
  const parts = address.split(',').map((p) => p.trim());
  if (parts.length >= 3 && !/^\d/.test(parts[1])) return parts[1];
  return '';
}
