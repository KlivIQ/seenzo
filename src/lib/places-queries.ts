/** Segments and South Indian cities offered in "Import from Google Places". */
export const PLACES_SEGMENTS: { label: string; query: string }[] = [
  { label: "Coaching centres", query: "coaching centre" },
  { label: "IIT JEE / NEET coaching", query: "IIT JEE NEET coaching institute" },
  { label: "Training academies", query: "training academy" },
  { label: "Schools", query: "CBSE matriculation school" },
  { label: "Architects", query: "architects" },
  { label: "Civil engineers and contractors", query: "civil engineering contractors" },
  { label: "Real estate developers", query: "real estate developers" },
  { label: "Property promoters", query: "property promoters builders" },
];

export const PLACES_CITIES = [
  "Chennai",
  "Coimbatore",
  "Madurai",
  "Tiruchirappalli",
  "Salem",
  "Tirunelveli",
  "Erode",
  "Vellore",
  "Bengaluru",
  "Mysuru",
  "Hyderabad",
  "Kochi",
  "Thiruvananthapuram",
  "Visakhapatnam",
  "Vijayawada",
] as const;
