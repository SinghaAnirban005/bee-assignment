import { Search } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
}

export const SearchBar = ({ value, onChange, onSearch }: SearchBarProps) => {
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSearch();
    }
  };

  return (
    <div className="relative">
      <input
        type="text"
        placeholder="Search jobs by title, company, or description..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyPress={handleKeyPress}
        className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
      />
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
      <button
        onClick={onSearch}
        className="absolute right-2 top-1/2 -translate-y-1/2 bg-blue-600 text-white px-6 py-1.5 rounded-md hover:bg-blue-700 transition"
      >
        Search
      </button>
    </div>
  );
};
