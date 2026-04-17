import type { NextFunction, Request, Response } from "express";
import type { AuthenticatedRequest } from "../../middlewares/auth.middleware.js";
import { productosService } from "./productos.service.js";
import type {
  CrearProductoInput,
  ListProductosQuery,
} from "./productos.schemas.js";

export async function listProductos(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = req.query as unknown as ListProductosQuery;
    const result = await productosService.list(query);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function crearProducto(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = req.body as CrearProductoInput;
    const user = (req as AuthenticatedRequest).user;
    const producto = await productosService.crear(body, user.id);
    res
      .status(201)
      .location(`/api/v1/productos/${producto.id.toString()}`)
      .json(producto);
  } catch (err) {
    next(err);
  }
}
