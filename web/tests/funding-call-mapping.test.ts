import { describe, expect, it } from "vitest";
import {
  toFundingCallBody,
  type FundingOpportunityFormValues,
} from "@/features/opportunities/components/funding-opportunity-form";

function values(overrides: Partial<FundingOpportunityFormValues> = {}): FundingOpportunityFormValues {
  return {
    title: "  Funding title  ",
    summary: "  summary  ",
    description: "  description  ",
    eligibility: "  eligible  ",
    fundingBody: "  funder  ",
    fundingLevel: "national",
    funderType: "foundation",
    sourceUrl: "  https://example.org  ",
    amountMin: "0",
    amountMax: "1000.50",
    ngoEligible: false,
    status: "OPEN",
    recurringCall: true,
    themes: ["Culture"],
    targetGroups: ["Young people"],
    fundingRounds: [],
    ...overrides,
  };
}

describe("toFundingCallBody", () => {
  it("normalizes the form and builds the complete API payload", () => {
    expect(toFundingCallBody(values())).toEqual({
      title: "Funding title",
      summary: "summary",
      description: "description",
      eligibility: "eligible",
      fundingBody: "funder",
      sourceUrl: "https://example.org",
      level: "national",
      funderType: "foundation",
      status: "open",
      recurring: true,
      ngoEligible: false,
      budgetMin: 0,
      budgetMax: 1000.5,
      rounds: [],
      themes: ["Culture"],
      targetGroups: ["Young people"],
    });
  });

  it("sends explicit cleared values rather than omitting edited fields", () => {
    expect(toFundingCallBody(values({
      title: "  ", summary: "", eligibility: " ", fundingBody: "",
      sourceUrl: "  ", fundingLevel: "", funderType: "",
      amountMin: "", amountMax: "", themes: [], targetGroups: [],
      status: "CLOSED", recurringCall: false, ngoEligible: true,
    }))).toMatchObject({
      title: "", summary: "", eligibility: "", fundingBody: "",
      sourceUrl: null, level: null, funderType: null,
      budgetMin: null, budgetMax: null, themes: [], targetGroups: [],
      status: "closed", recurring: false, ngoEligible: true,
    });
  });

  it("omits empty rounds and preserves partially completed dates with nulls", () => {
    const round = { id: "1", title: "Round", openDate: "", deadline: "", decisionDate: "", expectedNextOpenDate: "" };
    const body = toFundingCallBody(values({
      fundingRounds: [round, { ...round, id: "2", deadline: "2027-02-01" }],
    }));
    expect(body.rounds).toEqual([{
      openDate: null,
      deadlineDate: "2027-02-01",
      decisionDate: null,
      expectedNextOpenDate: null,
    }]);
  });
});
