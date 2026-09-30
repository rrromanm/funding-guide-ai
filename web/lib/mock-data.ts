import type { FundingCall, Notification, OrgProfile, Tag } from "./types";

const buildTag = (id: string, value: string, type: Tag["type"]): Tag => ({
  id,
  value,
  type,
});

export const orgProfile: OrgProfile = {
  id: "pyn-org",
  name: "Pangaea Youth Network",
  legalStatus: "Non-profit youth organisation",
  city: "Horsens",
  country: "Denmark",
  staffCount: 18,
  administrativeCapacity: "Strong project coordination and civic engagement capacity",
  themes: [
    buildTag("theme-youth", "Youth engagement", "Theme"),
    buildTag("theme-participation", "Participation", "Theme"),
    buildTag("theme-climate", "Climate and green transition", "Theme"),
  ],
  targetGroups: [
    buildTag("tg-youth", "Young people", "TargetGroup"),
    buildTag("tg-ngos", "Youth NGOs", "TargetGroup"),
    buildTag("tg-local", "Local communities", "TargetGroup"),
  ],
};

export const fundingCalls: FundingCall[] = [
  {
    id: "european-solidarity-corps",
    title: "European Solidarity Corps – Youth Initiatives",
    summary:
      "Support for youth-led solidarity projects focused on participation, inclusion, and community impact.",
    description:
      "This call supports projects led by civil society organisations that engage young people in volunteering, local collaboration, and community-based innovation. Funding can cover project implementation, volunteer mobility, and partner activities.",
    fundingBody: "European Commission",
    fundingLevel: "EU",
    funderType: "European programme",
    amountMin: 100000,
    amountMax: 600000,
    eligibility:
      "Applicants must be youth organisations or public bodies legally established in an eligible country. Projects should include youth participation and demonstrate social impact.",
    ngoEligible: true,
    status: "OPEN",
    recurringCall: false,
    sourceUrl: "https://ec.europa.eu",
    source: {
      id: "source-ec",
      name: "European Commission",
      type: "European institution",
      url: "https://ec.europa.eu",
    },
    themes: [
      buildTag("theme-civic", "Civic engagement", "Theme"),
      buildTag("theme-youth", "Youth", "Theme"),
    ],
    targetGroups: [
      buildTag("tg-youth", "Young people", "TargetGroup"),
      buildTag("tg-ngos", "Youth NGOs", "TargetGroup"),
    ],
    relevantRegions: ["EU", "Denmark"],
    fundingRounds: [
      {
        id: "esc-round-1",
        title: "Main deadline",
        openDate: "2026-01-15",
        deadline: "2026-11-30",
      },
    ],
    matchResult: {
      id: "match-esc",
      overallScore: 92,
      reviewStatus: "GENERATED",
      fitLabel: "Strong fit",
      explanation:
        "This opportunity aligns closely with PYN's youth engagement and community participation work, and it supports organisational capacity building and local partnerships.",
      reasons: [
        {
          id: "reason-1",
          title: "Youth-centered mission",
          description: "The call is explicitly designed for youth-led and youth-participatory programmes.",
        },
        {
          id: "reason-2",
          title: "Strong NGO alignment",
          description: "The funding body supports non-profit organisations and local project delivery models similar to PYN's work.",
        },
      ],
    },
  },
  {
    id: "erasmus-youth-exchanges",
    title: "Erasmus+ Youth Exchanges",
    summary:
      "Mobility and intercultural exchange projects for young people and youth organisations.",
    description:
      "Funding supports structured youth exchanges, partnerships, and local engagement activities rooted in learning mobility and intercultural learning.",
    fundingBody: "European Education and Culture Executive Agency",
    fundingLevel: "EU",
    funderType: "EU mobility programme",
    amountMin: 20000,
    amountMax: 150000,
    eligibility:
      "Eligible organisations must be non-profit and run youth work or education-related activities across partner countries.",
    ngoEligible: true,
    status: "OPEN",
    recurringCall: true,
    expectedReopeningDate: "2027-03-01",
    sourceUrl: "https://erasmus-plus.ec.europa.eu",
    source: {
      id: "source-erasmus",
      name: "Erasmus+",
      type: "EU Programme",
      url: "https://erasmus-plus.ec.europa.eu",
    },
    themes: [
      buildTag("theme-mobility", "Mobility", "Theme"),
      buildTag("theme-inclusion", "Inclusion", "Theme"),
    ],
    targetGroups: [
      buildTag("tg-youth", "Young people", "TargetGroup"),
      buildTag("tg-pupils", "Participants in youth exchange", "TargetGroup"),
    ],
    relevantRegions: ["EU", "Nordics"],
    fundingRounds: [
      {
        id: "erasmus-round-1",
        title: "Application round",
        deadline: "2026-02-24",
      },
      {
        id: "erasmus-round-2",
        title: "Second round",
        openDate: "2026-09-01",
        deadline: "2026-11-15",
      },
    ],
    matchResult: {
      id: "match-erasmus",
      overallScore: 88,
      reviewStatus: "GENERATED",
      fitLabel: "Good fit",
      explanation:
        "The programme aligns with PYN's social and youth participation approach, especially for cross-border learning and civic engagement.",
      reasons: [
        {
          id: "reason-3",
          title: "Participation focus",
          description: "It supports young people working together across countries and communities.",
        },
        {
          id: "reason-4",
          title: "Youth organisation fit",
          description: "This is a strong match with a youth NGO structure and local delivery model.",
        },
      ],
    },
  },
  {
    id: "danish-youth-initiatives",
    title: "Danish Youth Initiatives Fund",
    summary:
      "Local support for youth and community projects with a focus on engagement and inclusion.",
    description:
      "This Danish funding stream supports youth-focused projects that strengthen community belonging, local participation, and cross-sector partnerships.",
    fundingBody: "Danish Ministry of Culture",
    fundingLevel: "National",
    funderType: "Public fund",
    amountMin: 50000,
    amountMax: 250000,
    eligibility:
      "Non-profit organisations with a youth or community focus can apply. Projects should have clear social value and planned local outcomes.",
    ngoEligible: true,
    status: "UPCOMING",
    recurringCall: false,
    sourceUrl: "https://kum.dk",
    source: {
      id: "source-danish",
      name: "Danish Ministry of Culture",
      type: "National fund",
      url: "https://kum.dk",
    },
    themes: [
      buildTag("theme-community", "Community building", "Theme"),
      buildTag("theme-youth", "Youth", "Theme"),
    ],
    targetGroups: [
      buildTag("tg-youth", "Young people", "TargetGroup"),
      buildTag("tg-local", "Local communities", "TargetGroup"),
    ],
    relevantRegions: ["Denmark"],
    fundingRounds: [
      {
        id: "danish-round-1",
        title: "Call announcement",
        openDate: "2026-09-15",
        deadline: "2026-10-31",
      },
    ],
    matchResult: {
      id: "match-danish",
      overallScore: 81,
      reviewStatus: "GENERATED",
      fitLabel: "Good fit",
      explanation:
        "This funding line supports youth and community engagement and is aligned with PYN's expertise in local civic participation.",
      reasons: [
        {
          id: "reason-5",
          title: "Local relevance",
          description: "The programme targets youth participation and local programme delivery in Denmark.",
        },
      ],
    },
  },
  {
    id: "green-transition-grant",
    title: "Green Transition Community Grants",
    summary:
      "Support for community-driven projects that connect youth, local action, and environmental sustainability.",
    description:
      "The fund supports youth-led or community-anchored sustainability projects that create local solutions, raise awareness, and build participation around environmental action.",
    fundingBody: "Regional Green Fund",
    fundingLevel: "Regional",
    funderType: "Regional grant",
    amountMin: 20000,
    amountMax: 100000,
    eligibility:
      "Applicants can be NGOs or civil society groups with a public-interest remit and a local sustainability agenda.",
    ngoEligible: true,
    status: "CLOSED",
    recurringCall: true,
    expectedReopeningDate: "2027-09-15",
    sourceUrl: "https://example.org/green-transition",
    source: {
      id: "source-green",
      name: "Regional Green Fund",
      type: "Regional grant",
      url: "https://example.org/green-transition",
    },
    themes: [
      buildTag("theme-climate", "Climate and green transition", "Theme"),
      buildTag("theme-community", "Community building", "Theme"),
    ],
    targetGroups: [
      buildTag("tg-local", "Local communities", "TargetGroup"),
      buildTag("tg-youth", "Young people", "TargetGroup"),
    ],
    relevantRegions: ["Jutland"],
    fundingRounds: [
      {
        id: "green-round-1",
        title: "Closed round",
        openDate: "2025-03-01",
        deadline: "2025-05-30",
        expectedNextOpenDate: "2027-09-15",
      },
    ],
    matchResult: {
      id: "match-green",
      overallScore: 76,
      reviewStatus: "GENERATED",
      fitLabel: "Possible fit",
      explanation:
        "This opportunity is relevant to environmental and civic engagement themes, but the timing and project design may need adjustment.",
      reasons: [
        {
          id: "reason-6",
          title: "Climate relevance",
          description: "The focus on environmental and community action overlaps with some PYN work.",
        },
      ],
    },
  },
];

export const notifications: Notification[] = [
  {
    id: "n-1",
    fundingCallId: "erasmus-youth-exchanges",
    title: "New relevant funding opportunity found",
    message: "Erasmus+ Youth Exchanges has a strong match with the PYN profile.",
    createdAt: "2026-09-27T09:40:00.000Z",
    read: false,
  },
  {
    id: "n-2",
    fundingCallId: "european-solidarity-corps",
    title: "New relevant funding opportunity found",
    message: "European Solidarity Corps – Youth Initiatives matches PYN's youth engagement mission.",
    createdAt: "2026-09-26T16:20:00.000Z",
    read: true,
  },
];
