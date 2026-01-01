import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function VerifyEmailPage() {
  return (
    <Card className="border-primary/30 bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-center glow-text">Verify Your Email</CardTitle>
      </CardHeader>

      <CardContent className="space-y-6 text-center">
        <p className="text-muted-foreground">
          We've sent a verification link to your email address. Please check your inbox and click the link to activate
          your account.
        </p>

        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Didn't receive the email? Check your spam folder.</p>
          <Link href="/login">
            <Button className="w-full bg-primary hover:bg-primary/90">Return to Login</Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
