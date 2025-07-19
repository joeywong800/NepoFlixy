import React from 'react';

export const SpotlightSkeleton = () => {
  return (
    <div className="relative w-full h-[80vh] bg-[#1a1a1a] flex items-end animate-fade-in">
      <div className="absolute inset-0 bg-gradient-to-r from-[#090a0a]/70 via-black/20 to-transparent"></div>
      <div className="absolute inset-0 bg-gradient-to-t from-[#090a0a]/80 via-black/20 to-transparent"></div>
      <div className="absolute inset-0 bg-gradient-to-b from-[#090a0a]/60 via-[#090a0a]/10 to-transparent"></div>
      
      <div className="relative z-10 p-8 pb-0 w-full pr-0">
        {/* Logo/Title */}
        <div className="skeleton-base skeleton-shimmer w-[24rem] h-16 mb-4"></div>
        
        {/* Rating and info */}
        <div className="flex items-center gap-2 mb-4">
          <div className="skeleton-base skeleton-shimmer w-12 h-6 rounded"></div>
          <div className="skeleton-base skeleton-shimmer w-8 h-4"></div>
          <div className="skeleton-base skeleton-shimmer w-20 h-4"></div>
          <div className="skeleton-base skeleton-shimmer w-16 h-4"></div>
          <div className="skeleton-base skeleton-shimmer w-20 h-4"></div>
        </div>
        
        {/* Description */}
        <div className="mb-16 space-y-2 max-w-xl">
          <div className="skeleton-base skeleton-shimmer w-full h-4"></div>
          <div className="skeleton-base skeleton-shimmer w-4/5 h-4"></div>
          <div className="skeleton-base skeleton-shimmer w-3/5 h-4"></div>
        </div>
        
        {/* Action buttons */}
        <div className="flex flex-row mb-4 w-full justify-between">
          <div className="flex items-center gap-2">
            <div className="skeleton-base skeleton-shimmer w-10 h-10 !rounded-full"></div>
            <div className="skeleton-base skeleton-shimmer w-32 h-10 !rounded-full"></div>
            <div className="skeleton-base skeleton-shimmer w-10 h-10 !rounded-full"></div>
            <div className="skeleton-base skeleton-shimmer w-10 h-10 !rounded-full"></div>
          </div>
          <div className="skeleton-base skeleton-shimmer w-16 h-8"></div>
        </div>
        
        {/* Genre tags */}
        <div className="flex gap-2 mb-3">
          <div className="skeleton-base skeleton-shimmer w-16 h-4"></div>
          <div className="skeleton-base skeleton-shimmer w-20 h-4"></div>
          <div className="skeleton-base skeleton-shimmer w-18 h-4"></div>
        </div>
      </div>
    </div>
  );
};

export const MediaCardSkeleton = () => {
  return (
    <div className="flex-shrink-0 w-full animate-fade-in">
      <div className="skeleton-base skeleton-shimmer w-full aspect-video rounded-lg mb-3"></div>
      <div className="skeleton-base skeleton-shimmer w-3/4 h-4 mb-2"></div>
      <div className="skeleton-base skeleton-shimmer w-1/2 h-3"></div>
    </div>
  );
};

export const CategorySkeleton = ({ title }) => {
  return (
    <div className="mb-8 animate-fade-in">
      <h2 className="text-2xl text-white mb-1">{title}</h2>
      <div className="flex space-x-4 overflow-x-auto scrollbar-hide py-4 pl-4 -ml-4">
        {[...Array(4)].map((_, index) => (
          <MediaCardSkeleton key={index} />
        ))}
      </div>
    </div>
  );
};

export const SearchSkeleton = () => {
  return (
    <div className="animate-fade-in mb-8">
      <h2 className="text-2xl text-white mb-5">Search Results</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 py-4">
        {[...Array(12)].map((_, index) => (
          <MediaCardSkeleton key={index} />
        ))}
      </div>
    </div>
  );
};
