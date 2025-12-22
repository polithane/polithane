import { FollowSuggestionsSidebar } from '../home/FollowSuggestionsSidebar';

export const FollowSuggestionsBar = ({ limit = 8 }) => {
  return (
    <div className="hidden xl:block fixed right-4 top-1/2 -translate-y-1/2 z-30 w-[280px]">
      <div className="max-h-[70vh] overflow-y-auto scrollbar-hide">
        <FollowSuggestionsSidebar limit={limit} />
      </div>
    </div>
  );
};

