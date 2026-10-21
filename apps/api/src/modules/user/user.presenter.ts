import { User } from '../../database/entities/user.entity';

export interface PublicLanguage {
  id: number;
  code: string;
  name: string;
}

export interface PublicUser {
  id: string;
  username: string;
  email?: string | null;
  display_name: string;
  avatar_url?: string | null;
  preferred_language: PublicLanguage | null;
  created_at: number;
  updated_at?: number;
  status: User['status'];
}

export function toPublicUser(user: User): PublicUser {
  const language = user.preferred_language;

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    display_name: user.display_name,
    avatar_url: user.avatar_url ?? null,
    preferred_language: language
      ? {
          id: Number(language.id),
          code: language.code,
          name: language.name,
        }
      : null,
    created_at: user.created_at,
    updated_at: user.updated_at,
    status: user.status,
  };
}
