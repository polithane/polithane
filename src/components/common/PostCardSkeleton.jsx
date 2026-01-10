/**
 * Skeleton loading component for post cards
 * Shows a placeholder while posts are loading
 */
export const PostCardSkeleton = ({ horizontal = false }) => {
  if (horizontal) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden animate-pulse">
        <div className="flex gap-3 p-3">
          {/* Avatar */}
          <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0" />
          
          <div className="flex-1 min-w-0">
            {/* User info */}
            <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
            <div className="h-3 bg-gray-200 rounded w-32" />
          </div>
        </div>

        <div className="flex gap-3 px-3 pb-3">
          {/* Media area - Square */}
          <div className="aspect-square w-[150px] bg-gray-200 rounded-lg flex-shrink-0" />
          
          {/* Content area */}
          <div className="flex-1 min-w-0 space-y-2">
            {/* Title */}
            <div className="h-5 bg-gray-200 rounded w-full" />
            <div className="h-5 bg-gray-200 rounded w-4/5" />
            
            {/* Description lines */}
            <div className="space-y-1.5 pt-2">
              <div className="h-3 bg-gray-200 rounded w-full" />
              <div className="h-3 bg-gray-200 rounded w-full" />
              <div className="h-3 bg-gray-200 rounded w-3/4" />
            </div>

            {/* Tags/agenda */}
            <div className="flex gap-2 pt-2">
              <div className="h-6 bg-gray-200 rounded-full w-20" />
              <div className="h-6 bg-gray-200 rounded-full w-16" />
            </div>
          </div>
        </div>

        {/* Interaction buttons */}
        <div className="flex items-center justify-between px-3 pb-3 pt-2 border-t border-gray-200">
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-center gap-1">
              <div className="w-5 h-5 rounded-full bg-gray-200" />
              <div className="w-8 h-3 bg-gray-200 rounded" />
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="w-5 h-5 rounded-full bg-gray-200" />
              <div className="w-8 h-3 bg-gray-200 rounded" />
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="w-5 h-5 rounded-full bg-gray-200" />
              <div className="w-8 h-3 bg-gray-200 rounded" />
            </div>
          </div>
          <div className="w-5 h-5 rounded-full bg-gray-200" />
        </div>
      </div>
    );
  }

  // Vertical card skeleton (for mobile grid)
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden animate-pulse">
      {/* Media area */}
      <div className="aspect-[9/16] bg-gray-200" />
      
      <div className="p-3 space-y-3">
        {/* User info */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 bg-gray-200 rounded w-20" />
            <div className="h-2.5 bg-gray-200 rounded w-24" />
          </div>
        </div>

        {/* Content */}
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded w-full" />
          <div className="h-4 bg-gray-200 rounded w-4/5" />
        </div>

        {/* Tags */}
        <div className="flex gap-2">
          <div className="h-5 bg-gray-200 rounded-full w-16" />
        </div>

        {/* Interactions */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-200">
          <div className="flex gap-3">
            <div className="flex flex-col items-center gap-1">
              <div className="w-4 h-4 rounded-full bg-gray-200" />
              <div className="w-6 h-2.5 bg-gray-200 rounded" />
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="w-4 h-4 rounded-full bg-gray-200" />
              <div className="w-6 h-2.5 bg-gray-200 rounded" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
