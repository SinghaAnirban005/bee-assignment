import { MapPin, Briefcase, Building2, ExternalLink } from 'lucide-react';
// import { Job } from '../types/job';

// interface JobCardProps {
//   job;
// }

export const JobCard = ({ job }: any) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-100">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {job.title}
          </h3>
          <div className="flex items-center gap-2 text-gray-600 mb-1">
            <Building2 className="w-4 h-4" />
            <span className="font-medium">{job.company}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <MapPin className="w-4 h-4" />
            <span>{job.location}</span>
          </div>
        </div>
        <span className="text-sm text-gray-500">{formatDate(job.postedDate)}</span>
      </div>

      <p className="text-gray-600 mb-4 line-clamp-3">{job.description}</p>

      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
            <Briefcase className="w-3.5 h-3.5" />
            {job.jobType}
          </span>
          <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
            {job.category}
          </span>
        </div>
        <a
          href={job.applyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-md hover:bg-blue-700 transition font-medium"
        >
          Apply
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
};
