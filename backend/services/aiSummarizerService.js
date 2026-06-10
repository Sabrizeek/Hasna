const themeDefinitions = [
  { label: "Lecture clarity", keywords: ["clear", "clearly", "explain", "explained", "understand", "concept", "approachable"] },
  { label: "Examples and applications", keywords: ["example", "examples", "application", "applications", "real-world", "real world", "connect"] },
  { label: "Lecture materials", keywords: ["lecture slides", "slides", "materials", "handouts", "diagrams"] },
  { label: "Subject knowledge", keywords: ["strong subject knowledge", "subject knowledge", "knowledge"] },
  { label: "Question handling", keywords: ["answers questions", "questions patiently", "patiently", "patient"] },
  { label: "Lecture organization", keywords: ["organized", "well organized", "structured", "sequence"] },
  { label: "Pacing", keywords: ["pace", "fast", "rushed", "slow down"] },
  { label: "Assessment preparation", keywords: ["revision questions", "assessments", "assessment", "exam", "quiz"] },
  { label: "Student engagement", keywords: ["class activities", "activities", "engaged", "participation", "discussion"] },
  { label: "Practical guidance", keywords: ["practical", "lab", "experiment", "demonstration", "demonstrations", "equipment", "safety"] },
];

const strengthDefinitions = [
  { label: "Clear explanations", keywords: ["clear", "clearly", "explained the concepts", "explain", "understand"] },
  { label: "Real-world examples", keywords: ["real-world examples", "real world examples", "connected them with real-world", "connected them with real world"] },
  { label: "Useful lecture slides", keywords: ["lecture slides were useful", "useful lecture slides", "slides were useful"] },
  { label: "Strong subject knowledge", keywords: ["strong subject knowledge", "subject knowledge"] },
  { label: "Patient responses to student questions", keywords: ["answers questions patiently", "patiently answers", "questions patiently"] },
  { label: "Organized lecture flow", keywords: ["lectures were organized", "organized lectures", "well organized"] },
  { label: "Good communication", keywords: ["communicates well", "good communication", "communication is clear"] },
  { label: "Approachable explanations of complex ideas", keywords: ["complex ideas approachable", "ideas approachable", "approachable"] },
  { label: "Clear demonstrations", keywords: ["clear demonstrations", "demonstrations helped", "demonstrated clearly"] },
  { label: "Clear safety instructions", keywords: ["clear safety instructions", "safety instructions"] },
  { label: "Guidance during practical work", keywords: ["guided students", "guidance during", "guided during"] },
  { label: "Practical skill development", keywords: ["develop useful scientific skills", "develop practical skills", "scientific skills"] },
];

const improvementDefinitions = [
  { label: "Slow down during difficult topics", keywords: ["pace was a little fast", "pace was fast", "fast during difficult topics", "slow down during difficult"] },
  { label: "Provide more revision questions before assessments", keywords: ["more revision questions", "revision questions", "before assessments"] },
  { label: "Include more short class activities", keywords: ["more short class activities", "short class activities", "class activities"] },
  { label: "Allow more time for later lecture topics", keywords: ["final part of the lecture can feel rushed", "final part", "little more time", "more time because"] },
  { label: "Allow more time for individual practice", keywords: ["more time for individual practice", "individual practice", "practice opportunities"] },
  { label: "Check equipment and materials earlier", keywords: ["equipment and materials were checked earlier", "checked earlier", "avoid delays"] },
  { label: "Discuss common errors in practical records", keywords: ["common errors", "practical records"] },
  { label: "Add more discussion after practical activities", keywords: ["more time for discussion", "discussion after completing", "after completing the activity"] },
];

const splitSentences = (comments) =>
  comments
    .flatMap((comment) => String(comment || "").split(/(?<=[.!?])\s+/))
    .map((sentence) => sentence.trim())
    .filter(Boolean);

const includesAny = (text, keywords) => {
  const normalized = text.toLowerCase();
  return keywords.some((keyword) => normalized.includes(keyword));
};

const countMatches = (comments, definitions) =>
  definitions
    .map((definition) => {
      let firstIndex = Number.MAX_SAFE_INTEGER;
      const score = comments.reduce((total, comment, index) => {
        const matched = includesAny(comment, definition.keywords);
        if (matched && firstIndex === Number.MAX_SAFE_INTEGER) firstIndex = index;
        return total + (matched ? 1 : 0);
      }, 0);
      return { label: definition.label, score, firstIndex };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.firstIndex - b.firstIndex || a.label.localeCompare(b.label));

const toReadableList = (items) => {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0].toLowerCase();
  if (items.length === 2) return `${items[0].toLowerCase()} and ${items[1].toLowerCase()}`;
  return `${items.slice(0, -1).map((item) => item.toLowerCase()).join(", ")}, and ${items[items.length - 1].toLowerCase()}`;
};

const buildSummaryParagraph = (strengths, improvements, commentCount) => {
  const strengthText = toReadableList(strengths.slice(0, 8));
  const improvementText = toReadableList(improvements.slice(0, 6));

  if (strengthText && improvementText) {
    return `Across ${commentCount} anonymous student comments, the feedback is generally positive. Students appreciated the lecturer's ${strengthText}. The main improvement suggestions are to ${improvementText}.`;
  }

  if (strengthText) {
    return `Across ${commentCount} anonymous student comments, students mainly appreciated the lecturer's ${strengthText}. No strong recurring improvement concern was detected from the available comments.`;
  }

  if (improvementText) {
    return `Across ${commentCount} anonymous student comments, the main feedback focuses on improvement. Students suggest that the lecturer should ${improvementText}.`;
  }

  return `Across ${commentCount} anonymous student comments, the feedback is too general to identify strong recurring strengths or improvement areas.`;
};

const summarizeWithRules = (comments) => {
  const strengths = countMatches(comments, strengthDefinitions).map((item) => item.label).slice(0, 8);
  const improvements = countMatches(comments, improvementDefinitions).map((item) => item.label).slice(0, 6);

  const scoredThemes = themeDefinitions
    .map((theme) => ({
      label: theme.label,
      score: comments.reduce((total, comment) => total + (includesAny(comment, theme.keywords) ? 1 : 0), 0),
    }))
    .filter((theme) => theme.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((theme) => theme.label);

  return {
    summary: buildSummaryParagraph(strengths, improvements, comments.length),
    keyStrengths: strengths.length ? strengths : ["No clearly supported recurring strength was detected from the available comments."],
    improvementAreas: improvements.length ? improvements : ["No major recurring improvement area was detected from the available comments."],
    commonThemes: scoredThemes.length ? scoredThemes : ["General teaching feedback"],
  };
};

const tryClaudeSummary = async (comments) => {
  const apiKey = process.env.CLAUDE_API_KEY;
  const model = process.env.CLAUDE_MODEL;
  if (process.env.CLAUDE_SUMMARY_ENABLED !== "true" || !apiKey || !model || typeof fetch !== "function") return null;

  const prompt = [
    "Summarize these anonymous lecturer evaluation comments with strict faithfulness.",
    "Return strict JSON with keys: summary, keyStrengths, improvementAreas, commonThemes.",
    "Each array should contain short strings. Do not include student identity.",
    "Only include points directly supported by the comments. Do not infer feedback, support, preparation, or assessment strategy unless those ideas are explicitly mentioned.",
    "If a comment says answers questions patiently, write patiently answers student questions. Do not call it useful feedback.",
    "If a comment says organized lectures, write organized lectures. Do not add preparation unless preparation is explicitly mentioned.",
    "",
    comments.map((comment, index) => `${index + 1}. ${comment}`).join("\n"),
  ].join("\n");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 900,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) return null;
  const payload = await response.json();
  const text = payload?.content?.find((part) => part.type === "text")?.text;
  if (!text) return null;

  const jsonStart = text.indexOf("{");
  const jsonEnd = text.lastIndexOf("}");
  if (jsonStart === -1 || jsonEnd === -1) return { summary: text, keyStrengths: [], improvementAreas: [], commonThemes: [] };

  const parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1));
  return {
    summary: parsed.summary || text,
    keyStrengths: Array.isArray(parsed.keyStrengths) ? parsed.keyStrengths : [],
    improvementAreas: Array.isArray(parsed.improvementAreas) ? parsed.improvementAreas : [],
    commonThemes: Array.isArray(parsed.commonThemes) ? parsed.commonThemes : [],
  };
};

export const summarizeCommentTexts = async (comments) => {
  const cleanComments = comments.map((comment) => String(comment || "").trim()).filter(Boolean);
  if (cleanComments.length === 0) {
    return {
      summary: "No student comments are available for summarization.",
      keyStrengths: [],
      improvementAreas: [],
      commonThemes: [],
    };
  }

  try {
    const claudeSummary = await tryClaudeSummary(cleanComments);
    if (claudeSummary?.summary) return claudeSummary;
  } catch {
    // Fall back to deterministic summarization below.
  }

  return summarizeWithRules(cleanComments);
};
