// import { Filters } from '../types/job';

interface FilterPanelProps {
  filters: any;
  selectedJobType: string;
  selectedCategory: string;
  onJobTypeChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
}

export const FilterPanel = ({
  filters,
  selectedJobType,
  selectedCategory,
  onJobTypeChange,
  onCategoryChange,
}: FilterPanelProps) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm space-y-6">
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Job Type
        </label>
        <select
          value={selectedJobType}
          onChange={(e) => onJobTypeChange(e.target.value)}
          className="w-full p-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        >
          <option value="">All Types</option>
          {filters.jobTypes.map((type: any) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Category
        </label>
        <select
          value={selectedCategory}
          onChange={(e) => onCategoryChange(e.target.value)}
          className="w-full p-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        >
          <option value="">All Categories</option>
          {filters.categories.map((category: any) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};
