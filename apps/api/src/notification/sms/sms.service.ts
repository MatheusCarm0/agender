import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Provedor de SMS transacional (OTP de login do cliente e verificações).
 *
 * Abstração fina sobre um gateway concreto — hoje o Twilio, acessado pela REST
 * API via `fetch` (sem SDK, para não puxar dependência pesada). A regra de
 * negócio nunca fala com o Twilio direto: enfileira a notificação e o worker
 * chama `send()`. Trocar de provedor (ex.: Zenvia) é reescrever só este arquivo.
 *
 * Sem credenciais configuradas, o envio é simulado em log — igual ao Resend no
 * NotificationProcessor. Assim o fluxo E2E roda em dev/testes com o `devCode`
 * sem custo, e o Twilio só entra de fato em produção.
 */
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly accountSid: string | undefined;
  private readonly authToken: string | undefined;
  private readonly fromNumber: string | undefined;

  constructor(private readonly config: ConfigService) {
    this.accountSid = this.config.get<string>('TWILIO_ACCOUNT_SID');
    this.authToken = this.config.get<string>('TWILIO_AUTH_TOKEN');
    this.fromNumber = this.config.get<string>('TWILIO_FROM_NUMBER');
    if (!this.isConfigured) {
      this.logger.warn(
        'Twilio não configurado (TWILIO_ACCOUNT_SID/AUTH_TOKEN/FROM_NUMBER) — SMS serão apenas logados.',
      );
    }
  }

  get isConfigured(): boolean {
    return !!(this.accountSid && this.authToken && this.fromNumber);
  }

  /**
   * Envia um SMS. Retorna true em sucesso (ou em modo simulado), false em falha
   * real — o chamador decide se registra falha ou tenta outro canal.
   */
  async send(to: string, body: string): Promise<boolean> {
    const normalized = SmsService.toE164(to);
    if (!normalized) {
      this.logger.error(`Número de destino inválido para SMS: ${to}`);
      return false;
    }

    if (!this.isConfigured) {
      this.logger.log(`[SIMULATED SMS] To: ${normalized} | Body: ${body}`);
      return true;
    }

    try {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
      const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');
      const params = new URLSearchParams({
        To: normalized,
        From: this.fromNumber!,
        Body: body,
      });

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      if (!res.ok) {
        const detail = await res.text();
        this.logger.error(`Twilio SMS falhou (${res.status}): ${detail}`);
        return false;
      }

      this.logger.log(`SMS enviado para ${normalized}`);
      return true;
    } catch (err: any) {
      this.logger.error(`Exceção ao enviar SMS: ${err.message}`);
      return false;
    }
  }

  /**
   * Normaliza para E.164 (formato exigido pelo Twilio). Heurística de partida
   * assumindo Brasil quando não há código de país — ajustar se abrir para
   * outros países. Já em E.164 (com "+") é mantido.
   */
  static toE164(raw: string): string | null {
    if (!raw) return null;
    const trimmed = raw.trim();
    if (trimmed.startsWith('+')) {
      const digits = trimmed.slice(1).replace(/\D/g, '');
      return digits.length >= 8 ? `+${digits}` : null;
    }
    const digits = trimmed.replace(/\D/g, '');
    if (digits.length < 10) return null; // telefone BR sem DDD → inválido
    if (digits.startsWith('55') && digits.length >= 12) return `+${digits}`;
    return `+55${digits}`;
  }
}
