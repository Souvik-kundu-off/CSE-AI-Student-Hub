export type JobType = "Full-time" | "Internship" | "Co-op" | "Contract";
export type JobStatus = "active" | "closed" | "draft";

export interface JobPosting {
  id: string;
  title: string;
  company: string;
  company_logo?: string | null;
  location?: string | null;
  job_type: JobType;
  ctc_package?: string | null;
  eligible_batches?: string[];
  eligible_programmes?: string[];
  min_cgpa?: number | null;
  description: string;
  key_skills?: string[];
  selection_process?: string[];
  apply_url: string;
  pdf_url?: string | null;
  deadline?: string | null;
  status: JobStatus;
  created_at: any;
  created_by?: string;
  views_count?: number;
  applicants_count?: number;
}

export interface AIJobParseResult {
  title: string;
  company: string;
  location: string;
  job_type: JobType;
  ctc_package: string;
  eligible_batches: string[];
  eligible_programmes: string[];
  min_cgpa: number | null;
  description: string;
  key_skills: string[];
  selection_process: string[];
  apply_url: string;
  deadline: string;
}
