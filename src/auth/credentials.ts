export const PASSWORD_TOO_SHORT = "A senha precisa ter ao menos 6 caracteres";
export const EMAIL_INVALID = "E-mail inválido";
export const CREDENTIALS_REJECTED = "E-mail ou senha incorretos";
export const NETWORK_FAILURE = "Sem conexão. Tente de novo.";

export function validateCredentials(email: string, password: string): string | null {
  if (!email.trim().includes("@")) {
    return EMAIL_INVALID;
  }
  if (password.length < 6) {
    return PASSWORD_TOO_SHORT;
  }
  return null;
}
