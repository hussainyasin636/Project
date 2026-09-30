import { SignUp } from "@clerk/nextjs"
import { AuthLayout } from "@/components/auth/auth-layout"

export default function SignUpPage() {
  return (
    <AuthLayout
      heading="Create your account"
      subheading="Start designing system architecture in seconds."
      footerText="Already have an account?"
      footerLinkText="Sign in"
      footerLinkHref="/sign-in"
    >
      <SignUp />
    </AuthLayout>
  )
}
