export type FunnelStatus = 'Not Contacted' | 'In Process' | 'Approved' | 'Rejected' | 'Later';

export interface ClientLead {
  id: string;
  client_name: string;
  phone_number: string | null;
  email: string | null;
  city: string | null;
  business_type: string | null;
  website_exists: boolean;
  website_url: string | null;
  pitch_status: FunnelStatus;
  estimated_value: number;
  reminder_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface TimelineLog {
  id: string;
  lead_id: string;
  type: string;
  content: string;
  created_at: string;
}
