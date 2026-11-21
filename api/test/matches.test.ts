import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { ZodError } from "zod";
import { NotFoundError } from "../src/errors.ts";
import { db } from "../src/lib/db.ts";
import type { LlmProvider } from "../src/lib/llm.ts";
import { WEIGHTS } from "../src/modules/matches/matches.config.ts";
import {
  judgeOutput,
  type JudgeOutput,
} from "../src/modules/matches/matches.schema.ts";
import {
  aggregate,
  confidenceFor,
  groundCheck,
  isGrounded,
  keyPointsFor,
  labelFor,
} from "../src/modules/matches/matches.scoring.ts";
import {
  findCallsToScore,
  inputHash,
  judgeCall,
  loadCalls,
  loadProfileText,
  saveResult,
  scoreCall,
} from "../src/modules/matches/matches.service.ts";
import { findProfile } from "../src/modules/profile/profile.service.ts";
import {
  describeDb,
  insertCall,
  modelOutput,
  saveScore,
  scoredResult,
} from "./helpers.ts";

const musikerpuljen: {
  text: string;
  missingData: string[];
  modelOutput: unknown;
} = JSON.parse(
  readFileSync(
    new URL("./fixtures/musikerpuljen.json", import.meta.url),
    "utf8",
  ),
);

const CALL_TEXT =
  "Hvem kan søge?\nAnsøger skal være en ‘forening’ – med CVR-nummer. Projektet skal foregå i Danmark.";

function fakeModel(output: unknown = modelOutput(3)): LlmProvider {
  return { model: "fake-model", generateJson: vi.fn(async () => output) };
}

function score(
  output: JudgeOutput,
  text = CALL_TEXT,
  missingData: string[] = [],
) {
  return aggregate(groundCheck(output, text), missingData);
}

const requirement = (
  evidence: string,
  pyn_meets: "yes" | "no" | "unclear",
) => ({
  requirement: "Applicant must be an association",
  evidence,
  pyn_meets,
  reason: "Because.",
});

describe("weights and thresholds", () => {
  it("weights sum to 100", () => {
    const total = Object.values(WEIGHTS).reduce((sum, w) => sum + w, 0);

    expect(total).toBe(100);
  });

  it.each([
    [100, "strong_fit"],
    [75, "strong_fit"],
    [74, "possible_fit"],
    [50, "possible_fit"],
    [49, "weak_fit"],
    [25, "weak_fit"],
    [24, "not_recommended"],
    [0, "not_recommended"],
  ])("labels %i as %s", (value, label) => {
    expect(labelFor(value)).toBe(label);
  });

  it.each([
    [0, "high"],
    [1, "medium"],
    [2, "medium"],
    [3, "low"],
    [9, "low"],
  ])("rates %i issues as %s confidence", (issues, confidence) => {
    expect(confidenceFor(issues)).toBe(confidence);
  });
});

describe("grounding", () => {
  it("finds a quote despite case, spacing, curly quotes, dashes and a trailing ellipsis", () => {
    expect(
      isGrounded(
        "\"ansøger skal være en 'forening' - med  CVR-nummer…\"",
        CALL_TEXT,
      ),
    ).toBe(true);
  });

  it.each([
    ["a paraphrase", "Kun foreninger kan søge"],
    ["an empty quote", ""],
    ["punctuation only", '"..."'],
  ])("rejects %s", (_case, quote) => {
    expect(isGrounded(quote, CALL_TEXT)).toBe(false);
  });

  it("scores each criterion as rating / 4 * weight", () => {
    const { criteria, droppedCriteria } = groundCheck(
      modelOutput(2),
      CALL_TEXT,
    );

    expect(droppedCriteria).toEqual([]);
    expect(criteria.map((c) => [c.key, c.points])).toEqual(
      Object.entries(WEIGHTS).map(([key, weight]) => [key, weight / 2]),
    );
  });

  it("keeps a criterion the call is silent on, and drops one with an invented quote", () => {
    const output = modelOutput(4);
    output.criteria.theme_match.evidence = "Puljen støtter unge";
    output.criteria.target_group.evidence = "Projektet skal foregå i Danmark";

    const { criteria, droppedCriteria } = groundCheck(output, CALL_TEXT);

    expect(criteria.map((c) => c.key)).not.toContain("theme_match");
    expect(criteria.find((c) => c.key === "target_group")?.points).toBe(20);
    expect(criteria.find((c) => c.key === "complexity")?.evidence).toBeNull();
    expect(droppedCriteria).toEqual([
      expect.objectContaining({
        key: "theme_match",
        points: 0,
        dropReason: "evidence quote not found in call text",
      }),
    ]);
  });

  it("demotes a 'no' backed by an invented quote to 'unclear'", () => {
    const { eligibility } = groundCheck(
      modelOutput(3, {
        eligibility: [
          requirement("Ansøger skal være en ‘forening’", "no"),
          requirement("Kun kommuner kan søge", "no"),
          requirement("Kun kommuner kan søge", "yes"),
        ],
      }),
      CALL_TEXT,
    );

    expect(eligibility.map((e) => [e.pynMeets, e.grounded])).toEqual([
      ["no", true],
      ["unclear", false],
      ["yes", false],
    ]);
  });
});

describe("aggregate", () => {
  it("sums the points into a rounded score and its label", () => {
    const output = modelOutput(0);
    output.criteria.theme_match.rating = 1;

    expect(score(modelOutput(3))).toMatchObject({
      score: 75,
      fitLabel: "strong_fit",
      confidence: "high",
      blockingReason: null,
      warnings: [],
    });
    expect(score(output).score).toBe(6);
  });

  it("scores 0 when PYN fails an eligibility requirement, whatever the criteria say", () => {
    const result = score(
      modelOutput(4, {
        eligibility: [requirement("Projektet skal foregå i Danmark", "no")],
      }),
    );

    expect(result).toMatchObject({
      score: 0,
      fitLabel: "not_recommended",
      blockingReason:
        'Applicant must be an association ("Projektet skal foregå i Danmark"). Because.',
    });
    expect(result.criteria).toHaveLength(7);
  });

  it("counts unclear requirements, dropped criteria and missing data against confidence", () => {
    const output = modelOutput(3, {
      eligibility: [requirement("Projektet skal foregå i Danmark", "unclear")],
    });

    expect(score(output, CALL_TEXT, ["budget"])).toMatchObject({
      confidence: "medium",
      warnings: [
        "Unclear whether PYN meets: Applicant must be an association. Because.",
        "Call data missing: budget",
      ],
    });

    output.criteria.complexity.evidence = "Invented";
    expect(score(output, CALL_TEXT, ["budget"]).confidence).toBe("low");
  });

  it("warns about an eligibility quote it could not find", () => {
    const result = score(
      modelOutput(3, { eligibility: [requirement("Invented", "yes")] }),
    );

    expect(result.warnings).toEqual([
      'Eligibility quote not found in call text: "Invented"',
    ]);
  });
});

describe("keyPointsFor", () => {
  const point = (
    kind: JudgeOutput["key_points"][number]["kind"],
    about: JudgeOutput["key_points"][number]["about"] = "theme_match",
  ) => ({ kind, about, text: `${kind} about ${about}` });

  it("drops points about criteria that failed grounding", () => {
    expect(
      keyPointsFor(
        [point("strength", "theme_match"), point("info", "complexity")],
        ["theme_match"],
        [],
      ),
    ).toEqual([point("info", "complexity")]);
  });

  it("puts the blocker first and lists no strengths when PYN is ruled out", () => {
    const points = keyPointsFor(
      [point("strength"), point("barrier")],
      [],
      [{ reason: "PYN is not a school." }],
    );

    expect(points).toEqual([
      { kind: "blocker", about: "eligibility", text: "PYN is not a school." },
      point("barrier"),
    ]);
  });

  it("demotes the model's blocker to a barrier when nothing blocks", () => {
    expect(keyPointsFor([point("blocker", "eligibility")], [], [])).toEqual([
      { ...point("blocker", "eligibility"), kind: "barrier" },
    ]);
  });

  it("keeps at most four", () => {
    expect(keyPointsFor(Array(6).fill(point("info")), [], [])).toHaveLength(4);
  });
});

describe("Musikerpuljen fixture", () => {
  const output = judgeOutput.parse(musikerpuljen.modelOutput);

  it("rules PYN out as not a professional music group, with the quote as the reason", () => {
    const result = score(output, musikerpuljen.text, musikerpuljen.missingData);

    expect(result.score).toBe(0);
    expect(result.fitLabel).toBe("not_recommended");
    expect(result.blockingReason).toContain(
      "Professionelle musikgrupper – herunder orkestre, bands, kor og ensembler",
    );
    expect(result.eligibility[0].grounded).toBe(true);
    expect(result.keyPoints[0].kind).toBe("blocker");
    expect(result.keyPoints.map((p) => p.kind)).not.toContain("strength");
  });

  it("stays at 0 even when every criterion is rated excellent", () => {
    const excellent = structuredClone(output);
    for (const criterion of Object.values(excellent.criteria))
      criterion.rating = 4;

    expect(score(excellent, musikerpuljen.text).score).toBe(0);
  });
});

describe("judgeCall", () => {
  const call = { id: 1, title: "Test", text: CALL_TEXT, missingData: [] };

  it("asks the model with the call, the profile and today's date, then scores in code", async () => {
    const provider = fakeModel();

    const { raw, result } = await judgeCall(
      call,
      "Name: PYN",
      provider,
      "2026-11-21",
    );

    const [prompt, schema] = vi.mocked(provider.generateJson).mock.calls[0];
    expect(prompt).toContain("Today's date: 2026-11-21");
    expect(prompt).toContain("Name: PYN");
    expect(prompt).toContain(`<call>\n${CALL_TEXT}\n</call>`);
    expect(schema).not.toHaveProperty("$schema");
    expect(schema).toMatchObject({
      required: ["eligibility", "criteria", "key_points"],
    });
    expect(raw).toEqual(modelOutput(3));
    expect(result.score).toBe(75);
  });

  it.each([
    [
      "a rating above 4",
      { ...modelOutput(3), criteria: modelOutput(5).criteria },
    ],
    [
      "a key point about an unknown criterion",
      modelOutput(3, {
        key_points: [
          { kind: "info", about: "budget" as "complexity", text: "x" },
        ],
      }),
    ],
    ["a missing criterion", { ...modelOutput(3), criteria: {} }],
  ])("rejects a reply with %s", async (_case, reply) => {
    await expect(judgeCall(call, "", fakeModel(reply))).rejects.toBeInstanceOf(
      ZodError,
    );
  });
});

describe("inputHash", () => {
  it("changes with the call text and the model, and only then", () => {
    const hash = inputHash("text", "model");

    expect(inputHash("text", "model")).toBe(hash);
    expect(inputHash("text!", "model")).not.toBe(hash);
    expect(inputHash("text", "other-model")).not.toBe(hash);
  });
});

describeDb("loadProfileText (database)", () => {
  it("describes PYN from org_profile and its tags", async () => {
    const [text, profile] = await Promise.all([
      loadProfileText(),
      findProfile(),
    ]);

    expect(text).toContain(`Name: ${profile.name}`);
    expect(text).toContain(`Legal status: ${profile.legalStatus}`);
    expect(text).toContain(`Location: ${profile.city}, ${profile.country}`);
    expect(text).toMatch(/^Paid staff: \d+$/m);
    expect(text).toMatch(/^Themes: .+$/m);
    expect(text).toMatch(/^Target groups: .+$/m);
  });
});

describeDb("loadCalls (database)", () => {
  it("flags the data a thin call is missing", async () => {
    const id = await insertCall({ description: "Short." });

    const [call] = await loadCalls(id);

    expect(call.missingData).toEqual(["description", "deadline", "budget"]);
    expect(call.text).toContain("Budget: not stated");
    expect(call.text).toContain("Rounds:\nnone listed");
  });

  it("writes a complete call's rounds and budget into the text", async () => {
    const id = await insertCall({
      description: "Lang beskrivelse. ".repeat(40),
      budget_max: 50000,
    });
    await db
      .insertInto("funding_round")
      .values({ call_id: id, round_no: 1, deadline_date: "2099-01-01" })
      .execute();

    const [call] = await loadCalls(id);

    expect(call.missingData).toEqual([]);
    expect(call.text).toContain("Budget: ?-50000 DKK");
    expect(call.text).toContain(
      "- round 1: opens ?, deadline 2099-01-01, decision ?",
    );
  });

  it("does not expect a deadline from a recurring call", async () => {
    const id = await insertCall({ recurring: true });

    const [call] = await loadCalls(id);

    expect(call.missingData).not.toContain("deadline");
  });

  it("skips deleted calls", async () => {
    const id = await insertCall({ deleted_at: new Date() });

    expect(await loadCalls(id)).toEqual([]);
  });
});

describeDb("findCallsToScore (database)", () => {
  it("skips a call already scored from the same text by the same model", async () => {
    const id = await insertCall();
    const [call] = await loadCalls(id);
    await saveResult(call, "test-model", {}, scoredResult(60));

    const ids = async (model: string, callId?: number) =>
      (await findCallsToScore(model, callId)).map((c) => c.id);

    expect(await ids("test-model")).not.toContain(id);
    expect(await ids("another-model")).toContain(id);
    expect(await ids("test-model", id)).toEqual([id]);
  });
});

describeDb("saveResult (database)", () => {
  it("reports a call's first score as new, and a re-score as not", async () => {
    const id = await insertCall();

    expect([await saveScore(id, 82), await saveScore(id, 82)]).toEqual([
      true,
      false,
    ]);
  });

  it("stores the key points as reasons, replacing them on a re-score", async () => {
    const id = await insertCall();
    const reasons = () =>
      db
        .selectFrom("match_reason")
        .innerJoin("match_result", "match_result.id", "match_reason.match_id")
        .select(["kind", "label", "message"])
        .where("match_result.call_id", "=", id)
        .orderBy("match_reason.id")
        .execute();

    await saveScore(id, 80, {
      keyPoints: [
        { kind: "strength", about: "theme_match", text: "Youth culture." },
        { kind: "barrier", about: "complexity", text: "Long form." },
      ],
    });
    const first = await reasons();
    await saveScore(id, 80, {
      keyPoints: [{ kind: "info", about: "eligibility", text: "Open to all." }],
    });

    expect(first).toEqual([
      { kind: "strength", label: "theme_match", message: "Youth culture." },
      { kind: "barrier", label: "complexity", message: "Long form." },
    ]);
    expect(await reasons()).toEqual([
      { kind: "info", label: "eligibility", message: "Open to all." },
    ]);
  });

  it("keeps the admin's review through a re-score", async () => {
    const id = await insertCall();
    await saveScore(id, 80);
    await db
      .updateTable("match_result")
      .set({ review_status: "overridden", manual_score: 10, admin_note: "No" })
      .where("call_id", "=", id)
      .execute();

    await saveScore(id, 60);
    const row = await db
      .selectFrom("match_result")
      .select(["score", "review_status", "manual_score", "admin_note"])
      .where("call_id", "=", id)
      .executeTakeFirstOrThrow();

    expect(row).toEqual({
      score: 60,
      review_status: "overridden",
      manual_score: 10,
      admin_note: "No",
    });
  });
});

describeDb("scoreCall (database)", () => {
  it("judges one call with the model and stores the result", async () => {
    const id = await insertCall({ description: CALL_TEXT });
    const provider = fakeModel();

    await scoreCall(id, provider);
    const row = await db
      .selectFrom("match_result")
      .select(["score", "fit_label", "model", "prompt_version", "raw_response"])
      .where("call_id", "=", id)
      .executeTakeFirstOrThrow();

    expect(vi.mocked(provider.generateJson).mock.calls[0][0]).toContain(
      CALL_TEXT,
    );
    expect(row).toEqual({
      score: 75,
      fit_label: "strong_fit",
      model: "fake-model",
      prompt_version: "v1",
      raw_response: modelOutput(3),
    });
  });

  it("404s on a deleted call without asking the model", async () => {
    const id = await insertCall({ deleted_at: new Date() });
    const provider = fakeModel();

    await expect(scoreCall(id, provider)).rejects.toBeInstanceOf(NotFoundError);
    expect(provider.generateJson).not.toHaveBeenCalled();
  });
});
