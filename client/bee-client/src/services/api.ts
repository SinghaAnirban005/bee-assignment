const API_BASE_URL = import.meta.env.VITE_API_URL;

interface JobsParams {
  query?: string;
  location?: string;
  jobType?: string;
  category?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

console.log(API_BASE_URL)

export const fetchJobs = async (params: JobsParams) => {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      searchParams.append(key, value.toString());
    }
  });

  const response = await fetch(`${API_BASE_URL}/jobs?${searchParams}`);

  if (!response.ok) {
    throw new Error('Failed to fetch jobs');
  }

  return response.json();
};

export const fetchFilters = async () => {
  const response = await fetch(`${API_BASE_URL}/filters`);

  if (!response.ok) {
    throw new Error('Failed to fetch filters');
  }

  return response.json();
};
