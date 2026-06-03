import prisma from "@repo/db";
import { Request, Response } from "express";
import fs from "fs/promises";
import path from "path";

async function readLocalQuestions(): Promise<any[] | null> {
  const candidates = [
    path.resolve(process.cwd(), "packages/questions-set/questions.json"),
    path.resolve(process.cwd(), "../packages/questions-set/questions.json"),
    path.resolve(__dirname, "../../../packages/questions-set/questions.json"),
  ];

  for (const p of candidates) {
    try {
      const raw = await fs.readFile(p, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
      // sometimes file may contain JSON with surrounding brackets/objects
      return parsed.questions ?? parsed;
    } catch (e) {
      // try next path
    }
  }

  return null;
}

export const setQuestions = async (req: Request, res: Response) => {
  try {
    let questions: any[] = [];

    try {
      const randomQuestions = await prisma.$queryRaw<any[]>`
        SELECT * FROM "Question" ORDER BY RANDOM() LIMIT 5`;
      questions = (randomQuestions || []).map((q: any) => ({
        ...q,
        testcases: q.testcases ?? [],
      }));
      console.log("setQuestions: fetched from DB, count=", questions.length);
    } catch (dbErr) {
      console.error("setQuestions: DB query failed, falling back to local file:", dbErr?.message ?? dbErr);
    }

    if (questions.length === 0) {
      const local = await readLocalQuestions();
      if (local && local.length > 0) {
        const shuffled = local.sort(() => 0.5 - Math.random()).slice(0, 5);
        questions = shuffled.map((q: any) => ({ ...q, testcases: q.testcases ?? [] }));
        console.log("setQuestions: using local questions.json, count=", questions.length);
      }
    }

    if (!questions || questions.length === 0) {
      console.warn("setQuestions: no questions available to return");
      return res.status(200).json({ status: "success", questions: [] });
    }

    console.log("setQuestions: returning questions, count=", questions.length);

    res.status(200).json({ status: "success", questions });
  } catch (err: any) {
    res.status(500).json({ status: "failed in getting random questions", error: err.message });
  }
};
