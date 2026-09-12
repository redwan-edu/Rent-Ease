import { auth } from "@clerk/nextjs/server";
import {
  ArrowRight,
  Bell,
  Building2,
  IdCard,
  NotebookPen,
  ShieldCheck,
  Smartphone,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { Avatar, Logo } from "@/components/ui";

const features = [
  {
    Icon: Wallet,
    title: "Collected vs. left, at a glance",
    text: "See this month's rent in one number. Record payments with a press-and-hold, no mistakes.",
  },
  {
    Icon: IdCard,
    title: "Tenants & their families",
    text: "Photos, phone numbers, NID scans and move-in condition — everything in one profile.",
  },
  {
    Icon: Building2,
    title: "Properties & units",
    text: "Villas, houses and flats with named units, so you always know who lives where.",
  },
  {
    Icon: NotebookPen,
    title: "Notes & reminders",
    text: "“Tenant wants the tap fixed.” Write it down, link it to a tenant, tick it off.",
  },
  {
    Icon: Bell,
    title: "Reminders that reach you",
    text: "Set a reminder and get a notification on your phone exactly when it's due.",
  },
  {
    Icon: ShieldCheck,
    title: "Team access",
    text: "Invite a manager or family member by email with full, edit or read-only access.",
  },
];

export default async function Landing() {
  const { userId } = await auth();
  const signedIn = !!userId;

  return (
    <div className="landing">
      <header className="landing-nav">
        <Link href="/" className="brand">
          <Logo size={32} />
          <span>Rent Ease</span>
        </Link>
        {signedIn ? (
          <Link href="/app" className="btn btn-primary btn-sm">
            Open app
          </Link>
        ) : (
          <div style={{ display: "flex", gap: 6 }}>
            <Link href="/sign-in" className="btn btn-ghost btn-sm">
              Sign in
            </Link>
            <Link href="/sign-up" className="btn btn-primary btn-sm">
              Get started
            </Link>
          </div>
        )}
      </header>

      <section className="landing-hero">
        <div className="landing-copy">
          <span className="landing-kicker">
            <Smartphone size={13} /> Made for your phone
          </span>
          <h1>
            Know who paid.
            <br />
            Know what&apos;s left.
          </h1>
          <p>
            Rent Ease keeps your tenants, units, payments and follow-ups in one calm place — the simplest
            way to manage rent.
          </p>
          <div className="landing-cta">
            {signedIn ? (
              <Link href="/app" className="btn btn-primary">
                Open Rent Ease <ArrowRight size={17} />
              </Link>
            ) : (
              <>
                <Link href="/sign-up" className="btn btn-primary">
                  Start free <ArrowRight size={17} />
                </Link>
                <Link href="/sign-in" className="btn btn-secondary">
                  I have an account
                </Link>
              </>
            )}
          </div>
        </div>

        <div className="landing-preview" aria-hidden>
          <div className="hero">
            <div className="hero-top">
              <span className="hero-label">Collected</span>
              <span className="hero-pill">70%</span>
            </div>
            <div className="hero-amount">৳84,500</div>
            <div className="hero-sub">of ৳120,000 expected</div>
            <div className="bar">
              <span style={{ width: "70%", transform: "none" }} />
            </div>
            <div className="hero-split">
              <div>
                <span className="hero-label">Left to collect</span>
                <strong className="amber">৳35,500</strong>
              </div>
              <div>
                <span className="hero-label">Paid in full</span>
                <strong>6 / 9</strong>
              </div>
            </div>
          </div>
          <div className="card list">
            {[
              { name: "Ayesha Rahman", place: "Lakeview Villa · Flat 2B", amount: "৳15,000" },
              { name: "Tanvir Hasan", place: "Green House · Unit 1", amount: "৳12,500" },
            ].map((t) => (
              <div className="row" key={t.name}>
                <Avatar name={t.name} size={40} />
                <div className="row-main">
                  <div className="row-title">{t.name}</div>
                  <div className="row-sub">{t.place}</div>
                </div>
                <span className="row-amount">{t.amount}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-features">
        {features.map(({ Icon, title, text }) => (
          <div className="feature" key={title}>
            <span className="feature-icon">
              <Icon size={19} />
            </span>
            <h3>{title}</h3>
            <p>{text}</p>
          </div>
        ))}
      </section>

      <footer className="landing-foot">© {new Date().getFullYear()} Rent Ease · The simplest rent manager</footer>
    </div>
  );
}
