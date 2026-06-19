import React, { useState } from "react";
import { Star } from "lucide-react";

interface StarRatingProps {
  rating?: number;
  count?: number;
  interactive?: boolean;
  onRate?: (rating: number) => void;
  size?: number;
}

export default function StarRating({
  rating = 5.0,
  count,
  interactive = false,
  onRate,
  size = 14,
}: StarRatingProps) {
  const [hoverVal, setHoverVal] = useState<number | null>(null);

  const displayVal = hoverVal !== null ? hoverVal : rating;

  // Generate 5 stars
  const starsArray = Array.from({ length: 5 }, (_, i) => i + 1);

  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center">
        {starsArray.map((star) => {
          // Determine if filled, half, or empty
          const isFilled = star <= displayVal;
          const isHalf = !isFilled && star - 0.5 <= displayVal;

          return (
            <button
              key={star}
              type="button"
              disabled={!interactive}
              onClick={() => onRate && onRate(star)}
              onMouseEnter={() => interactive && setHoverVal(star)}
              onMouseLeave={() => interactive && setHoverVal(null)}
              className={`p-0 transition-transform ${interactive ? "hover:scale-120 cursor-pointer pointer-events-auto" : "pointer-events-none"}`}
              title={
                interactive ? `Rate ${star} out of 5 stars` : `${rating} stars`
              }
            >
              <Star
                size={size}
                className={`${
                  isFilled
                    ? "fill-amber-400 text-amber-400"
                    : isHalf
                      ? "fill-amber-400/50 text-amber-400"
                      : "text-slate-200 fill-transparent"
                }`}
              />
            </button>
          );
        })}
      </div>

      {/* Numeric text rating, e.g. 4.8 (12 votes) */}
      <span className="text-[10px] font-extrabold text-slate-650 ml-1">
        {rating.toFixed(1)}
        {count !== undefined && (
          <span className="text-slate-400 font-normal ml-0.5">({count})</span>
        )}
      </span>
    </div>
  );
}
