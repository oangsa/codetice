"use client";

import * as React from "react";

import {
  Button as ShadcnButton,
  type ButtonProps as ShadcnButtonProps,
} from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

function getButtonText(children: React.ReactNode): string | undefined {
  const text = React.Children.toArray(children)
    .map((child) => {
      if (typeof child === "string" || typeof child === "number") return String(child);
      if (React.isValidElement<{ children?: React.ReactNode }>(child)) {
        return getButtonText(child.props.children) ?? "";
      }
      return "";
    })
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  return text || undefined;
}

export interface ButtonProps extends ShadcnButtonProps {
  tooltip?: React.ReactNode;
  disableTooltip?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ tooltip, disableTooltip = false, title, children, size, "aria-label": ariaLabel, ...props }, ref) => {
    const fallbackText = title ?? ariaLabel ?? getButtonText(children);
    const tooltipText = typeof tooltip === "string" ? tooltip : getButtonText(tooltip);
    const accessibleLabel = ariaLabel ?? tooltipText ?? fallbackText;
    const tooltipContent = disableTooltip ? undefined : tooltip ?? fallbackText;
    const button = (
      <ShadcnButton
        ref={ref}
        size={size}
        aria-label={ariaLabel ?? (size === "icon" ? accessibleLabel : undefined)}
        {...props}
      >
        {children}
      </ShadcnButton>
    );

    if (!tooltipContent) return button;

    return (
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent>{tooltipContent}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  },
);
Button.displayName = "Button";

export { Button, getButtonText };
