export abstract class DomainError extends Error {
  public abstract readonly code: string;
  public abstract readonly statusCode: number;
  public readonly details?: unknown;

  constructor(message: string, details?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.details = details;
  }
}

export class ValidationError extends DomainError {
  readonly code = "VALIDATION_ERROR";
  readonly statusCode = 400;

  constructor(message = "Datos de entrada inválidos", details?: unknown) {
    super(message, details);
  }
}

export class UnauthorizedError extends DomainError {
  readonly code = "UNAUTHORIZED";
  readonly statusCode = 401;

  constructor(message = "No autenticado", details?: unknown) {
    super(message, details);
  }
}

export class InvalidCredentialsError extends DomainError {
  readonly code = "INVALID_CREDENTIALS";
  readonly statusCode = 401;

  constructor(message = "Credenciales inválidas", details?: unknown) {
    super(message, details);
  }
}

export class AccountLockedError extends DomainError {
  readonly code = "ACCOUNT_LOCKED";
  readonly statusCode = 401;

  constructor(
    message = "Cuenta temporalmente bloqueada. Intente más tarde.",
    details?: unknown,
  ) {
    super(message, details);
  }
}

export class ForbiddenError extends DomainError {
  readonly code = "FORBIDDEN";
  readonly statusCode = 403;

  constructor(message = "No tiene permisos para esta acción", details?: unknown) {
    super(message, details);
  }
}

export class NotFoundError extends DomainError {
  readonly code = "NOT_FOUND";
  readonly statusCode = 404;

  constructor(message = "Recurso no encontrado", details?: unknown) {
    super(message, details);
  }
}

export class ConflictError extends DomainError {
  readonly code = "CONFLICT";
  readonly statusCode = 409;

  constructor(message = "Conflicto con el estado actual del recurso", details?: unknown) {
    super(message, details);
  }
}

export class UnprocessableEntityError extends DomainError {
  readonly code = "UNPROCESSABLE_ENTITY";
  readonly statusCode = 422;

  constructor(message = "No se pudo procesar la solicitud", details?: unknown) {
    super(message, details);
  }
}
