export type ContactChannel = 'whatsapp' | 'linkedin' | 'email' | 'instagram';
export type LeadSource = 'apollo' | 'apify_maps' | 'linkedin' | 'manual' | 'csv';
export type LeadStatus =
  | 'prospected'
  | 'analyzing'
  | 'briefed'
  | 'pending_approval'
  | 'sent'
  | 'replied'
  | 'meeting_scheduled'
  | 'won'
  | 'lost'
  | 'archived';
export type ToneType = 'formal' | 'descontraido' | 'tecnico';

export interface IcpSegment {
  id: string;
  name: string;
  display_name: string;
  pain_description: string;
  qualification_signals: string[];
  primary_channel: ContactChannel;
  secondary_channel: ContactChannel | null;
  message_template_key: string | null;
  is_active: boolean;
  created_at: string;
}

export interface OutreachLead {
  id: string;
  company_name: string;
  responsible_name: string | null;
  responsible_title: string | null;
  segment_id: string | null;
  company_size: string | null;
  contact_channel: ContactChannel;
  contact_value: string;
  source: LeadSource;
  google_place_id: string | null;
  website_url: string | null;
  linkedin_url: string | null;
  instagram_url: string | null;
  probable_pain: string | null;
  qualification_score: number;
  status: LeadStatus;
  heat_score: number;
  raw_places_data: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  // joins
  icp_segments?: IcpSegment;
  lead_briefings?: LeadBriefing;
}

export interface LeadBriefing {
  id: string;
  lead_id: string;
  company_name: string;
  segment: string;
  main_pain: string;
  intellix_solution: string;
  sales_angle: string;
  recommended_tone: ToneType;
  probable_objection: string | null;
  objection_counter: string | null;
  ideal_channel: ContactChannel;
  sources_analyzed: string[];
  generated_at: string;
  model_used: string;
}

export interface ProspectorPayload {
  source: LeadSource;
  segment_name: string;
  limit?: number;
  location?: string;
}

export interface AnalystPayload {
  lead_id: string;
}
