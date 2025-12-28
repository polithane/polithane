import { FollowSuggestionsSidebar } from '../home/FollowSuggestionsSidebar';

export const FollowSuggestionsBar = ({ limit = 8 }) => {
  return (
    <div className="hidden lg:block fixed right-2 top-1/2 -translate-y-1/2 z-30 w-[240px] xl:w-[260px] 2xl:w-[280px] overflow-hidden">
      <div className="max-h-[70vh] overflow-y-auto scrollbar-hide">
        <FollowSuggestionsSidebar limit={limit} />
      </div>
    </div>
  );
};

