import Icon from "../Icon";

export default function StarRating({
  grade,
  score,
  size = "text-xs",
  onChange = null,
}) {
  let filled = 0;

  if (grade) {
    if (typeof grade === "string") {
      if (grade.includes("★") || grade.includes("☆")) {
        filled = (grade.match(/★/g) || []).length;
      } else if (["5", "4", "3", "2", "1"].includes(grade)) {
        const starsMap = {
          "5": 5,
          "4": 4,
          "3": 3,
          "2": 2,
          "1": 1,
        };
        filled = starsMap[grade] || 0;
      } else if (!isNaN(grade)) {
        filled = Math.min(5, Math.max(0, parseInt(grade)));
      }
    } else if (typeof grade === "number") {
      filled = Math.min(5, Math.max(0, grade));
    }
  }

  return (
    <div className="flex items-center gap-0.5 whitespace-nowrap">
      {[1, 2, 3, 4, 5].map((star) =>
        onChange ? (
          <button
            key={star}
            type="button"
            onClick={(event) => {
              event.preventDefault();
              onChange(star);
            }}
            className="cursor-pointer hover:scale-110 transition-transform"
          >
            <span
              className={`text-base ${
                star <= filled ? "text-yellow-500" : "text-gray-300"
              }`}
            >
              {star <= filled ? "★" : "☆"}
            </span>
          </button>
        ) : (
          <span
            key={star}
            className={`text-base ${
              star <= filled ? "text-yellow-500" : "text-gray-300"
            }`}
          >
            {star <= filled ? "★" : "☆"}
          </span>
        )
      )}

      {/* {score != null && (
        <span className="text-gray-500 text-xs ml-1">
          ({score})
        </span>
      )} */}
    </div>
  );
}