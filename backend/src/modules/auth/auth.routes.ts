import { Router } from "express";
import { validate } from "../../middlewares/validate.middleware.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { getMe, postLogin, postLogout } from "./auth.controller.js";
import { loginSchema } from "./auth.schemas.js";

export const authRouter = Router();

authRouter.post("/login", validate({ body: loginSchema }), postLogin);
authRouter.get("/me", requireAuth, getMe);
authRouter.post("/logout", requireAuth, postLogout);

export default authRouter;
