import * as React from "react";

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "success" | "warning" | "destructive";
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className = "", variant = "default", ...props }, ref) => {
    const variantStyles = {
      default: "bg-primary text-primary-foreground",
      success: "bg-green-500 text-white",
      warning: "bg-yellow-500 text-white",
      destructive: "bg-red-500 text-white",
    };

    return (
      <div
        ref={ref}
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors ${variantStyles[variant]} ${className}`}
        {...props}
      />
    );
  }
);
Badge.displayName = "Badge";

export { Badge };
