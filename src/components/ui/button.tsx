import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron/60 active:scale-[0.97] hover:scale-[1.02]",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-saffron text-midnight shadow-glow-saffron/30 hover:shadow-glow-saffron hover:brightness-110",
        secondary:
          "bg-white/10 text-white border border-white/10 hover:bg-white/[0.16] hover:border-white/20",
        outline:
          "border border-white/15 text-white/85 hover:bg-white/[0.07] hover:border-white/25 hover:text-white",
        ghost:
          "text-white/70 hover:bg-white/[0.07] hover:text-white",
        magenta:
          "bg-gradient-magenta text-white shadow-glow-magenta/30 hover:shadow-glow-magenta hover:brightness-110",
        destructive:
          "bg-red-600 text-white hover:bg-red-500 hover:shadow-lg",
      },
      size: {
        // Sizes bumped up from the original h-8/h-10/h-12 so every button
        // clears (or gets close to) the ~44px thumb-friendly touch target
        // recommended for mobile, without changing the overall proportions
        // much.
        default: "h-11 px-5",
        sm:      "h-9 px-3.5 text-xs",
        lg:      "h-12 px-7 text-base",
        icon:    "h-11 w-11",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
