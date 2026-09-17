import { auth } from "@clerk/nextjs/server";
import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import InstallAppButton from "@/components/InstallAppButton";
import { Avatar, Logo } from "@/components/ui";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: SITE_TITLE },
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: { url: "/", title: SITE_TITLE, description: SITE_DESCRIPTION },
};

const steps = [
  {
    title: "Add your property",
    text: "Name the building or home you rent out and list its flats or rooms.",
  },
  {
    title: "Add your tenants",
    text: "Phone number, monthly rent and the unit they live in. Photos and ID scans are optional.",
  },
  {
    title: "Record rent as it comes in",
    text: "Tap Collect and hold to confirm. Home shows who paid and who still owes this month.",
  },
];

const features = [
  {
    title: "Collected and left, at a glance",
    text: "One screen shows this month's rent collected, what's left and every tenant who still owes.",
  },
  {
    title: "Past dues never get lost",
    text: "Rent still owed from earlier months stays listed, month by month, until it's paid.",
  },
  {
    title: "Every tenant in one place",
    text: "Phone number, rent, family members, ID scans and the condition of the home at move-in.",
  },
  {
    title: "Reminders on your phone",
    text: "Write a note like “fix the kitchen tap” and get a notification when it's time.",
  },
  {
    title: "Share with your team",
    text: "Add a manager or family member by email, with full, edit or read-only access.",
  },
  {
    title: "Records kept as proof",
    text: "Tenants who move out or get deleted keep their full payment history in the archive.",
  },
];

const faqs = [
  {
    q: "What is Rent Ease?",
    a: "Rent Ease is a simple rent management app for landlords. It tracks rent collection, tenants, properties and units, so you always know who has paid and what is still due.",
  },
  {
    q: "Does it work on my phone?",
    a: "Yes. Rent Ease is built for phones first and also works on tablets and computers. You can add it to your home screen and get reminder notifications.",
  },
  {
    q: "How do I track rent that wasn't paid in earlier months?",
    a: "Past dues lists every tenant who still owes from previous months, with the amount for each month. You can record a payment for any of those months directly.",
  },
  {
    q: "Which currencies can I use?",
    a: "You can choose Bangladeshi taka (৳), US dollar ($), euro (€), British pound (£), Indian rupee (₹), UAE dirham (AED), Saudi riyal (SAR) or yen (¥).",
  },
  {
    q: "Can a family member or manager help me?",
    a: "Yes. Invite people by email and give them full, edit or read-only access. You can also limit them to specific properties.",
  },
  {
    q: "What happens to records when a tenant moves out?",
    a: "Moving a tenant out keeps them as a former tenant with every payment, document and note. Deleting a tenant moves the complete record to the archive, where it can be restored.",
  },
];

// Structured data for search engines: the app itself, and the FAQ above.
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      description: SITE_DESCRIPTION,
      inLanguage: "en",
    },
    {
      "@type": "WebApplication",
      "@id": `${SITE_URL}/#app`,
      name: SITE_NAME,
      url: SITE_URL,
      description: SITE_DESCRIPTION,
      applicationCategory: "BusinessApplication",
      applicationSubCategory: "Rent management",
      operatingSystem: "Web, Android, iOS",
      browserRequirements: "Requires a modern web browser",
      image: `${SITE_URL}/opengraph-image`,
      featureList: features.map((f) => f.title),
    },
    {
      "@type": "FAQPage",
      "@id": `${SITE_URL}/#faq`,
      mainEntity: faqs.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ],
};

export default async function Landing() {
  const { userId } = await auth();
  const signedIn = !!userId;
  const primary = signedIn
    ? { href: "/app", label: "Open app" }
    : { href: "/sign-up", label: "Get started" };

  return (
    <div className="landing">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />

      <header className="landing-nav">
        <Link href="/" className="brand" aria-label="Rent Ease home">
          <Logo size={30} />
          <span>Rent Ease</span>
        </Link>
        <nav className="landing-nav-actions" aria-label="Account">
          <InstallAppButton />
          {/* {!signedIn && (
            <Link href="/sign-in" className="btn btn-ghost btn-sm">
              Sign in
            </Link>
          )} */}
          <Link href={primary.href} className="btn btn-primary btn-sm">
            {primary.label}
          </Link>
        </nav>
      </header>

      <main>
        <section className="landing-hero" aria-labelledby="hero-title">
          <div className="landing-copy">
            <h1 id="hero-title">Rent tracking for landlords, made simple.</h1>
            <p>
              See who paid and what&apos;s left this month. Rent Ease keeps
              tenants, properties and payments on your phone.
            </p>
            <div className="landing-cta">
              <Link href={primary.href} className="btn btn-primary">
                {primary.label} <ArrowRight size={17} />
              </Link>
              {!signedIn && (
                <Link href="/sign-in" className="btn btn-ghost">
                  Sign in
                </Link>
              )}
            </div>
          </div>

          {/* A real Home screen in miniature, built from the app's own components. */}
          <div className="landing-preview" aria-hidden>
            <div className="card summary">
              <span className="summary-label">Collected</span>
              <div className="summary-amount">৳84,500</div>
              <div className="summary-sub">of ৳120,000 expected</div>
              <div className="meter">
                <span style={{ width: "70%" }} />
              </div>
              <div className="summary-foot">
                <div>
                  <span>Left to collect</span>
                  <strong className="warn">৳35,500</strong>
                </div>
                <div>
                  <span>Paid in full</span>
                  <strong>6 of 9</strong>
                </div>
              </div>
            </div>
            <div className="card list">
              {[
                {
                  name: "Ayesha Rahman",
                  place: "Lakeview Villa · Flat 2B",
                  amount: "৳15,000",
                },
                {
                  name: "Tanvir Hasan",
                  place: "Green House · Unit 1",
                  amount: "৳12,500",
                },
              ].map((t) => (
                <div className="row" key={t.name}>
                  <Avatar name={t.name} />
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

        <section className="landing-section" aria-labelledby="how-title">
          <h2 id="how-title">How Rent Ease works</h2>
          <p className="landing-intro">
            Set up once in a few minutes. After that, each month takes a few
            taps.
          </p>
          <ol className="landing-steps">
            {steps.map((s) => (
              <li key={s.title}>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="landing-section" aria-labelledby="features-title">
          <h2 id="features-title">Everything a small landlord needs</h2>
          <p className="landing-intro">
            No spreadsheets or notebooks. Rent, tenants and follow-ups stay
            together and up to date.
          </p>
          <div className="landing-points">
            {features.map((f) => (
              <div className="point" key={f.title}>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="landing-section" aria-labelledby="faq-title">
          <h2 id="faq-title">Questions landlords ask</h2>
          <div className="faq">
            {faqs.map((f) => (
              <details key={f.q}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section
          className="landing-section landing-final"
          aria-labelledby="final-title"
        >
          <h2 id="final-title">Know where your rent stands, every month.</h2>
          <div className="landing-cta">
            <Link href={primary.href} className="btn btn-primary">
              {primary.label} <ArrowRight size={17} />
            </Link>
          </div>
        </section>
      </main>

      <footer className="landing-foot">
        <span>© {new Date().getFullYear()} Rent Ease</span>
        <nav aria-label="Footer">
          {!signedIn && <Link href="/sign-in">Sign in</Link>}
          <Link href={primary.href}>{primary.label}</Link>
        </nav>
      </footer>
      <div id="sheet-root" />
    </div>
  );
}
