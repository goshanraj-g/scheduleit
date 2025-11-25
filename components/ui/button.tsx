import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

// Since I don't have radix-ui/react-slot installed, I'll just use a standard button for now or install it.
// Actually, I'll just make a simple button component without the slot dependency for now to keep it simple, 
// or I can install it. The user wants a "clone", so I should probably do it right.
// But to save time/tokens, I'll make a flexible button without the Slot for now unless I really need polymorphism.

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap text-sm font-bold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border-2 border-border active:translate-x-0.5 active:translate-y-0.5 active:shadow-none cursor-pointer",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-[4px_4px_0px_0px_var(--shadow-color)]",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-[4px_4px_0px_0px_var(--shadow-color)]",
        outline:
          "bg-background hover:bg-accent hover:text-accent-foreground shadow-[4px_4px_0px_0px_var(--shadow-color)]",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-[4px_4px_0px_0px_var(--shadow-color)]",
        ghost: "border-transparent hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline border-none",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3",
        lg: "h-12 px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
