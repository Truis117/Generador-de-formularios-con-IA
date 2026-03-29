import { Request, Response, NextFunction } from "express";
import { CreateSessionBodySchema, CreateRoundBodySchema, AttemptBodySchema } from "@quiz/contracts";
import { SessionService } from "../services/session.service.js";

export class SessionController {
  private sessionService = new SessionService();

  async createSession(req: Request, res: Response, next: NextFunction) {
    const data = CreateSessionBodySchema.parse(req.body);
    const session = await this.sessionService.createSession(req.userId!, data.topic);
    res.status(201).json(session);
  }

  async listSessions(req: Request, res: Response, next: NextFunction) {
    const sessions = await this.sessionService.listSessions(req.userId!);
    res.json(sessions);
  }

  async getSession(req: Request, res: Response, next: NextFunction) {
    const session = await this.sessionService.getSession(req.userId!, req.params.id as string);
    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }
    res.json(session);
  }

  async createRound(req: Request, res: Response, next: NextFunction) {
    const data = CreateRoundBodySchema.parse(req.body);
    const round = await this.sessionService.createRound(req.userId!, req.params.id as string, data);
    res.status(201).json(round);
  }

  async streamRound(req: Request, res: Response, next: NextFunction) {
    await this.sessionService.streamRound(req.userId!, req.params.id as string, req, res);
  }

  async attemptQuestion(req: Request, res: Response, next: NextFunction) {
    const data = AttemptBodySchema.parse(req.body);
    const result = await this.sessionService.attemptQuestion(
      req.userId!,
      req.params.id as string,
      req.params.questionId as string,
      data
    );
    res.json(result);
  }
}
