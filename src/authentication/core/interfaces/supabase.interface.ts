export interface SupabaseClient {
  auth: {
    signUp: (credentials: any) => Promise<{ data: any; error: any }>;
    signInWithPassword: (credentials: any) => Promise<{ data: any; error: any }>;
    signInWithOtp: (credentials: any) => Promise<{ data: any; error: any }>;
    signInWithOAuth: (options: any) => Promise<{ data: any; error: any }>;
    verifyOtp: (credentials: any) => Promise<{ data: any; error: any }>;
    getSession: () => Promise<{ data: { session: any } | null; error: any }>;
    getUser: (token?: string) => Promise<{ data: { user: any } | null; error: any }>;
    signOut: () => Promise<{ error: any }>;
    refreshSession: (refreshToken: string) => Promise<{ data: any; error: any }>;
    updateUser: (attributes: any) => Promise<{ data: any; error: any }>;
  };
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

