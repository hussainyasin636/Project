import { SignIn } from "@clerk/nextjs"
import { AuthLayout } from "@/components/auth/auth-layout"

export default function SignInPage() {
  return (
    <AuthLayout
      heading="Welcome back"
      subheading="Sign in to continue designing with your team."
      footerText="Don't have an account?"
      footerLinkText="Create one"
      footerLinkHref="/sign-up"
    >
      <SignIn />
    </AuthLayout>
  )
}
