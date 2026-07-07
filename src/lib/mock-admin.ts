export type Status =
  | "unverified"
  | "verified"
  | "scanned"
  | "contacted"
  | "consult_booked"
  | "won"
  | "lost";

export const statuses: Status[] = [
  "unverified",
  "verified",
  "scanned",
  "contacted",
  "consult_booked",
  "won",
  "lost",
];

export type Lead = {
  id: string;
  name: string;
  business: string;
  email: string;
  phone: string;
  city: string;
  website: string;
  score: number | null;
  heatScore: number;
  status: Status;
  createdAt: string;
  lastActivityAt: string;
  reportSlug: string;
  verdict: string;
};

const now = Date.now();
const days = (n: number) => new Date(now - n * 86400000).toISOString();
const hours = (n: number) => new Date(now - n * 3600000).toISOString();

export const leads: Lead[] = [
  {
    id: "L-1043",
    name: "Anand Krishnan",
    business: "Anand Sweets & Savouries",
    email: "anand@anandsweets.in",
    phone: "+91 98404 12345",
    city: "Bengaluru",
    website: "anandsweets.in",
    score: 62,
    heatScore: 78,
    status: "consult_booked",
    createdAt: days(2),
    lastActivityAt: hours(4),
    reportSlug: "anand-sweets-abc123",
    verdict: "Partially visible — a few high-impact fixes will lift you.",
  },
  {
    id: "L-1042",
    name: "Priya Iyer",
    business: "Iyer Interiors",
    email: "priya@iyerinteriors.com",
    phone: "+91 99401 55210",
    city: "Chennai",
    website: "iyerinteriors.com",
    score: 44,
    heatScore: 62,
    status: "contacted",
    createdAt: days(3),
    lastActivityAt: hours(20),
    reportSlug: "iyer-interiors-def456",
    verdict: "Weak structured data — LLMs struggle to describe you.",
  },
  {
    id: "L-1041",
    name: "Rohan Deshmukh",
    business: "Deshmukh Legal LLP",
    email: "rohan@deshmukhlegal.in",
    phone: "+91 90280 11223",
    city: "Pune",
    website: "deshmukhlegal.in",
    score: 81,
    heatScore: 55,
    status: "won",
    createdAt: days(5),
    lastActivityAt: days(1),
    reportSlug: "deshmukh-legal-ghi789",
    verdict: "Strong foundation — a few polish moves and you're top-tier.",
  },
  {
    id: "L-1040",
    name: "Kavya Menon",
    business: "Menon Ayurveda Clinic",
    email: "kavya@menonayurveda.com",
    phone: "+91 98470 88110",
    city: "Kochi",
    website: "menonayurveda.com",
    score: 38,
    heatScore: 44,
    status: "scanned",
    createdAt: days(4),
    lastActivityAt: days(2),
    reportSlug: "menon-ayurveda-jkl012",
    verdict: "Low visibility — no schema, no About page, no GBP.",
  },
  {
    id: "L-1039",
    name: "Suresh Patel",
    business: "Patel Auto Parts",
    email: "suresh@patelauto.in",
    phone: "+91 79820 33445",
    city: "Ahmedabad",
    website: "patelauto.in",
    score: 55,
    heatScore: 71,
    status: "consult_booked",
    createdAt: days(6),
    lastActivityAt: hours(9),
    reportSlug: "patel-auto-mno345",
    verdict: "Middling — needs product schema and IndiaMART parity.",
  },
  {
    id: "L-1038",
    name: "Meera Krishnamurthy",
    business: "Dr. Meera Dental Care",
    email: "meera@meeradental.co.in",
    phone: "+91 98450 77889",
    city: "Bengaluru",
    website: "meeradental.co.in",
    score: 72,
    heatScore: 68,
    status: "contacted",
    createdAt: days(7),
    lastActivityAt: days(3),
    reportSlug: "meera-dental-pqr678",
    verdict: "Good local presence, weak structured data.",
  },
  {
    id: "L-1037",
    name: "Vikram Shah",
    business: "Shah Textiles Pvt Ltd",
    email: "vikram@shahtextiles.com",
    phone: "+91 98252 44556",
    city: "Surat",
    website: "shahtextiles.com",
    score: 29,
    heatScore: 30,
    status: "scanned",
    createdAt: days(8),
    lastActivityAt: days(4),
    reportSlug: "shah-textiles-stu901",
    verdict: "AI engines don't know you exist. Start with the basics.",
  },
  {
    id: "L-1036",
    name: "Aditi Rao",
    business: "Rao Coffee Roasters",
    email: "aditi@raocoffee.in",
    phone: "+91 94480 22334",
    city: "Mangalore",
    website: "raocoffee.in",
    score: 88,
    heatScore: 82,
    status: "won",
    createdAt: days(11),
    lastActivityAt: days(2),
    reportSlug: "rao-coffee-vwx234",
    verdict: "Top decile. A few tweaks and you'll dominate your niche.",
  },
  {
    id: "L-1035",
    name: "Karthik Subramanian",
    business: "KS Chartered Accountants",
    email: "karthik@ksca.in",
    phone: "+91 98410 99001",
    city: "Chennai",
    website: "ksca.in",
    score: 58,
    heatScore: 51,
    status: "contacted",
    createdAt: days(9),
    lastActivityAt: days(5),
    reportSlug: "ksca-yzab567",
    verdict: "Missing E-E-A-T signals — add author bios and case studies.",
  },
  {
    id: "L-1034",
    name: "Neha Kapoor",
    business: "Kapoor Wellness Studio",
    email: "neha@kapoorwellness.com",
    phone: "+91 98111 33445",
    city: "Delhi",
    website: "kapoorwellness.com",
    score: 66,
    heatScore: 60,
    status: "scanned",
    createdAt: days(10),
    lastActivityAt: days(6),
    reportSlug: "kapoor-wellness-cdef890",
    verdict: "Decent metadata, GBP unclaimed, no FAQ schema.",
  },
  {
    id: "L-1033",
    name: "Sanjay Reddy",
    business: "Reddy Real Estate",
    email: "sanjay@reddyrealty.in",
    phone: "+91 98480 12321",
    city: "Hyderabad",
    website: "reddyrealty.in",
    score: 47,
    heatScore: 40,
    status: "verified",
    createdAt: days(1),
    lastActivityAt: hours(14),
    reportSlug: "reddy-realty-ghij123",
    verdict: "Site is slow and mobile-unfriendly — LLMs skip it.",
  },
  {
    id: "L-1032",
    name: "Ishaan Malhotra",
    business: "Malhotra Motors",
    email: "ishaan@malhotramotors.com",
    phone: "+91 98107 66778",
    city: "Gurugram",
    website: "malhotramotors.com",
    score: 74,
    heatScore: 66,
    status: "consult_booked",
    createdAt: days(12),
    lastActivityAt: days(1),
    reportSlug: "malhotra-motors-klmn456",
    verdict: "Strong inventory pages, weak About and reviews schema.",
  },
  {
    id: "L-1031",
    name: "Divya Nair",
    business: "Nair Boutique Hotels",
    email: "divya@nairhotels.in",
    phone: "+91 94470 88991",
    city: "Thiruvananthapuram",
    website: "nairhotels.in",
    score: 69,
    heatScore: 74,
    status: "won",
    createdAt: days(15),
    lastActivityAt: days(3),
    reportSlug: "nair-hotels-opqr789",
    verdict: "Well-loved brand, needs Hotel schema and multi-language pages.",
  },
  {
    id: "L-1030",
    name: "Arjun Ghosh",
    business: "Ghosh Photography",
    email: "arjun@ghoshphoto.in",
    phone: "+91 98300 11223",
    city: "Kolkata",
    website: "ghoshphoto.in",
    score: 51,
    heatScore: 48,
    status: "lost",
    createdAt: days(18),
    lastActivityAt: days(8),
    reportSlug: "ghosh-photo-stuv012",
    verdict: "Portfolio-heavy, text-light — LLMs can't quote you.",
  },
  {
    id: "L-1029",
    name: "Fatima Sheikh",
    business: "Sheikh Handicrafts",
    email: "fatima@sheikhhandicrafts.com",
    phone: "+91 94140 66554",
    city: "Jaipur",
    website: "sheikhhandicrafts.com",
    score: null,
    heatScore: 22,
    status: "verified",
    createdAt: hours(6),
    lastActivityAt: hours(2),
    reportSlug: "sheikh-handicrafts-wxyz345",
    verdict: "Scan pending.",
  },
  {
    id: "L-1028",
    name: "Manoj Bhat",
    business: "Bhat Organic Farms",
    email: "manoj@bhatorganic.in",
    phone: "+91 90080 44332",
    city: "Mysuru",
    website: "bhatorganic.in",
    score: null,
    heatScore: 12,
    status: "unverified",
    createdAt: hours(2),
    lastActivityAt: hours(2),
    reportSlug: "bhat-organic-abcd678",
    verdict: "Awaiting email verification.",
  },
  {
    id: "L-1027",
    name: "Lakshmi Pillai",
    business: "Pillai Silks",
    email: "lakshmi@pillaisilks.com",
    phone: "+91 94430 55221",
    city: "Coimbatore",
    website: "pillaisilks.com",
    score: 63,
    heatScore: 58,
    status: "contacted",
    createdAt: days(20),
    lastActivityAt: days(9),
    reportSlug: "pillai-silks-efgh901",
    verdict: "Good product coverage, no Organization schema.",
  },
  {
    id: "L-1026",
    name: "Rahul Verma",
    business: "Verma Tutorials",
    email: "rahul@vermatutorials.in",
    phone: "+91 98180 77665",
    city: "Noida",
    website: "vermatutorials.in",
    score: 33,
    heatScore: 25,
    status: "lost",
    createdAt: days(25),
    lastActivityAt: days(15),
    reportSlug: "verma-tutorials-ijkl234",
    verdict: "Thin content, no reviews on site, no schema.",
  },
];

type ActivityEvent = { at: string; label: string; detail?: string };

export function activityFor(id: string): ActivityEvent[] {
  const lead = leads.find((l) => l.id === id);
  if (!lead) return [];
  const base: ActivityEvent[] = [
    { at: lead.createdAt, label: "Scan requested", detail: `Submitted form from ${lead.city}` },
  ];
  if (lead.status !== "unverified") {
    base.push({
      at: new Date(new Date(lead.createdAt).getTime() + 12 * 60000).toISOString(),
      label: "Email verified",
    });
  }
  if (["scanned", "contacted", "consult_booked", "won", "lost"].includes(lead.status)) {
    base.push({
      at: new Date(new Date(lead.createdAt).getTime() + 90 * 60000).toISOString(),
      label: "Scan completed",
      detail: `Score ${lead.score ?? "—"}/100`,
    });
    base.push({
      at: new Date(new Date(lead.createdAt).getTime() + 4 * 3600000).toISOString(),
      label: "Report viewed",
      detail: "Opened /r/… on mobile",
    });
  }
  if (["contacted", "consult_booked", "won", "lost"].includes(lead.status)) {
    base.push({
      at: new Date(new Date(lead.lastActivityAt).getTime() - 3 * 3600000).toISOString(),
      label: "WhatsApp sent",
      detail: "Follow-up template A",
    });
  }
  if (["consult_booked", "won"].includes(lead.status)) {
    base.push({
      at: lead.lastActivityAt,
      label: "Consultation booked",
      detail: "20-min slot via Cal.com",
    });
  }
  if (lead.status === "won") {
    base.push({
      at: lead.lastActivityAt,
      label: "Marked as won",
      detail: "Signed up for Fix Plan",
    });
  }
  if (lead.status === "lost") {
    base.push({
      at: lead.lastActivityAt,
      label: "Marked as lost",
      detail: "No response after 3 follow-ups",
    });
  }
  return base.sort((a, b) => +new Date(b.at) - +new Date(a.at));
}

export function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30);
  return `${mo}mo ago`;
}
