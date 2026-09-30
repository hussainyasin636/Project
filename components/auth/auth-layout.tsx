import Link from "next/link"
import { Sparkles, Users, Cpu, FileText } from "lucide-react"

const features = [
  {
    icon: Sparkles,
    title: "Natural Language Input",
    description: "Describe your system in plain English",
  },
  {
    icon: Cpu,
    title: "AI Architecture",
    description: "Diagrams generated in seconds",
  },
  {
    icon: Users,
    title: "Real-time Collaboration",
    description: "Design together with your team",
  },
  {
    icon: FileText,
    title: "Export Ready",
    description: "One-click Markdown tech spec",
  },
]

interface AuthLayoutProps {
  children: React.ReactNode
  heading: string
  subheading: string
  footerText: string
  footerLinkText: string
  footerLinkHref: string
}

export function AuthLayout({
  children,
  heading,
  subheading,
  footerText,
  footerLinkText,
  footerLinkHref,
}: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen bg-bg-base">
      {/* ── Left panel — branding (hidden below lg) ── */}
      <div className="relative hidden flex-1 overflow-hidden lg:flex">
        {/* Radial glow */}
        <div
          className="pointer-events-none absolute -left-32 top-1/2 h-[600px] w-[600px] -translate-y-1/2 rounded-full opacity-30 blur-[128px]"
          style={{ background: "var(--accent-primary)" }}
        />
        <div
          className="pointer-events-none absolute bottom-16 right-16 h-[300px] w-[300px] rounded-full opacity-15 blur-[96px]"
          style={{ background: "var(--accent-ai)" }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-1 flex-col justify-between px-14 py-12">
          {/* Top — brand */}
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg"
              style={{ background: "var(--accent-primary-dim)" }}
            >
              <Sparkles className="h-4 w-4" style={{ color: "var(--accent-primary)" }} />
            </div>
            <span className="text-lg font-semibold tracking-tight text-text-primary">
              Ghost AI
            </span>
          </div>

          {/* Center — headline + features */}
          <div className="max-w-lg">
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-text-primary">
              Design systems
              <br />
              <span style={{ color: "var(--accent-primary)" }}>at the speed of thought.</span>
            </h1>
            <p className="mt-4 text-base leading-relaxed text-text-secondary">
              Describe what you need. Ghost AI turns your words into production-ready architecture diagrams — collaboratively, in real time.
            </p>

            {/* Feature grid */}
            <div className="mt-10 grid grid-cols-2 gap-4">
              {features.map((f) => (
                <div
                  key={f.title}
                  className="rounded-xl border border-border-default bg-bg-surface/60 px-4 py-4 backdrop-blur-sm transition-colors hover:border-border-subtle"
                >
                  <f.icon
                    className="mb-2 h-5 w-5"
                    style={{ color: "var(--accent-primary)" }}
                  />
                  <p className="text-sm font-medium text-text-primary">{f.title}</p>
                  <p className="mt-0.5 text-xs text-text-muted">{f.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom — subtle footer */}
          <p className="text-xs text-text-faint">
            © {new Date().getFullYear()} Ghost AI — Collaborative system design.
          </p>
        </div>
      </div>

      {/* ── Right panel — authentication ── */}
      <div className="flex w-full flex-col items-center justify-center bg-bg-surface px-8 py-12 lg:max-w-[600px] lg:basis-2/5 lg:border-l lg:border-border-default">
        {/* Mobile-only brand header */}
        <div className="mb-8 flex flex-col items-center lg:hidden">
          <div
            className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ background: "var(--accent-primary-dim)" }}
          >
            <Sparkles className="h-5 w-5" style={{ color: "var(--accent-primary)" }} />
          </div>
          <span className="text-lg font-semibold tracking-tight text-text-primary">
            Ghost AI
          </span>
        </div>

        {/* Heading */}
        <div className="mb-6 w-full max-w-sm text-center">
          <h2 className="text-2xl font-semibold tracking-tight text-text-primary">
            {heading}
          </h2>
          <p className="mt-1.5 text-sm text-text-muted">{subheading}</p>
        </div>

        {/* Clerk component */}
        <div className="w-full max-w-sm">{children}</div>

        {/* Footer link */}
        <p className="mt-8 text-sm text-text-muted">
          {footerText}{" "}
          <Link
            href={footerLinkHref}
            className="font-medium text-text-secondary underline-offset-4 transition-colors hover:text-text-primary hover:underline"
          >
            {footerLinkText}
          </Link>
        </p>
      </div>
    </div>
  )
}
