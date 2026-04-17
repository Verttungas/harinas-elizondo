import { Router } from "express";
import { authRouter } from "../modules/auth/auth.routes.js";
import clientesRouter from "../modules/clientes/clientes.routes.js";
import equiposRouter from "../modules/equipos/equipos.routes.js";
import lotesRouter from "../modules/lotes/lotes.routes.js";
import productosRouter from "../modules/productos/productos.routes.js";
import { healthRouter } from "./health.routes.js";

export const apiRouter = Router();

apiRouter.use("/health", healthRouter);
apiRouter.use("/auth", authRouter);
apiRouter.use("/equipos", equiposRouter);
apiRouter.use("/clientes", clientesRouter);
apiRouter.use("/productos", productosRouter);
apiRouter.use("/lotes", lotesRouter);

export default apiRouter;
