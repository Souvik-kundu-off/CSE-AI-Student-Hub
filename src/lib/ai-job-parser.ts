import { AIJobParseResult, JobType } from "@/types/job";

/**
 * Extracts structured job posting details from raw placement email text or PDF content using Groq API (gpt-oss-120b).
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

  // Fallback heuristic extraction if API key is not present or fails
  return fallbackHeuristicParser(rawContent);
}

async function callGroqAPI(text: string, apiKey: string): Promise<AIJobParseResult | null> {
  const prompt = `You are an expert HR and Placement Assistant for a university CSE/AI department.
Extract structured job details from the following placement email or job description text.

Return ONLY a valid JSON object matching this EXACT structure (no markdown fences, no extra text):
{
  "title": "Job Title (e.g. Software Development Engineer, Data Analyst Intern)",
  "company": "Company Name",
  "location": "Job Location (e.g. Kolkata, Bangalore, Hybrid, Remote)",
  "job_type": "Full-time" or "Internship" or "Co-op" or "Contract",
  "ctc_package": "CTC or Stipend (e.g. 6.5 LPA, 25,000/month)",
  "eligible_batches": ["2025", "2026"],
  "eligible_programmes": ["B.Tech CSE", "B.Tech AI", "BCA", "MCA"],
  "min_cgpa": 6.5 or null,
  "description": "Comprehensive role description, key responsibilities, and requirements formatted clearly with bullet points",
  "key_skills": ["Skill1", "Skill2", "Skill3"],
  "selection_process": ["Online Assessment", "Technical Interview", "HR Round"],
  "apply_url": "Full application Google Form or Registration URL",
  "deadline": "YYYY-MM-DD or readable deadline string"
}

PLACEMENT EMAIL / JOB DESCRIPTION:
${text}`;

  // Models to try in order of preference
  const models = ["openai/gpt-oss-120b", "llama-3.3-70b-versatile", "mixtral-8x7b-32768"];

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
            { role: "system", content: "You are a JSON extractor. Output valid JSON only." },
            { role: "user", content: prompt },
          ],
          temperature: 0.1,
          response_format: { type: "json_object" },
        }),
      });

      if (!res.ok) {
        console.warn(`Groq model ${model} response status:`, res.status);
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

  return {
    title: raw.title || "Software Engineer",
    company: raw.company || "Placement Drive",
    location: raw.location || "On-site / Hybrid",
    job_type: jobType,
    ctc_package: raw.ctc_package || "As per company norms",
    eligible_batches: Array.isArray(raw.eligible_batches) ? raw.eligible_batches.map(String) : ["2025", "2026"],
    eligible_programmes: Array.isArray(raw.eligible_programmes) ? raw.eligible_programmes.map(String) : ["B.Tech CSE", "B.Tech AI"],
    min_cgpa: typeof raw.min_cgpa === "number" ? raw.min_cgpa : null,
    description: raw.description || "Refer to placement email for complete responsibilities.",
    key_skills: Array.isArray(raw.key_skills) ? raw.key_skills.map(String) : [],
    selection_process: Array.isArray(raw.selection_process) ? raw.selection_process.map(String) : [],
    apply_url: raw.apply_url || "",
    deadline: raw.deadline || "",
  };
}

function fallbackHeuristicParser(text: string): AIJobParseResult {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);

  // Extract application URL (e.g. forms.gle or http...)
  const urlMatch = text.match(/https?:\/\/[^\s<>"']+/i);
  const apply_url = urlMatch ? urlMatch[0] : "";

  // Extract CTC / Salary
  const ctcMatch = text.match(/(\d+(\.\d+)?\s*(LPA|Lacs|Lakhs|INR|k\/month|per month))/i);
  const ctc_package = ctcMatch ? ctcMatch[0] : "Competitive CTC";

  // Extract Batches (e.g. 2024, 2025, 2026)
  const batchMatches = Array.from(text.matchAll(/\b(202[4-8])\b/g)).map(m => m[1]);
  const eligible_batches = Array.from(new Set(batchMatches));

  // Determine Job Type
  let job_type: JobType = "Full-time";
  if (/intern|stipend|trainee/i.test(text)) job_type = "Internship";

  // Extract Company Name hint from first few lines
  let company = "Placement Hiring";
  if (lines.length > 0) {
    const headerLine = lines[0].replace(/Hiring|Drive|Campus|Placement|Announcement|:/gi, "").trim();
    if (headerLine.length > 2 && headerLine.length < 50) {
      company = headerLine;
    }
  }

  return {
    title: "Software / Tech Role",
    company,
    location: "Kolkata / Pan-India",
    job_type,
    ctc_package,
    eligible_batches: eligible_batches.length > 0 ? eligible_batches : ["2025", "2026"],
    eligible_programmes: ["B.Tech CSE", "B.Tech AI", "BCA", "MCA"],
    min_cgpa: null,
    description: text,
    key_skills: [],
    selection_process: ["Online Assessment", "Technical Interview", "HR Round"],
    apply_url,
    deadline: "",
  };
}
