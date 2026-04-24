import bcrypt from "bcrypt";
import { jest } from "@jest/globals";

import { AuthService } from "../../../../src/modules/auth/auth.service.js";
import {
  AccountLockedError,
  InvalidCredentialsError,
  NotFoundError,
  UnauthorizedError,
} from "../../../../src/domain/errors.js";

interface UsuarioMock {
  id: bigint;
  correo: string;
  passwordHash: string;
  nombre: string;
  rol: string;
  activo: boolean;
  intentosFallidos: number;
  bloqueadoHasta: Date | null;
}

function buildUsuario(overrides: Partial<UsuarioMock> = {}): UsuarioMock {
  return {
    id: 1n,
    correo: "control@test.mx",
    passwordHash: "$2b$10$hash",
    nombre: "Test",
    rol: "CONTROL_CALIDAD",
    activo: true,
    intentosFallidos: 0,
    bloqueadoHasta: null,
    ...overrides,
  };
}

function buildPrismaMock() {
  const usuarioFindUnique = jest.fn();
  const usuarioUpdate = jest.fn();
  const bitacoraCreate = jest.fn();
  const txFn = jest.fn((arr: unknown) => {
    // Acepta array (para operaciones batched) o callback (para interactive tx).
    if (Array.isArray(arr)) return Promise.resolve(arr);
    // @ts-expect-error dynamic invocation en los tests
    return (arr as (tx: unknown) => unknown)(mock);
  });
  const mock = {
    usuario: {
      findUnique: usuarioFindUnique,
      update: usuarioUpdate,
    },
    bitacora: {
      create: bitacoraCreate,
    },
    $transaction: txFn,
  };
  return { mock, usuarioFindUnique, usuarioUpdate, bitacoraCreate };
}

describe("AuthService.login", () => {
  it("lanza InvalidCredentialsError cuando el correo no existe", async () => {
    const { mock, usuarioFindUnique } = buildPrismaMock();
    usuarioFindUnique.mockResolvedValue(null as never);
    const service = new AuthService(mock as never);

    await expect(
      service.login({ correo: "no-existe@x.com", password: "pw" }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
  });

  it("lanza AccountLockedError si el usuario sigue bloqueado", async () => {
    const { mock, usuarioFindUnique } = buildPrismaMock();
    usuarioFindUnique.mockResolvedValue(
      buildUsuario({
        bloqueadoHasta: new Date(Date.now() + 60_000),
      }) as never,
    );
    const service = new AuthService(mock as never);

    await expect(
      service.login({ correo: "control@test.mx", password: "pw" }),
    ).rejects.toBeInstanceOf(AccountLockedError);
  });

  it("lanza UnauthorizedError si el usuario está inactivo", async () => {
    const { mock, usuarioFindUnique } = buildPrismaMock();
    usuarioFindUnique.mockResolvedValue(
      buildUsuario({ activo: false }) as never,
    );
    const service = new AuthService(mock as never);

    await expect(
      service.login({ correo: "control@test.mx", password: "pw" }),
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("incrementa intentos fallidos y lanza InvalidCredentialsError con password incorrecta", async () => {
    const compareSpy = jest.spyOn(bcrypt, "compare").mockResolvedValue(false as never);
    const { mock, usuarioFindUnique, usuarioUpdate, bitacoraCreate } = buildPrismaMock();
    usuarioFindUnique.mockResolvedValue(
      buildUsuario({ intentosFallidos: 0 }) as never,
    );
    const service = new AuthService(mock as never);

    await expect(
      service.login({ correo: "control@test.mx", password: "wrong" }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);

    expect(usuarioUpdate).toHaveBeenCalledTimes(1);
    const updateCall = usuarioUpdate.mock.calls[0]?.[0] as {
      data: { intentosFallidos: number; bloqueadoHasta: Date | null };
    };
    expect(updateCall.data.intentosFallidos).toBe(1);
    expect(updateCall.data.bloqueadoHasta).toBeNull();

    expect(bitacoraCreate).toHaveBeenCalledTimes(1);
    const bitacoraCall = bitacoraCreate.mock.calls[0]?.[0] as {
      data: { accion: string };
    };
    expect(bitacoraCall.data.accion).toBe("LOGIN_FALLIDO");

    compareSpy.mockRestore();
  });

  it("bloquea al usuario en el 5° intento fallido consecutivo", async () => {
    const compareSpy = jest.spyOn(bcrypt, "compare").mockResolvedValue(false as never);
    const { mock, usuarioFindUnique, usuarioUpdate } = buildPrismaMock();
    usuarioFindUnique.mockResolvedValue(
      buildUsuario({ intentosFallidos: 4 }) as never,
    );
    const service = new AuthService(mock as never);

    await expect(
      service.login({ correo: "control@test.mx", password: "wrong" }),
    ).rejects.toBeInstanceOf(AccountLockedError);

    const updateCall = usuarioUpdate.mock.calls[0]?.[0] as {
      data: { intentosFallidos: number; bloqueadoHasta: Date | null };
    };
    // Al alcanzar el límite se resetea a 0 y se asigna bloqueadoHasta futuro.
    expect(updateCall.data.intentosFallidos).toBe(0);
    expect(updateCall.data.bloqueadoHasta).not.toBeNull();
    expect(updateCall.data.bloqueadoHasta!.getTime()).toBeGreaterThan(Date.now());

    compareSpy.mockRestore();
  });

  it("retorna token y datos del usuario en login exitoso y resetea intentos", async () => {
    const compareSpy = jest.spyOn(bcrypt, "compare").mockResolvedValue(true as never);
    const { mock, usuarioFindUnique, usuarioUpdate, bitacoraCreate } = buildPrismaMock();
    usuarioFindUnique.mockResolvedValue(
      buildUsuario({ intentosFallidos: 3 }) as never,
    );
    const service = new AuthService(mock as never);

    const result = await service.login({
      correo: "control@test.mx",
      password: "pw-correcta",
    });

    expect(result.token).toEqual(expect.any(String));
    expect(result.token.length).toBeGreaterThan(20);
    expect(result.usuario.correo).toBe("control@test.mx");
    expect(result.usuario.rol).toBe("CONTROL_CALIDAD");

    const updateCall = usuarioUpdate.mock.calls[0]?.[0] as {
      data: { intentosFallidos: number; bloqueadoHasta: Date | null };
    };
    expect(updateCall.data.intentosFallidos).toBe(0);
    expect(updateCall.data.bloqueadoHasta).toBeNull();

    const bitacoraCall = bitacoraCreate.mock.calls[0]?.[0] as {
      data: { accion: string };
    };
    expect(bitacoraCall.data.accion).toBe("LOGIN_EXITOSO");

    compareSpy.mockRestore();
  });
});

describe("AuthService.getUserById", () => {
  it("retorna datos públicos del usuario encontrado", async () => {
    const { mock, usuarioFindUnique } = buildPrismaMock();
    usuarioFindUnique.mockResolvedValue(
      buildUsuario({ id: 42n, correo: "x@y.com", nombre: "Juan" }) as never,
    );
    const service = new AuthService(mock as never);

    const u = await service.getUserById(42n);
    expect(u.id).toBe(42n);
    expect(u.correo).toBe("x@y.com");
    expect(u.nombre).toBe("Juan");
  });

  it("lanza NotFoundError cuando el usuario no existe", async () => {
    const { mock, usuarioFindUnique } = buildPrismaMock();
    usuarioFindUnique.mockResolvedValue(null as never);
    const service = new AuthService(mock as never);

    await expect(service.getUserById(999n)).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("AuthService.logLogout", () => {
  it("registra en bitácora con acción LOGOUT", async () => {
    const { mock, bitacoraCreate } = buildPrismaMock();
    const service = new AuthService(mock as never);

    await service.logLogout(1n, "x@y.com", "127.0.0.1");

    expect(bitacoraCreate).toHaveBeenCalledTimes(1);
    const call = bitacoraCreate.mock.calls[0]?.[0] as {
      data: { accion: string; detalle: { correo: string; ip: string | null } };
    };
    expect(call.data.accion).toBe("LOGOUT");
    expect(call.data.detalle.correo).toBe("x@y.com");
    expect(call.data.detalle.ip).toBe("127.0.0.1");
  });
});
