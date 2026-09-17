import { AIJobParseResult, JobType } from "@/types/job";

/**
 * Strips all Markdown / MDX formatting symbols and converts to clean plain text.
 * Replaces **bold**, *italic*, ### headers, backticks, and standardizes bullets to '•'.
 */
export function stripMarkdown(text: string): string {
  if (!text) return "";
  return text
    // Remove bold and italic markers
    .replace(/\*\*\*(.*?)\*\*\*/g, "$1")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/___(.*?)___/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/_(.*?)_/g, "$1")
    // Remove markdown heading hashes (# Title, ## Title)
    .replace(/^#{1,6}\s+/gm, "")
    // Standardize markdown dashes/stars into clean bullet characters (• )
    .replace(/^[\*\-]\s+/gm, "• ")
    // Remove inline code ticks
    .replace(/`([^`]+)`/g, "$1")
    // Remove blockquotes
    .replace(/^>\s+/gm, "")
    // Normalize excessive multiple blank lines into max 2
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Retrieves the Groq API key from environment variables (build-time) or localStorage (runtime fallback).
 */
export function getGroqApiKey(): string {
  const envKey =
    (import.meta.env.VITE_GROQ_API_KEY as string) ||
    (import.meta.env.VITE_GEOQ_API_KEY as string) ||
    "";
  if (envKey && envKey.trim().length > 0) return envKey.trim();

  if (typeof window !== "undefined") {
    const localKey =
      localStorage.getItem("VITE_GROQ_API_KEY") ||
      localStorage.getItem("groq_api_key") ||
      "";
    if (localKey && localKey.trim().length > 0) return localKey.trim();
  }

  return "";
}

/**
 * Saves or clears a custom Groq API key in the browser localStorage.
 */
export function setLocalGroqApiKey(key: string): void {
  if (typeof window !== "undefined") {
    if (key && key.trim()) {
      localStorage.setItem("VITE_GROQ_API_KEY", key.trim());
    } else {
      localStorage.removeItem("VITE_GROQ_API_KEY");
      localStorage.removeItem("groq_api_key");
    }
  }
}

/**
 * Extracts structured job posting details from raw placement email text or document content.
 * Uses Groq API with models confirmed on the account (gpt-oss-120b, gpt-oss-20b, groq/compound, qwen/qwen3.8-27b).
 * Falls back to an intelligent heuristic parser if the API is unavailable or unconfigured.
 */
export async function parseJobPostingWithAI(rawContent: string): Promise<AIJobParseResult> {
  const apiKey = getGroqApiKey();

  if (apiKey && apiKey.trim().length > 0) {
    try {
      const { result, errorDetails } = await callGroqAPI(rawContent, apiKey);
      if (result) return result;

      // All models failed — use smart heuristic and log specific reasons
      console.warn("Groq AI models failed:", errorDetails);
      const fallback = fallbackHeuristicParser(rawContent);
      fallback._meta = {
        source: "heuristic",
        warning: `AI API was unavailable (${errorDetails.join("; ")}). Smart offline parser used instead.`,
      };
      return fallback;
    } catch (err: any) {
      console.warn("Groq API extraction threw:", err);
      const fallback = fallbackHeuristicParser(rawContent);
      fallback._meta = {
        source: "heuristic",
        warning: `AI extraction error (${err?.message || "network error"}). Smart offline parser used instead.`,
      };
      return fallback;
    }
  }

  // No API key found
  console.warn("No Groq API key found in build or localStorage. Using smart heuristic parser.");
  const fallback = fallbackHeuristicParser(rawContent);
  fallback._meta = {
    source: "heuristic",
    warning: "Groq API key not found in this deployment build. (On Vercel, trigger a Redeploy after adding env vars, or enter key in settings).",
  };
  return fallback;
}

async function callGroqAPI(
  text: string,
  apiKey: string
): Promise<{ result: AIJobParseResult | null; errorDetails: string[] }> {
  const systemPrompt = `You are a specialized placement data extractor for a university engineering and AI department.
Extract structured job posting details from raw placement emails into clean JSON.

CRITICAL FORMATTING & EXTRACTION RULES:
1. PLAIN NORMAL TEXT ONLY (NO MARKDOWN / NO MD / NO MDX):
   - Output ONLY clean, normal plain text.
   - Do NOT use markdown symbols like asterisks (** or *), hashes (###), underscores (__), or backticks (\`).
   - For section titles inside description, write normal plain headings followed by a colon:
     Role Overview:
     Key Responsibilities:
     • Bullet point 1
     • Bullet point 2
     Compensation & Progression:
   - Use standard bullet character "•" instead of markdown "-" or "*".
   - NO markdown bolding in titles, skills, or selection rounds.

2. COMPANY NAME:
   - Placement emails always begin with "Dear Students" or forwarding headers — NEVER use "Dear Students", "Brainware University", or "Placement Coordinator" as company name.
   - Look for the company name in phrases like "regarding <Company>", "JD received from <Company>", "About <Company>", or in the subject.

3. JOB TYPE & COMPENSATION:
   - If an initial internship or probation period leads to a Pre-Placement Offer (PPO) or full-time conversion:
     - Set job_type to "Full-time" (or "Internship" if primarily an intern role).
     - In ctc_package, ALWAYS include BOTH the monthly stipend and the full-time PPO CTC!
       Example: "Stipend: ₹25,000/month | PPO: ₹5–7 LPA"
   - Do NOT omit either the stipend or the PPO CTC if both are mentioned.

4. JOB DESCRIPTION:
   - Provide a comprehensive, professional plain-text description.
   - Include:
     Role Overview:
     (Platform / product details and technical context)

     Key Responsibilities:
     • Bullet point 1
     • Bullet point 2

     Compensation & Progression:
     (Details on evaluation, probation, stipend, and PPO full-time transition)

5. KEY SKILLS:
   - Infer and list 5 to 8 concrete technical and domain skills required (e.g. ["Artificial Intelligence", "Cybersecurity", "API Integration", "Database Management", "QA & Testing", "Technical Documentation"]).
   - Plain text strings only. NEVER leave key_skills empty.

6. SELECTION PROCESS:
   - Extract every selection round/step in sequence as an array of plain text strings (e.g. ["Step 1: Online Evaluation Internship (2 weeks, remote)", "Step 2: Face-to-face interview at college/institute", "Step 3: Offer Letter with Stipend & PPO"]).
   - No markdown bolding.

7. DEADLINE & URL:
   - Deadline: Full deadline string with date and time (e.g. "18.09.2026 by 4.00 pm"). NEVER cut off at dots or commas.
   - Apply URL: Prefer official Google Form or application links (e.g. "https://forms.gle/...").

8. ELIGIBLE BATCHES:
   - Extract the graduating passout year (e.g. ["2027"] from "2027 YOP"). Do NOT pull years from deadline dates like 18.09.2026.

Output ONLY valid JSON matching the schema. No markdown ticks around the json.`;

  const userPrompt = `Extract the job posting from this placement email into a JSON object:
{
  "title": "Primary job title",
  "company": "Company name (NOT 'Dear Students')",
  "location": "Location / Work Mode string",
  "job_type": "Full-time" | "Internship" | "Co-op" | "Contract",
  "ctc_package": "Stipend and/or PPO CTC (e.g. Stipend: ₹25,000/month | PPO: ₹5–7 LPA)",
  "eligible_batches": ["2027"],
  "eligible_programmes": ["B.Tech CSE AIML", "B.Tech CSE", ...],
  "min_cgpa": null or number,
  "description": "Comprehensive plain text description with Role Overview, Key Responsibilities bullet points (using •), and Progression details. ABSOLUTELY NO MARKDOWN ASTERISKS (**).",
  "key_skills": ["Skill1", "Skill2", ...],
  "selection_process": ["Step 1: ...", "Step 2: ...", ...],
  "apply_url": "https://...",
  "deadline": "Full deadline string (e.g. 18.09.2026 by 4.00 pm)"
}

PLACEMENT EMAIL:
${text}`;

  // Models confirmed available on this Groq account
  const models = [
    "openai/gpt-oss-120b",  // Best quality reasoning & extraction
    "openai/gpt-oss-20b",   // Fast fallback
    "groq/compound",        // Groq compound model
    "qwen/qwen3.8-27b",     // High reliability plain JSON
  ];

  const errorDetails: string[] = [];

  for (const model of models) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey.trim()}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.05,
          response_format: { type: "json_object" },
          max_tokens: 3000,
        }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        let errMsg = `HTTP ${res.status}`;
        try {
          const errObj = JSON.parse(errText);
          if (errObj.error?.message) errMsg += ` (${errObj.error.message})`;
        } catch {}
        console.warn(`Groq model ${model} failed: ${errMsg}`);
        errorDetails.push(`${model}: ${errMsg}`);
        continue;
      }

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        errorDetails.push(`${model}: empty choices content`);
        continue;
      }

      const cleanJson = content.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleanJson);

      return {
        result: sanitizeParseResult(parsed, model),
        errorDetails: [],
      };
    } catch (err: any) {
      console.warn(`Groq model ${model} fetch error:`, err);
      errorDetails.push(`${model}: ${err?.message || "Network Error"}`);
    }
  }

  return { result: null, errorDetails };
}

function sanitizeParseResult(raw: any, modelName?: string): AIJobParseResult {
  const validTypes: JobType[] = ["Full-time", "Internship", "Co-op", "Contract"];
  const jobType: JobType = validTypes.includes(raw.job_type) ? raw.job_type : "Full-time";

  let company = stripMarkdown((raw.company || "").trim());
  if (!company || /dear\s+students/i.test(company) || company.length < 2) {
    company = "Placement Drive";
  }

  const batches = Array.isArray(raw.eligible_batches)
    ? raw.eligible_batches.map(String).map(stripMarkdown).filter((b: string) => /^\d{4}$/.test(b.trim()))
    : [];

  return {
    title: stripMarkdown(raw.title || "Tech / Software Role"),
    company,
    location: stripMarkdown(raw.location || "Remote / Pan-India"),
    job_type: jobType,
    ctc_package: stripMarkdown(raw.ctc_package || ""),
    eligible_batches: batches.length > 0 ? batches : ["2027"],
    eligible_programmes: Array.isArray(raw.eligible_programmes)
      ? raw.eligible_programmes.map(String).map(stripMarkdown)
      : [],
    min_cgpa: typeof raw.min_cgpa === "number" ? raw.min_cgpa : null,
    description: stripMarkdown(raw.description || ""),
    key_skills:
      Array.isArray(raw.key_skills) && raw.key_skills.length > 0
        ? raw.key_skills.map(String).map(stripMarkdown)
        : ["Problem Solving", "Core CS"],
    selection_process: Array.isArray(raw.selection_process)
      ? raw.selection_process.map(String).map(stripMarkdown)
      : [],
    apply_url: (raw.apply_url || "").trim(),
    deadline: stripMarkdown(raw.deadline || ""),
    _meta: {
      source: "ai",
      model: modelName || "Groq AI",
    },
  };
}

// ── Smart Heuristic Fallback Parser ──────────────────────────────────────────
// Produces 100% clean plain-text output with no Markdown/MDX syntax.
function fallbackHeuristicParser(text: string): AIJobParseResult {
  const lines = text
    .split("\n")
    .map(l => l.trim())
    .filter(Boolean);

  // 1. Company Name
  let company = "";
  const companyPatterns = [
    /regarding\s+([A-Z][^\n.]{3,60})/i,
    /JD\s+received\s+from\s+([A-Z][^\n.]{3,60})/i,
    /About\s+([A-Z][^\n:]{3,60})/i,
    /from\s+([A-Z][A-Za-z0-9\s&.,'()-]{3,60}(?:LLP|Pvt|Ltd|Inc|Corp|Technologies|Solutions|Software)?)/i,
  ];
  for (const pattern of companyPatterns) {
    const m = text.match(pattern);
    if (m) {
      company = m[1].replace(/\.$/, "").trim();
      break;
    }
  }
  if (!company) {
    const skipPatterns = /^(dear|hi|hello|greetings|regards|note|please|read|link|deadline|subject|fwd|fw:|re:|you received)/i;
    for (const line of lines) {
      if (!skipPatterns.test(line) && line.length > 4 && line.length < 80) {
        company = line.replace(/Hiring|Drive|Campus|Placement|Announcement|:/gi, "").trim();
        break;
      }
    }
  }
  if (!company || /dear\s+students/i.test(company)) company = "Placement Drive";

  // 2. Application Deadline
  let deadline = "";
  const dlMatch = text.match(/(?:[Dd]eadline|[Ll]ast\s+[Dd]ate)\s*[:\-–]?\s*([^\n\r]+)/i);
  if (dlMatch) {
    deadline = dlMatch[1].trim().replace(/\.$/, "").trim();
  }

  // 3. Application URL
  const formsMatch = text.match(/https?:\/\/forms\.gle\/[^\s<>"')]+/i);
  const anyUrlMatch = text.match(/https?:\/\/(?!www\.google\.com\/groups)[^\s<>"')]+/i);
  const apply_url = formsMatch ? formsMatch[0] : (anyUrlMatch ? anyUrlMatch[0] : "");

  // 4. CTC & Stipend (Both if available)
  let ctc_package = "";
  const stipendMatch = text.match(/[Ss]tipend\s*[:\-–]?\s*(₹?[\d,]+(?:\.\d+)?\s*(?:per\s+month|\/month|pm)?)/i);
  const ppoMatch = text.match(/PPO\s*(?:Salary|CTC|Package)?\s*[:\-–]?\s*(₹?[\d,]+(?:\s*[-–]\s*₹?[\d,]+)?\s*(?:LPA|Lacs|Lakhs)?)/i);
  const genericCtc = text.match(/(?:CTC|Package|Salary)\s*[:\-–]?\s*(₹?[\d,]+(?:\.\d+)?\s*(?:LPA|Lacs|Lakhs|per\s+annum))/i);

  if (stipendMatch && ppoMatch) {
    ctc_package = `Stipend: ${stipendMatch[1].trim()} | PPO: ${ppoMatch[1].trim()}`;
  } else if (ppoMatch) {
    ctc_package = `PPO Salary: ${ppoMatch[1].trim()}`;
  } else if (stipendMatch) {
    ctc_package = stipendMatch[1].trim();
  } else if (genericCtc) {
    ctc_package = genericCtc[1].trim();
  }

  // 5. Job Title
  const titleMatch = text.match(/^\d+\.\s+(.+?)\s*(?:\(|$)/m);
  let title = titleMatch ? titleMatch[1].trim() : "";
  if (!title) {
    const roleMatch = text.match(/(?:Role|Position|Designation)\s*[:\-–]\s*([^\n\r]+)/i);
    title = roleMatch ? roleMatch[1].trim() : "Tech / Software Role";
  }

  // 6. Job Type
  let job_type: JobType = "Full-time";
  if (ppoMatch || /PPO|Full[- ]time/i.test(text)) {
    job_type = "Full-time";
  } else if (/intern|stipend|trainee/i.test(text)) {
    job_type = "Internship";
  }

  // 7. Location
  let location = "Remote / Pan-India";
  const locMatch = text.match(/Location\s*[:\-–]\s*([^\n\r]+)/i);
  if (locMatch) {
    location = locMatch[1].trim().replace(/\s*I\s*/g, " | ");
  }

  // 8. Eligible Batches
  let eligible_batches: string[] = [];
  const yopMatch = text.match(/\b(202\d)\s*(?:YOP|Batch|Passout|Graduat)/i);
  if (yopMatch) {
    eligible_batches = [yopMatch[1]];
  } else {
    const batchMatches = Array.from(text.matchAll(/\b(202[4-9])\b/g)).map(m => m[1]);
    const filtered = Array.from(new Set(batchMatches)).filter(y => !deadline.includes(y));
    eligible_batches = filtered.length > 0 ? filtered : ["2027"];
  }

  // 9. Eligible Programmes
  const progMap: Record<string, string> = {
    "btech cse aiml": "B.Tech CSE AIML",
    "btech cse ds": "B.Tech CSE DS",
    "btech cse": "B.Tech CSE",
    "btech ai": "B.Tech AI",
    "bca": "BCA",
    "mca": "MCA",
    "bsc ancs": "B.Sc ANCS",
    "msc ancs": "M.Sc ANCS",
    "bba": "BBA",
    "mba": "MBA",
  };
  const lowerText = text.toLowerCase();
  const eligible_programmes = Object.entries(progMap)
    .filter(([key]) => lowerText.includes(key))
    .map(([, val]) => val);

  // 10. Selection Process (Clean plain text strings)
  let selection_process: string[] = [];
  const selIdx = text.search(/Candidate Selection Process|Selection Process|Selection Rounds/i);
  if (selIdx >= 0) {
    const selBlock = text.slice(selIdx, selIdx + 900);
    const steps = Array.from(selBlock.matchAll(/(Step\s*\d+\s*:[^\n\r]+)/gi))
      .map(m => stripMarkdown(m[1].trim()));
    if (steps.length > 0) selection_process = steps;
  }
  if (selection_process.length === 0) {
    selection_process = [
      "Step 1: Online Evaluation / Assessment (Remote)",
      "Step 2: Face-to-face / Technical Interview",
      "Step 3: Final Selection & Offer Letter",
    ];
  }

  // 11. Key Skills (Clean plain text)
  const skillsSet = new Set<string>();
  if (/AI|Artificial Intelligence/i.test(title) || /core\s+Al/i.test(text)) skillsSet.add("AI & Machine Learning");
  if (/Cybersecurity|Security/i.test(text)) skillsSet.add("Cybersecurity");
  if (/API/i.test(text)) skillsSet.add("API Integration");
  if (/Database|SQL/i.test(text)) skillsSet.add("Database Management");
  if (/QA|Quality/i.test(text)) skillsSet.add("QA & Testing");
  if (/Documentation/i.test(text)) skillsSet.add("Technical Documentation");
  if (/Python/i.test(text)) skillsSet.add("Python");
  if (/Java\b/i.test(text)) skillsSet.add("Java");
  if (/React/i.test(text)) skillsSet.add("React");
  if (skillsSet.size === 0) {
    skillsSet.add("Computer Science Fundamentals");
    skillsSet.add("Problem Solving");
  }
  const key_skills = Array.from(skillsSet).map(stripMarkdown);

  // 12. Description & Responsibilities (Clean plain text with NO MD syntax)
  const descParts: string[] = [];
  const descMatch = text.match(/[Jj]ob [Dd]escription\s*[:\-–]?\s*([^\n\r]+)/i);
  const respMatch = text.match(/Key Responsibilities\s*[:\-–]?([\s\S]*?)(?=(?:\d+\.|\n\n--|\nCandidate Selection|$))/i);

  if (descMatch) {
    descParts.push(`Role Overview:\n${descMatch[1].trim()}`);
  }
  if (respMatch) {
    const bullets = respMatch[1]
      .split("\n")
      .map(l => l.trim())
      .filter(l => l.length > 5)
      .map(l => (l.startsWith("•") ? l : `• ${l.replace(/^[\*\-]\s*/, "")}`))
      .join("\n");
    if (bullets) {
      descParts.push(`Key Responsibilities:\n${bullets}`);
    }
  }
  if (ppoMatch || stipendMatch) {
    descParts.push(`Compensation & Progression:\n${ctc_package || "Stipend during probation, followed by permanent placement."}`);
  }
  if (descParts.length === 0) {
    const fwdIdx = text.indexOf("---------- Forwarded");
    const src = fwdIdx >= 0 ? text.slice(fwdIdx + 30) : text;
    descParts.push(src.slice(0, 600).trim());
  }

  const description = stripMarkdown(descParts.join("\n\n"));

  return {
    title: stripMarkdown(title),
    company: stripMarkdown(company),
    location: stripMarkdown(location),
    job_type,
    ctc_package: stripMarkdown(ctc_package),
    eligible_batches: eligible_batches.length > 0 ? eligible_batches : ["2027"],
    eligible_programmes: eligible_programmes.length > 0 ? eligible_programmes : ["B.Tech CSE AIML", "B.Tech CSE", "BCA", "MCA"],
    min_cgpa: null,
    description,
    key_skills,
    selection_process,
    apply_url,
    deadline: stripMarkdown(deadline),
    _meta: {
      source: "heuristic",
    },
  };
}
