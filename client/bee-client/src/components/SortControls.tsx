import { ArrowUpDown } from 'lucide-react';

interface SortControlsProps {
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  onSortChange: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
}

export const SortControls = ({ sortBy, sortOrder, onSortChange }: SortControlsProps) => {
  const handleSortByChange = (newSortBy: string) => {
    if (sortBy === newSortBy) {
      onSortChange(newSortBy, sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      onSortChange(newSortBy, 'desc');
    }
  };

  return (
    <div className="flex items-center gap-3">
      <ArrowUpDown className="w-4 h-4 text-gray-500" />
      <span className="text-sm text-gray-600">Sort by:</span>
      <button
        onClick={() => handleSortByChange('postedDate')}
        className={`text-sm px-3 py-1 rounded-md transition ${
          sortBy === 'postedDate'
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        Date {sortBy === 'postedDate' && (sortOrder === 'asc' ? '↑' : '↓')}
      </button>
      <button
        onClick={() => handleSortByChange('title')}
        className={`text-sm px-3 py-1 rounded-md transition ${
          sortBy === 'title'
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        Title {sortBy === 'title' && (sortOrder === 'asc' ? '↑' : '↓')}
      </button>
      <button
        onClick={() => handleSortByChange('company')}
        className={`text-sm px-3 py-1 rounded-md transition ${
          sortBy === 'company'
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        Company {sortBy === 'company' && (sortOrder === 'asc' ? '↑' : '↓')}
      </button>
    </div>
  );
};
