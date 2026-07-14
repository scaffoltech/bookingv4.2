import * as React from "react"
import { cn } from "@/lib/utils"
import { Card } from "./card"

// ponytail: compatibility wrapper over the design-system Card — migrate
// consumers to Card/CardHeader/CardContent directly, then delete this file.
const variantExtras = {
  default: "",
  elevated: "shadow-lg hover:shadow-xl transition-shadow duration-300",
  outline: "border-2 bg-transparent dark:bg-transparent hover:bg-gray-50 dark:hover:bg-gray-900/50 shadow-none",
  ghost: "bg-gray-50 dark:bg-gray-800/50 border-0 shadow-none hover:bg-gray-100 dark:hover:bg-gray-800",
} as const

const ModernCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    variant?: keyof typeof variantExtras
  }
>(({ className, variant = "default", ...props }, ref) => (
  <Card
    ref={ref}
    className={cn(
      "p-6 dark:bg-gray-900 dark:border-gray-800 dark:text-gray-100",
      variantExtras[variant],
      className
    )}
    {...props}
  />
))
ModernCard.displayName = "ModernCard"

const ModernCardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex flex-col space-y-2 mb-4", className)} {...props} />
))
ModernCardHeader.displayName = "ModernCardHeader"

const ModernCardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-xl font-semibold text-gray-900 dark:text-gray-100 leading-tight",
      className
    )}
    {...props}
  />
))
ModernCardTitle.displayName = "ModernCardTitle"

const ModernCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("text-gray-600 dark:text-gray-300", className)} {...props} />
))
ModernCardContent.displayName = "ModernCardContent"

export { ModernCard, ModernCardHeader, ModernCardTitle, ModernCardContent }
