import { Router } from "express";
import type { IRouter } from "express";
import { AuthController } from "../controllers/auth.controller.js";

export const authRouter: IRouter = Router();
const controller = new AuthController();

authRouter.post("/register", (req, res, next) => { controller.register(req, res, next).catch(next); });
authRouter.post("/login", (req, res, next) => { controller.login(req, res, next).catch(next); });
authRouter.post("/refresh", (req, res, next) => { controller.refresh(req, res, next).catch(next); });
authRouter.post("/logout", (req, res, next) => { controller.logout(req, res, next).catch(next); });
