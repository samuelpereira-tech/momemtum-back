# Sistema de Autenticação

Sistema de autenticação escalável usando Supabase, suportando múltiplos métodos de autenticação.

## Estrutura

```
authentication/
├── core/
│   ├── interfaces/          # Interfaces e tipos
│   ├── strategies/          # Estratégias de autenticação
│   ├── services/            # Serviços de autenticação
│   ├── controllers/         # Controllers REST
│   ├── guards/              # Guards de autenticação
│   ├── decorators/          # Decorators personalizados
│   ├── dto/                 # Data Transfer Objects
│   └── authentication.module.ts
```

## Métodos de Autenticação Suportados

### 1. Email/Senha
- **Sign Up**: `POST /auth/signup`
- **Sign In**: `POST /auth/signin/email-password`

### 2. OAuth
- **Iniciar OAuth**: `GET /auth/signin/oauth?provider=google&redirectUri=...`
- **Callback OAuth**: `GET /auth/signin/oauth/callback?provider=...&code=...`

Provedores suportados:
- Google
- GitHub
- Facebook
- Apple

### 3. Magic Link
- **Enviar Magic Link**: `POST /auth/signin/magic-link`
- **Verificar Magic Link**: `POST /auth/signin/magic-link/verify`

### 4. OTP (One-Time Password)
- **Enviar OTP**: `POST /auth/signin/otp`
- **Verificar OTP**: `POST /auth/signin/otp/verify`

## Endpoints

### Públicos
- `POST /auth/signup` - Criar conta
- `POST /auth/signin/email-password` - Login com email/senha
- `GET /auth/signin/oauth` - Iniciar OAuth
- `POST /auth/signin/magic-link` - Enviar magic link
- `POST /auth/signin/otp` - Enviar/verificar OTP
- `POST /auth/refresh` - Renovar token

### Protegidos (requerem autenticação)
- `GET /auth/me` - Obter usuário atual
- `POST /auth/signout` - Logout

## Uso

### Proteger rotas
```typescript
import { UseGuards } from '@nestjs/common';
import { AuthGuard } from './authentication/core/guards/auth.guard';
import { CurrentUser } from './authentication/core/decorators/current-user.decorator';

@UseGuards(AuthGuard)
@Get('profile')
getProfile(@CurrentUser() user: User) {
  return user;
}
```

### Tornar rotas públicas
```typescript
import { Public } from './authentication/core/decorators/public.decorator';

@Public()
@Get('public')
getPublic() {
  return { message: 'Public route' };
}
```

## Testes

Todos os componentes possuem testes unitários:
- Estratégias de autenticação
- Serviços
- Guards
- Controllers
- Supabase Service

Execute os testes com:
```bash
yarn test
```

## Nota

Esta é uma implementação **mockada** para validação. Para usar em produção, substitua o `SupabaseService` mock pela implementação real do Supabase.

