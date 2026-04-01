import React from "react";

/**
 * LoadingSpinner Component
 * Displays a centered loading spinner
 *
 * @param {Object} props - Component props
 * @param {string} props.size - Size of the spinner (sm, md, lg)
 * @param {string} props.color - Color of the spinner (primary, secondary, etc.)
 * @param {string} props.message - Optional message to display below spinner
 */
const LoadingSpinner = ({
  size = "md",
  color = "primary",
  message = "Đang tải...",
}) => {
  const spinnerSize = {
    sm: "",
    md: "spinner-border-md",
    lg: "spinner-border-lg",
  };

  return (
    <div className="d-flex flex-column justify-content-center align-items-center py-5">
      <div
        className={`spinner-border text-${color} ${spinnerSize[size]}`}
        role="status"
      >
        <span className="visually-hidden">Đang tải...</span>
      </div>
      {message && <p className="mt-3 text-center">{message}</p>}
    </div>
  );
};

export default LoadingSpinner;
