// Guesses a South Indian city from a free-text address (Google Maps exports have no city column).

const CITIES: [RegExp, string][] = [
  [/\bchennai\b|\bmadras\b/i, "Chennai"],
  [/\bcoimbatore\b|\bkovai\b/i, "Coimbatore"],
  [/\bmadurai\b/i, "Madurai"],
  [/\btiruchirap+alli\b|\btrichy\b|\btiruchi\b/i, "Tiruchirappalli"],
  [/\bsalem\b/i, "Salem"],
  [/\btirunelveli\b/i, "Tirunelveli"],
  [/\berode\b/i, "Erode"],
  [/\bvellore\b/i, "Vellore"],
  [/\btiruppur\b|\btirupur\b/i, "Tiruppur"],
  [/\bthanjavur\b/i, "Thanjavur"],
  [/\bhosur\b/i, "Hosur"],
  [/\bkanchipuram\b/i, "Kanchipuram"],
  [/\bpuducherry\b|\bpondicherry\b/i, "Puducherry"],
  [/\bbengaluru\b|\bbangalore\b/i, "Bengaluru"],
  [/\bmysuru\b|\bmysore\b/i, "Mysuru"],
  [/\bmangaluru\b|\bmangalore\b/i, "Mangaluru"],
  [/\bhyderabad\b|\bsecunderabad\b/i, "Hyderabad"],
  [/\bvisakhapatnam\b|\bvizag\b/i, "Visakhapatnam"],
  [/\bvijayawada\b/i, "Vijayawada"],
  [/\bguntur\b/i, "Guntur"],
  [/\btirupati\b/i, "Tirupati"],
  [/\bkochi\b|\bcochin\b|\bernakulam\b/i, "Kochi"],
  [/\bthiruvananthapuram\b|\btrivandrum\b/i, "Thiruvananthapuram"],
  [/\bkozhikode\b|\bcalicut\b/i, "Kozhikode"],
  [/\bthrissur\b|\btrichur\b/i, "Thrissur"],
];

export function cityFromAddress(address: string | null | undefined): string | null {
  const a = address ?? "";
  if (!a) return null;
  for (const [re, name] of CITIES) if (re.test(a)) return name;
  return null;
}
