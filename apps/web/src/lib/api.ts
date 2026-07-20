const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const ERROR_TRANSLATIONS: Record<string, string> = {
  'Invalid credentials': 'Credenciais inválidas',
  'Time slot is already booked': 'Este horário já está reservado',
  'Insufficient contrast between text and background': 'Contraste insuficiente entre texto e fundo',
  'Business slug already taken': 'Este nome de negócio já está em uso',
  'Professional does not offer this service': 'Este profissional não oferece este serviço',
  'Business not found': 'Negócio não encontrado',
  'Appointment not found': 'Agendamento não encontrado',
  'User not found': 'Usuário não encontrado',
  'No tenant context': 'Sessão inválida',
  'Invalid refresh token': 'Sessão expirada',
  'Account deactivated': 'Conta desativada',
  'Session invalidated': 'Sessão expirada',
  'Active user with this email already exists': 'Já existe um usuário ativo com este e-mail',
  'Professional already linked to an active user': 'Profissional já vinculado a outro usuário ativo',
  'Professional already linked to another active user': 'Profissional já vinculado a outro usuário ativo',
  'professionalId is required for professional role': 'Selecione um profissional para vincular',
  'Cannot deactivate owner': 'Não é possível desativar o proprietário',
  'Cannot deactivate the last admin/owner': 'Não é possível desativar o último administrador',
  'Cannot modify owner': 'Não é possível modificar o proprietário',
  'Invalid or expired invite': 'Convite inválido ou expirado',
  'Invite not found or already accepted': 'Convite não encontrado ou já aceito',
  'Invalid or expired reset token': 'Link de redefinição inválido ou expirado',
  'Professional not found': 'Profissional não encontrado',
  'Inactive user not found': 'Usuário inativo não encontrado',
};

function translateError(message: string): string {
  return ERROR_TRANSLATIONS[message] || message;
}

interface FetchOptions extends RequestInit {
  token?: string;
}

export async function api<T = unknown>(
  path: string,
  options: FetchOptions = {},
): Promise<T> {
  const { token, headers, ...rest } = options;
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      ...rest,
    });
  } catch {
    throw new ApiError(0, 'Não foi possível conectar ao servidor. Verifique sua conexão.');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, translateError(body.message || res.statusText));
  }

  return res.json();
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
