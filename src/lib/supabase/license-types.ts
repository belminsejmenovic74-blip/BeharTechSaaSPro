export type LicenseKeyStatus = 'active' | 'inactive' | 'used' | 'expired';
export type LicensePlan = 'free' | 'starter' | 'pro' | 'business';

export interface LicenseKey {
  id: string;
  key_hash: string;
  key_preview: string;
  download_token_hash: string;
  status: LicenseKeyStatus;
  assigned_customer_name?: string | null;
  assigned_customer_email?: string | null;
  plan: LicensePlan;
  max_devices: number;
  used_devices: number;
  download_count: number;
  last_downloaded_at?: string | null;
  expires_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface GenerateLicensesResult {
  success: boolean;
  message?: string;
  count?: number;
  licenses?: {
    id: string;
    key: string;            // FULL KEY (only available immediately after generation)
    token: string;          // FULL TOKEN (only available immediately after generation)
    keyPreview: string;
    status: LicenseKeyStatus;
    plan: LicensePlan;
  }[];
}
