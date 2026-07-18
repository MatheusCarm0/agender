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
