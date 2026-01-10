/**
 * Skeleton loading component for profile page
 * Shows a placeholder while profile data is loading
 */
export const ProfileSkeleton = () => {
  return (
    <div className="animate-pulse">
      {/* Header/Cover */}
      <div className="relative bg-gradient-to-br from-gray-200 to-gray-300 h-32 sm:h-48" />

      <div className="container-main py-4 sm:py-6">
        <div className="max-w-4xl mx-auto">
          {/* Avatar & Basic Info */}
          <div className="flex items-start gap-4 -mt-12 sm:-mt-16">
            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-white p-1 shadow-xl">
              <div className="w-full h-full rounded-full bg-gray-200" />
            </div>
            
            <div className="flex-1 mt-12 sm:mt-16 space-y-3">
              {/* Name */}
              <div className="h-7 bg-gray-200 rounded w-48" />
              
              {/* Username */}
              <div className="h-4 bg-gray-200 rounded w-32" />
              
              {/* Stats */}
              <div className="flex gap-6">
                <div className="space-y-2">
                  <div className="h-5 bg-gray-200 rounded w-12" />
                  <div className="h-3 bg-gray-200 rounded w-16" />
                </div>
                <div className="space-y-2">
                  <div className="h-5 bg-gray-200 rounded w-12" />
                  <div className="h-3 bg-gray-200 rounded w-16" />
                </div>
                <div className="space-y-2">
                  <div className="h-5 bg-gray-200 rounded w-12" />
                  <div className="h-3 bg-gray-200 rounded w-20" />
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-2 pt-2">
                <div className="h-10 bg-gray-200 rounded-lg w-32" />
                <div className="h-10 bg-gray-200 rounded-lg w-32" />
              </div>
            </div>
          </div>

          {/* Bio */}
          <div className="mt-6 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-full" />
            <div className="h-4 bg-gray-200 rounded w-4/5" />
          </div>

          {/* Tabs */}
          <div className="flex gap-4 mt-8 border-b border-gray-200">
            <div className="h-10 bg-gray-200 rounded-t w-24" />
            <div className="h-10 bg-gray-200 rounded-t w-20" />
            <div className="h-10 bg-gray-200 rounded-t w-20" />
          </div>

          {/* Posts Grid Skeleton */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="aspect-[9/16] bg-gray-200" />
                <div className="p-3 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-full" />
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="flex gap-3 pt-2">
                    <div className="h-3 bg-gray-200 rounded w-8" />
                    <div className="h-3 bg-gray-200 rounded w-8" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
