import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient as SupabaseClientType } from '@supabase/supabase-js';
import { SupabaseClient } from '../../../../authentication/core/interfaces/supabase.interface';

@Injectable()
export class SupabaseService implements OnModuleInit {
  private client: SupabaseClientType<any, 'public', any>;
  private supabaseUrl: string;
  private supabaseAnonKey: string;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseAnonKey = this.configService.get<string>('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error(
        'SUPABASE_URL and SUPABASE_ANON_KEY must be set in environment variables',
      );
    }

    this.supabaseUrl = supabaseUrl;
    this.supabaseAnonKey = supabaseAnonKey;
    this.client = createClient(this.supabaseUrl, this.supabaseAnonKey);
  }

  getClient(): SupabaseClient {
    return this.client as unknown as SupabaseClient;
  }

  async healthCheck(): Promise<{ status: string; message: string; connected: boolean }> {
    try {
      // Verifica se o cliente foi inicializado
      if (!this.client) {
        return {
          status: 'error',
          message: 'Supabase client not initialized',
          connected: false,
        };
      }

      // Tenta fazer uma requisição simples para verificar a conexão
      // getSession() é uma operação leve que não requer autenticação
      const { error } = await this.client.auth.getSession();
      
      // Se não houver erro ou o erro for apenas "sem sessão", está conectado
      if (!error || error.message === 'Invalid Refresh Token: Refresh Token Not Found' || error.message.includes('session')) {
        return {
          status: 'ok',
          message: 'Supabase is connected and responding',
          connected: true,
        };
      }

      return {
        status: 'error',
        message: `Supabase connection error: ${error.message}`,
        connected: false,
      };
    } catch (error: any) {
      return {
        status: 'error',
        message: `Supabase health check failed: ${error?.message || 'Unknown error'}`,
        connected: false,
      };
    }
  }

}

