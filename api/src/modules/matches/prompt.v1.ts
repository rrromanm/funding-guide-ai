export const PROMPT_VERSION = "v1";

export function buildPrompt(
  callText: string,
  profileText: string,
  today: string,
) {
  return `You are a funding advisor. Assess whether one funding call fits one organisation, Pangaea Youth Network (PYN). Work only from the call text and the profile below; use no outside knowledge about the funder.

Today's date: ${today}

## Organisation profile
${profileText}

## Funding call (often in Danish)
<call>
${callText}
</call>

## Step 1: eligibility. Do this first.
List every requirement in the call text about WHO may apply (often under "Hvem kan søge?", "Ansøger skal", "Puljen er for"), plus any hard condition a project must meet. For each:
- requirement: the requirement, stated briefly in English.
- evidence: an exact quote from the call text that states it, copied character for character in the original language. No translation, no paraphrase, no "...". Keep it short: one sentence or phrase.
- pyn_meets: "yes", "no" or "unclear", decided by these rules:
  - "no" ONLY when the requirement is about what kind of applicant may apply, and the profile shows PYN is a different kind. That covers: applicant type (e.g. only municipalities, schools, publishers, individual artists, professional groups, political parties, licence holders), legal form, where the applicant is based, the organisation's age, or something it must own or hold that the profile says it does not have.
  - "yes" when the profile shows PYN meets it. Compare numbers with the profile directly: an organisation that is 3 years old meets "at least 2 years".
  - "unclear" for everything else, in particular:
    - conditions PYN could meet by how it designs or runs a project: where the activity takes place, partners, venue agreements, documentation, co-financing, budgets, reporting;
    - requirements the profile simply says nothing about.
  - Never answer "no" because the call's purpose or theme does not match PYN's themes. That is not eligibility; it belongs in theme_match below.
- reason: one English sentence explaining pyn_meets.
If the call states no requirements, return an empty list.

## Step 2: criteria. Only after step 1.
Rate each criterion 0-4: 0 = no fit, 1 = poor, 2 = partial or not stated, 3 = good, 4 = excellent. Rate each on its own merits; eligibility is handled separately, so do not lower a rating because of it.
- theme_match: how well the call's purpose matches PYN's themes.
- target_group: how well the people the call wants to reach match PYN's target groups.
- maturity_fit: whether the call suits an organisation of PYN's age, size and track record (4 = suitable for a newer NGO, 2 = asks for evidence of earlier projects, 0 = needs an experienced lead coordinator).
- project_scale: whether the minimum and maximum grant, the co-financing share and the project duration suit PYN's capacity.
- partner_burden: how few partners the call requires: a minimum number of organisations or countries, a municipality partner, an education partner (4 = none required, 0 = a large consortium).
- complexity: how light the administrative burden of applying and reporting is: application length, required documentation, budgets, reporting and audits (4 = low, 2 = medium, 0 = high).
- deadline_readiness: whether PYN can realistically apply in time as of today, given its capacity to prepare (4 = open with ample time or rolling, 0 = closed or deadline passed).
For each give:
- rating;
- evidence: an exact quote from the call text, in the original language, under the same rules as above. Use null only if the call text says nothing relevant to this criterion, and then the rating MUST be 2;
- reason: one English sentence.

## Step 3: key points. Only after steps 1 and 2.
Write 2 to 4 key points: the most important reasons behind your answers above, most important first, for a busy reader deciding whether PYN should apply. For each:
- kind: "blocker" for an eligibility requirement you answered "no"; "barrier" for something that counts against applying (a low rating, or an "unclear" requirement PYN must check); "strength" for something that counts in favour (a high rating); "info" for something neutral but worth knowing.
- about: the criterion it comes from, or "eligibility".
- text: one short English sentence, specific to this call. Do not mention scores, ratings, points or fit labels.
If any eligibility answer is "no", the first key point must be that blocker, and list no strengths.

Return only JSON matching the response schema.`;
}
