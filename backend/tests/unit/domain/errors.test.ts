import {
  AccountLockedError,
  ConflictError,
  DomainError,
  ForbiddenError,
  InvalidCredentialsError,
  NotFoundError,
  UnauthorizedError,
  UnprocessableEntityError,
  ValidationError,
} from "../../../src/domain/errors.js";

describe("DomainError (clases de error de dominio)", () => {
  it("DomainError es abstracta y extiende Error", () => {
    const err = new ValidationError("X");
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(DomainError);
    expect(err.name).toBe("ValidationError");
  });

  it("ValidationError tiene código VALIDATION_ERROR y statusCode 400", () => {
    const err = new ValidationError();
    expect(err.code).toBe("VALIDATION_ERROR");
    expect(err.statusCode).toBe(400);
    expect(err.message).toMatch(/inválidos/i);
  });

  it("ValidationError acepta mensaje y detalles personalizados", () => {
    const err = new ValidationError("Campo X inválido", { campo: "x" });
    expect(err.message).toBe("Campo X inválido");
    expect(err.details).toEqual({ campo: "x" });
  });

  it("UnauthorizedError tiene statusCode 401 y mensaje en español", () => {
    const err = new UnauthorizedError();
    expect(err.code).toBe("UNAUTHORIZED");
    expect(err.statusCode).toBe(401);
    expect(err.message).toMatch(/autenticado/i);
  });

  it("InvalidCredentialsError tiene statusCode 401 y código INVALID_CREDENTIALS", () => {
    const err = new InvalidCredentialsError();
    expect(err.code).toBe("INVALID_CREDENTIALS");
    expect(err.statusCode).toBe(401);
    expect(err.message).toMatch(/credenciales/i);
  });

  it("AccountLockedError tiene código ACCOUNT_LOCKED y mensaje en español", () => {
    const err = new AccountLockedError();
    expect(err.code).toBe("ACCOUNT_LOCKED");
    expect(err.statusCode).toBe(401);
    expect(err.message).toMatch(/bloqueada/i);
  });

  it("ForbiddenError tiene statusCode 403 y código FORBIDDEN", () => {
    const err = new ForbiddenError();
    expect(err.code).toBe("FORBIDDEN");
    expect(err.statusCode).toBe(403);
    expect(err.message).toMatch(/permisos/i);
  });

  it("NotFoundError tiene statusCode 404 y código NOT_FOUND", () => {
    const err = new NotFoundError();
    expect(err.code).toBe("NOT_FOUND");
    expect(err.statusCode).toBe(404);
    expect(err.message).toMatch(/no encontrado/i);
  });

  it("ConflictError tiene statusCode 409 y código CONFLICT", () => {
    const err = new ConflictError();
    expect(err.code).toBe("CONFLICT");
    expect(err.statusCode).toBe(409);
    expect(err.message).toMatch(/conflicto/i);
  });

  it("UnprocessableEntityError tiene statusCode 422 y código UNPROCESSABLE_ENTITY", () => {
    const err = new UnprocessableEntityError();
    expect(err.code).toBe("UNPROCESSABLE_ENTITY");
    expect(err.statusCode).toBe(422);
  });

  it("los errores de dominio pueden lanzarse y capturarse como DomainError", () => {
    const lanzar = (): never => {
      throw new NotFoundError("Cliente X");
    };
    try {
      lanzar();
      fail("debería haber lanzado");
    } catch (err) {
      expect(err).toBeInstanceOf(DomainError);
      expect(err).toBeInstanceOf(NotFoundError);
      if (err instanceof DomainError) {
        expect(err.statusCode).toBe(404);
      }
    }
  });
});
