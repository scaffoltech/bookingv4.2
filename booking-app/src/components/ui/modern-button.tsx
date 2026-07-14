import * as React from "react"
import { Button } from "./button"

// ponytail: compatibility wrapper over the design-system Button — migrate
// consumers to Button directly file-by-file, then delete this file.
interface ModernButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
  variant?: "primary" | "secondary" | "outline" | "ghost" | "destructive"
  size?: "sm" | "md" | "lg"
}

const variantMap = {
  primary: "default",
  secondary: "outline",
  outline: "outline",
  ghost: "ghost",
  destructive: "destructive",
} as const

const sizeMap = { sm: "sm", md: "default", lg: "lg" } as const

const ModernButton = React.forwardRef<HTMLButtonElement, ModernButtonProps>(
  ({ variant = "primary", size = "md", ...props }, ref) => (
    <Button ref={ref} variant={variantMap[variant]} size={sizeMap[size]} {...props} />
  )
)
ModernButton.displayName = "ModernButton"

export { ModernButton }
