import request from "supertest";
import type { Express } from "express";
import { TEST_PASSWORD } from "./db.js";

export interface LoginOk {
  token: string;
  usuario: {
    id: string;
    correo: string;
    nombre: string;
    rol: string;
  };
}

export async function loginAs(
  app: Express,
  correo: string,
  password: string = TEST_PASSWORD,
): Promise<string> {
  const res = await request(app)
    .post("/api/v1/auth/login")
    .send({ correo, password });

  if (res.status !== 200) {
    throw new Error(
      `loginAs(${correo}) falló con status ${res.status}: ${JSON.stringify(res.body)}`,
    );
  }

  const body = res.body as LoginOk;
  return body.token;
}
