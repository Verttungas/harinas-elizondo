import { Router } from "express";
import { authRouter } from "../modules/auth/auth.routes.js";
import certificadosRouter from "../modules/certificados/certificados.routes.js";
import clientesRouter from "../modules/clientes/clientes.routes.js";
import equiposRouter from "../modules/equipos/equipos.routes.js";
import inspeccionesRouter from "../modules/inspecciones/inspecciones.routes.js";
import lotesRouter from "../modules/lotes/lotes.routes.js";
import productosRouter from "../modules/productos/productos.routes.js";
import reportesRouter from "../modules/reportes/reportes.routes.js";
import usuariosRouter from "../modules/usuarios/usuarios.routes.js";
import { healthRouter } from "./health.routes.js";

export const apiRouter = Router();

apiRouter.use("/health", healthRouter);
apiRouter.use("/auth", authRouter);
apiRouter.use("/equipos", equiposRouter);
apiRouter.use("/clientes", clientesRouter);
apiRouter.use("/productos", productosRouter);
apiRouter.use("/lotes", lotesRouter);
apiRouter.use("/inspecciones", inspeccionesRouter);
apiRouter.use("/certificados", certificadosRouter);
apiRouter.use("/reportes", reportesRouter);
apiRouter.use("/usuarios", usuariosRouter);

export default apiRouter;
