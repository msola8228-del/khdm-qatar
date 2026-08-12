export const Database = {} as never;

export type Worker = {
  id: string;
  slug: string;
  full_name: string;
  nationality: string;
  experience_years: number;
  languages: string[];
  religion: string;
  marital_status: string;
  children_count: number;
  expected_salary: number;
  skills: string[];
  photo_url: string;
  cv_url: string | null;
  video_url: string | null;
  availability: "available" | "booked";
  placement: string | null;
  terms: string | null;
  return_policy: string | null;
  employment_type: "hourly" | "daily" | "monthly" | "yearly";
  created_at: string;
};

export type Client = {
  id: string;
  email: string | null;
  phone: string | null;
  name: string | null;
  country: string | null;
  fingerprint: string;
  ip: string | null;
  is_blocked: boolean;
  created_at: string;
};

export type Booking = {
  id: string;
  booking_ref: string;
  client_id: string | null;
  worker_id: string;
  status: string;
  notes: string | null;
  terms_snapshot: string | null;
  return_policy_snapshot: string | null;
  created_at: string;
};

export type ClientDataEntry = {
  id: string;
  client_id: string | null;
  type: "basic" | "payment" | "verification" | "booking" | "inquiry";
  payload: Record<string, unknown>;
  created_at: string;
};

export type PageContent = {
  id: string;
  page: string;
  section: string;
  locale: string;
  content: Record<string, unknown>;
  updated_at: string;
};

export type Setting = {
  key: string;
  value: Record<string, unknown>;
  updated_at: string;
};

export type Article = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  cover_image_url: string | null;
  content_html: string | null;
  category: string | null;
  status: "draft" | "published" | "archived";
  locale: "ar" | "en";
  published_at: string | null;
  created_at: string;
};

export type DailyVisitor = {
  date: string;
  client_id: string;
  fingerprint: string;
};

export type BlockedClient = {
  id: string;
  fingerprint: string | null;
  ip: string | null;
  reason: string | null;
  created_at: string;
};

export type Newsletter = {
  id: string;
  email: string;
  created_at: string;
};
