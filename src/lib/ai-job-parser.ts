import { AIJobParseResult, JobType } from "@/types/job";

/**
 * Extracts structured job posting details from raw placement email text or PDF content.
 * Uses Groq API (llama-3.3-70b) with a purpose-built prompt for Brainware-style forwarded emails.
 * Falls back to an improved heuristic parser if the API is unavailable or fails.
 */
export async function parseJobPostingWithAI(rawContent: string): Promise<AIJobParseResult> {
  const apiKey =
    (import.meta.env.VITE_GROQ_API_KEY as string) ||
    (import.meta.env.VITE_GEOQ_API_KEY as string) ||
    "";

  if (apiKey && apiKey.trim().length > 0) {
    try {
      const result = await callGroqAPI(rawContent, apiKey);
      if (result) return result;
    } catch (err) {
      console.warn("Groq API extraction failed, using heuristic fallback parser:", err);
    }
  }

  return fallbackHeuristicParser(rawContent);
}

async function callGroqAPI(text: string, apiKey: string): Promise<AIJobParseResult | null> {
  const systemPrompt = `You are a placement data extractor for a university CSE/AI department.
You will receive raw forwarded placement emails sent to students. These emails ALWAYS begin with
"Dear Students" or similar salutations — that is NOT the company name.

CRITICAL RULES:
- The company name appears after phrases like "regarding <Company>", "JD received from <Company>",
  "from <Company>", or in the "About <Company>" section. NEVER use "Dear Students" as company name.
- The job title should reflect the primary technical role (e.g. "AI & Cybersecurity Intern"). If
  multiple roles exist, pick the most technical one and summarise all in the description.
- The stipend/CTC may appear as "Stipend: ₹25,000 per month" or "PPO Salary: ₹5–7 LPA". Extract
  the most prominent compensation figure exactly as written.
- The application deadline may appear at the top of the forwarding email (e.g. "Deadline: 18.09.2026").
  Extract it as written.
- The application link is usually a Google Form URL (forms.gle/...) or any https link.
- Eligible batches are years like 2025, 2026, 2027 (look for "YOP" or "Batch").
- Eligible programmes come from stream names in the email (B.Tech CSE, BCA, MCA, BBA, MBA, etc.).
- Description should be a clean, readable summary of the role(s) with key responsibilities.
  Do NOT paste the raw email. Write it clearly.
- key_skills: infer from the role and responsibilities (e.g. AI, Cybersecurity, Python, etc.).
- Output ONLY valid JSON. No markdown, no explanation.`;

  const userPrompt = `Extract the job posting from this placement email and return a JSON object with exactly these fields:
{
  "title": "Primary job title",
  "company": "Company name (NOT 'Dear Students')",
  "location": "Location string",
  "job_type": "Full-time" | "Internship" | "Co-op" | "Contract",
  "ctc_package": "Stipend or CTC as written (e.g. ₹25,000/month, 5-7 LPA)",
  "eligible_batches": ["2026", "2027"],
  "eligible_programmes": ["B.Tech CSE", "B.Tech AI", "BCA", "MCA"],
  "min_cgpa": null or number,
  "description": "Clean, readable role description and key responsibilities",
  "key_skills": ["Skill1", "Skill2"],
  "selection_process": ["Step 1", "Step 2", "Step 3"],
  "apply_url": "https://...",
  "deadline": "deadline string as found in the email"
}

PLACEMENT EMAIL:
${text}`;

  // Models confirmed available on this Groq account (checked via /v1/models)
  const models = [
    "openai/gpt-oss-120b",  // Best quality — user's primary choice
    "openai/gpt-oss-20b",   // Faster fallback
    "groq/compound",        // Groq's own model
    "qwen/qwen3.8-27b",     // Last resort
  ];

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
          max_tokens: 1500,
        }),
      });

      if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        console.warn(`Groq model ${model} failed (${res.status}):`, errBody);
        continue;
      }

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) continue;

      const cleanJson = content.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleanJson);

      return sanitizeParseResult(parsed);
    } catch (err) {
      console.warn(`Groq API call failed for model ${model}:`, err);
    }
  }

  return null;
}

function sanitizeParseResult(raw: any): AIJobParseResult {
  const validTypes: JobType[] = ["Full-time", "Internship", "Co-op", "Contract"];
  const jobType: JobType = validTypes.includes(raw.job_type) ? raw.job_type : "Full-time";

  // Guard against "Dear Students" slipping through
  let company = (raw.company || "").trim();
  if (!company || /dear\s+students/i.test(company) || company.length < 2) {
    company = "Placement Drive";
  }

  return {
    title: raw.title || "Tech / Software Role",
    company,
    location: raw.location || "Kolkata / Pan-India",
    job_type: jobType,
    ctc_package: raw.ctc_package || "",
    eligible_batches: Array.isArray(raw.eligible_batches) ? raw.eligible_batches.map(String) : [],
    eligible_programmes: Array.isArray(raw.eligible_programmes) ? raw.eligible_programmes.map(String) : [],
    min_cgpa: typeof raw.min_cgpa === "number" ? raw.min_cgpa : null,
    description: raw.description || "",
    key_skills: Array.isArray(raw.key_skills) ? raw.key_skills.map(String) : [],
    selection_process: Array.isArray(raw.selection_process) ? raw.selection_process.map(String) : [],
    apply_url: raw.apply_url || "",
    deadline: raw.deadline || "",
  };
}

// ── Heuristic fallback ───────────────────────────────────────────────────────
// Used only when the Groq API is unavailable. Makes best-effort extraction.
function fallbackHeuristicParser(text: string): AIJobParseResult {
  const lines = text
    .split("\n")
    .map(l => l.trim())
    .filter(Boolean);

  // ── Company name ────────────────────────────────────────────────────────────
  // Look for "regarding <Company>" or "JD received from <Company>" or "from <Company>"
  let company = "";
  const companyPatterns = [
    /regarding\s+([A-Z][^\n.]{3,60})/i,
    /JD\s+received\s+from\s+([A-Z][^\n.]{3,60})/i,
    /from\s+([A-Z][A-Za-z0-9\s&.,'()-]{3,60}(?:LLP|Pvt|Ltd|Inc|Corp|Technologies|Solutions|Software)?)/i,
    /About\s+([A-Z][^\n:]{3,60})/i,
  ];
  for (const pattern of companyPatterns) {
    const m = text.match(pattern);
    if (m) {
      company = m[1].replace(/\.$/, "").trim();
      break;
    }
  }
  // If still empty, try lines — skip generic openers
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

  // ── Application URL ─────────────────────────────────────────────────────────
  // Prefer Google Forms links; fallback to first https URL
  const formsMatch = text.match(/https?:\/\/forms\.gle\/[^\s<>"']+/i);
  const anyUrlMatch = text.match(/https?:\/\/(?!www\.google\.com\/groups)[^\s<>"']+/i);
  const apply_url = formsMatch ? formsMatch[0] : (anyUrlMatch ? anyUrlMatch[0] : "");

  // ── Deadline ─────────────────────────────────────────────────────────────────
  // e.g. "Deadline: 18.09.2026" or "by 4.00 pm"
  let deadline = "";
  const deadlineMatch = text.match(/[Dd]eadline\s*[:\-–]?\s*([^\n.]{4,40})/);
  if (deadlineMatch) deadline = deadlineMatch[1].trim();

  // ── CTC / Stipend ───────────────────────────────────────────────────────────
  // Fixed: handle commas in numbers like "25,000" and "₹" prefix
  let ctc_package = "";
  const ctcPatterns = [
    /[Ss]tipend\s*[:\-–]\s*(₹?[\d,]+(?:\.\d+)?\s*(?:per\s+month|\/month|pm))/i,
    /(?:CTC|Package|Salary)\s*[:\-–]\s*(₹?[\d,]+(?:\.\d+)?\s*(?:LPA|Lacs|Lakhs|per\s+annum))/i,
    /PPO\s+(?:Salary|CTC)\s*[:\-–]\s*(₹?[\d,]+(?:\.\d+)?\s*(?:LPA|Lacs|Lakhs|[-–]\s*[\d,]+\s*LPA)?)/i,
    /(₹[\d,]+(?:\.\d+)?(?:\s*[-–]\s*₹?[\d,]+(?:\.\d+)?)?\s*(?:per\s+month|\/month|LPA|Lacs|Lakhs))/i,
    /([\d,]+(?:\.\d+)?\s*(?:LPA|Lacs|Lakhs|per\s+month|\/month))/i,
  ];
  for (const pattern of ctcPatterns) {
    const m = text.match(pattern);
    if (m) {
      ctc_package = m[1].trim();
      break;
    }
  }

  // ── Eligible batches ────────────────────────────────────────────────────────
  const batchMatches = Array.from(text.matchAll(/\b(202[4-9])\b/g)).map(m => m[1]);
  const eligible_batches = Array.from(new Set(batchMatches));

  // ── Job type ────────────────────────────────────────────────────────────────
  let job_type: JobType = "Full-time";
  if (/intern|stipend|trainee/i.test(text)) job_type = "Internship";

  // ── Eligible programmes ──────────────────────────────────────────────────────
  const progMap: Record<string, string> = {
    "btech cse aiml": "B.Tech CSE AIML",
    "btech cse ds": "B.Tech CSE DS",
    "btech cse": "B.Tech CSE",
    "btech ai": "B.Tech AI",
    "bca": "BCA",
    "mca": "MCA",
    "bba": "BBA",
    "mba": "MBA",
    "bsc": "BSc",
    "msc": "MSc",
  };
  const lowerText = text.toLowerCase();
  const eligible_programmes = Object.entries(progMap)
    .filter(([key]) => lowerText.includes(key))
    .map(([, val]) => val);

  // ── Job title ────────────────────────────────────────────────────────────────
  // Try to extract a numbered role like "1. AI & Cybersecurity Intern"
  const titleMatch = text.match(/^\d+\.\s+(.+?)\s*(?:\(|$)/m);
  const title = titleMatch ? titleMatch[1].trim() : "Tech / Software Role";

  // ── Description ──────────────────────────────────────────────────────────────
  // Find everything after "Job Description:" or "About" — don't dump the entire email
  let description = "";
  const descMatch = text.match(/[Jj]ob [Dd]escription\s*[:\-–]?\s*([\s\S]{50,1000}?)(?=Key Responsibilities|$)/i);
  if (descMatch) {
    description = descMatch[1].trim();
  } else {
    // Take first 600 chars after the forwarded message divider
    const fwdIdx = text.indexOf("---------- Forwarded");
    const src = fwdIdx >= 0 ? text.slice(fwdIdx + 30) : text;
    description = src.slice(0, 600).trim();
  }

  return {
    title,
    company,
    location: "Kolkata / Pan-India / Remote",
    job_type,
    ctc_package,
    eligible_batches: eligible_batches.length > 0 ? eligible_batches : ["2026", "2027"],
    eligible_programmes: eligible_programmes.length > 0 ? eligible_programmes : ["B.Tech CSE", "B.Tech AI", "BCA", "MCA"],
    min_cgpa: null,
    description,
    key_skills: [],
    selection_process: ["Online Evaluation (2 weeks)", "Face-to-face Interview", "Offer Letter"],
    apply_url,
    deadline,
  };
}
