export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  salary?: string;
  jobType?: string;
  category?: string;
  applyUrl: string;
  postedDate: Date;
  source: string;
  sourceId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface JobSearchParams {
  query?: string;
  location?: string;
  jobType?: string;
  category?: string;
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface JobSearchResponse {
  jobs: Job[];
  total: number;
  page: number;
  totalPages: number;
}