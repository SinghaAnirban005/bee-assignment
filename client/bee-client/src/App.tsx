import { useState, useEffect } from 'react';
import { Briefcase, Loader2 } from 'lucide-react';
import { SearchBar } from './components/SearchBar';
import { FilterPanel } from './components/FilterPanel';
import { JobCard } from './components/JobCard';
import { Pagination } from './components/Pagination';
import { SortControls } from './components/SortControls';
import { fetchJobs, fetchFilters } from './services/api';

function App() {
  const [jobs, setJobs] = useState([]);
  const [filters, setFilters] = useState({ jobTypes: [], categories: [], locations: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJobType, setSelectedJobType] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [sortBy, setSortBy] = useState('postedDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const limit = 10;

  const loadJobs = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchJobs({
        query: searchQuery,
        jobType: selectedJobType,
        category: selectedCategory,
        page: currentPage,
        limit,
        sortBy,
        sortOrder,
      });

      setJobs(data.jobs);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err) {
      setError('Failed to load jobs. Please try again later.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadFilters = async () => {
    try {
      const data = await fetchFilters();
      setFilters(data);
    } catch (err) {
      console.error('Failed to load filters:', err);
    }
  };

  useEffect(() => {
    loadFilters();
  }, [selectedJobType, selectedCategory]);

  useEffect(() => {
    loadJobs();
  }, [currentPage, selectedJobType, selectedCategory, sortBy, sortOrder]);

  const handleSearch = () => {
    setCurrentPage(1);
    loadJobs();
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSortChange = (newSortBy: string, newSortOrder: 'asc' | 'desc') => {
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
    setCurrentPage(1);
  };

  const handleJobTypeChange = (value: string) => {
    setSelectedJobType(value);
    setCurrentPage(1);
  };

  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value);
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-3">
            <Briefcase className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Job Board</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            onSearch={handleSearch}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <aside className="lg:col-span-1">
            <FilterPanel
              filters={filters}
              selectedJobType={selectedJobType}
              selectedCategory={selectedCategory}
              onJobTypeChange={handleJobTypeChange}
              onCategoryChange={handleCategoryChange}
            />
          </aside>

          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-6">
              <p className="text-gray-600">
                {loading ? (
                  'Loading...'
                ) : (
                  <>
                    <span className="font-semibold">{total}</span> jobs found
                  </>
                )}
              </p>
              <SortControls
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSortChange={handleSortChange}
              />
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            ) : jobs.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <p className="text-gray-500 text-lg">No jobs found matching your criteria.</p>
                <p className="text-gray-400 mt-2">Try adjusting your search or filters.</p>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {jobs.map((job: any) => (
                    <JobCard key={job.id} job={job} />
                  ))}
                </div>

                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
