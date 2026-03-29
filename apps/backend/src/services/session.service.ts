import { prisma } from "../lib/prisma.js";
import { CreateRoundBody, serializeSseEvent, SseEvent } from "@quiz/contracts";
import { Request, Response } from "express";
import { LlmService } from "./llm.service.js";

export class SessionService {
  private llmService = new LlmService();

  async createSession(userId: string, topic: string) {
    return prisma.quizSession.create({
      data: {
        userId,
        topic,
        status: "CREATED",
        currentDifficulty: "MEDIUM",
      }
    });
  }

  async listSessions(userId: string) {
    return prisma.quizSession.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  async getSession(userId: string, sessionId: string) {
    return prisma.quizSession.findUnique({
      where: { id: sessionId, userId },
      include: {
        rounds: {
          include: {
            questions: true
          }
        }
      }
    });
  }

  async createRound(userId: string, sessionId: string, data: CreateRoundBody) {
    const session = await prisma.quizSession.findUnique({
      where: { id: sessionId, userId },
      include: { rounds: true }
    });

    if (!session) throw new Error("Session not found");

    const difficulty = data.difficulty || session.currentDifficulty;
    const roundIndex = session.rounds.length + 1;

    const round = await prisma.quizRound.create({
      data: {
        sessionId,
        roundIndex,
        requestedCount: data.count,
        requestedDifficulty: difficulty,
        status: "GENERATING"
      }
    });

    return round;
  }

  async streamRound(userId: string, sessionId: string, req: Request, res: Response) {
    const session = await prisma.quizSession.findUnique({
      where: { id: sessionId, userId },
      include: { rounds: { orderBy: { roundIndex: 'desc' }, take: 1 } }
    });

    if (!session || session.rounds.length === 0) {
      res.status(404).json({ error: "Session or round not found" });
      return;
    }

    const round = session.rounds[0];

    // Setup SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    let eventId = 1;
    const sendEvent = (event: SseEvent) => {
      res.write(serializeSseEvent(event));
    };

    // Send quiz started
    sendEvent({
      event: "quiz_started",
      eventId: eventId++,
      sessionId,
      roundId: round.id,
      payload: {
        topic: session.topic,
        difficulty: round.requestedDifficulty,
        questionCount: round.requestedCount
      }
    });

    if (round.status !== "GENERATING") {
      // Maybe resend existing questions if reconnecting
      // For MVP just end stream if already generated
      res.end();
      return;
    }

    try {
      let orderIndex = 0;
      
      const onQuestion = async (qData: any) => {
        // Save to DB
        const savedQ = await prisma.question.create({
          data: {
            roundId: round.id,
            orderIndex,
            questionText: qData.questionText,
            options: qData.options,
            correctOption: qData.correctOption,
            explanation: qData.explanation,
            subtopic: qData.subtopic,
            difficultyAssigned: round.requestedDifficulty,
            generationModel: "llama-3.1",
            promptVersion: "v1"
          }
        });

        // Send to client
        sendEvent({
          event: "question",
          eventId: eventId++,
          sessionId,
          roundId: round.id,
          payload: {
            id: savedQ.id,
            orderIndex: savedQ.orderIndex,
            questionText: savedQ.questionText,
            options: savedQ.options as any,
            difficulty: savedQ.difficultyAssigned
          }
        });

        orderIndex++;
      };

      // Call LLM
      await this.llmService.generateQuestionsStream(
        session.topic,
        round.requestedDifficulty,
        round.requestedCount,
        onQuestion
      );

      // Finish round
      await prisma.quizRound.update({
        where: { id: round.id },
        data: { status: "IN_PROGRESS", generatedCount: orderIndex }
      });

      sendEvent({
        event: "round_done",
        eventId: eventId++,
        sessionId,
        roundId: round.id,
        payload: {
          generatedCount: orderIndex,
          requestedCount: round.requestedCount,
          recommendedDifficulty: round.requestedDifficulty // For MVP
        }
      });

      res.end();

    } catch (err: any) {
      sendEvent({
        event: "error",
        eventId: eventId++,
        sessionId,
        roundId: round.id,
        payload: {
          code: "LLM_ERROR",
          message: err.message || "Error generating questions"
        }
      });
      await prisma.quizRound.update({
        where: { id: round.id },
        data: { status: "FAILED" }
      });
      res.end();
    }
  }

  async attemptQuestion(userId: string, sessionId: string, questionId: string, data: any) {
    // Idempotency check
    const existingAttempt = await prisma.questionAttempt.findUnique({
      where: { attemptId: data.attemptId }
    });

    if (existingAttempt) {
      return existingAttempt; // Already processed
    }

    const question = await prisma.question.findUnique({
      where: { id: questionId }
    });

    if (!question) throw new Error("Question not found");

    const isCorrect = question.correctOption === data.selectedOption;
    const scoreDelta = isCorrect ? 1 : -1;

    // Transaction for score and attempt
    const result = await prisma.$transaction(async (tx) => {
      const attempt = await tx.questionAttempt.create({
        data: {
          userId,
          questionId,
          attemptId: data.attemptId,
          selectedOption: data.selectedOption,
          isCorrect,
          responseTimeSec: data.responseTimeSec,
          scoreDelta
        }
      });

      await tx.user.update({
        where: { id: userId },
        data: { globalScore: { increment: scoreDelta } }
      });

      return attempt;
    });

    return {
      attempt: result,
      feedback: {
        isCorrect,
        correctOption: question.correctOption,
        explanation: question.explanation
      }
    };
  }
}
