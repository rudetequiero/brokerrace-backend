export type VerificationLevel =
  | "UNVERIFIED"
  | "IDENTITY_VERIFIED"
  | "VERIFIED_COMPANY"
  | "VERIFIED_BROKER"
  | "VERIFIED_EXCHANGE"
  | "LICENSE_VERIFIED";

export type BidStatus =
  | "PENDING"
  | "PROCESSING"
  | "PAID"
  | "FAILED"
  | "REFUNDED"
  | "DISPUTED"
  | "CHARGEBACK"
  | "CANCELLED";

export interface CompanyRow {
  id: string;
  slug: string;
  name: string;
  category: string;
  category_label: string;
  country: string | null;
  website: string | null;
  initials: string | null;
  logo_url: string | null;
  verification_level: VerificationLevel;
  current_bid_cents: string; // bigint comes back as string from pg
  total_clicks: string;
  created_at: string;
  updated_at: string;
}

export interface LeaderboardRow {
  rank: number;
  id: string;
  slug: string;
  name: string;
  category: string;
  categoryLabel: string;
  country: string | null;
  verified: boolean;
  verificationLevel: VerificationLevel;
  bidCents: number;
  bidLabel: string;
  delta24hCents: number;
  deltaLabel: string;
  clicks: number;
  initials: string;
  logoUrl: string | null;
}
