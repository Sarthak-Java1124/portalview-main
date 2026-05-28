"use client";

import { type ButtonHTMLAttributes, forwardRef } from "react";
import { Spinner } from "./Spinner";

type ButtonVariant = "primary" | "ghost" | "danger" | "dark";
type ButtonSize = "sm" | "md" | "lg" | "icon";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "ghost", size = "md", loading = false, disabled, children, className = "", ...rest }, ref) => {
    const isDisabled = disabled || loading;
    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={["btn", `btn-${variant}`, `btn-${size}`, className].join(" ")}
        {...rest}
      >
        {loading && <Spinner size="sm" />}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
