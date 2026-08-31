export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface ConfigEntry {
  id: string;
  key: string;
  value: unknown;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ConfigCreateInput {
  key: string;
  value: unknown;
  description?: string | null;
  is_active?: boolean;
}

export interface ConfigUpdateInput {
  value?: unknown;
  description?: string | null;
  is_active?: boolean;
}

export interface QueryInfoEntry {
  id: string;
  name: string;
  query: string;
  batch_size: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface QueryInfoCreateInput {
  name: string;
  query: string;
  batch_size?: number;
  is_active?: boolean;
}

export interface QueryInfoUpdateInput {
  query?: string;
  batch_size?: number;
  is_active?: boolean;
}

export interface AccessTokenClaims {
  sub: string;
  role: string;
  type: string;
  exp: number;
}
