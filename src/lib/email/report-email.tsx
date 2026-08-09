import { Button, Hr, Link, Section, Text } from "@react-email/components";
import { render } from "@react-email/render";

import type { ReportIssue } from "@/lib/scoring/fixes";
import type { ScanGrade } from "@/lib/types/database";

import { BRAND, EmailShell } from "./brand";

const GRADE_VERDICT: Record<ScanGrade, string> = {
  A: "Excellent — you're ahead of most Indian businesses",
  B: "Good — a few fixes will push you to the top",
  C: "Needs work — high-impact fixes available",
  D: "Critical — your site is nearly invisible to AI",
  F: "Critical — your site is nearly invisible to AI",
};

const CONSULT_URL = "https://cal.com";
const SERVICES_URL = "https://kliviq.com/#services";

export interface ReportEmailProps {
  name: string;
  businessName: string;
  score: number;
  grade: ScanGrade;
  issues: ReportIssue[];
  reportUrl: string;
}

export function ReportEmail({
  name,
  businessName,
  score,
  grade,
  issues,
  reportUrl,
}: ReportEmailProps) {
  return (
    <EmailShell previewText={`Your Seenzo AI Visibility Score is ${score} (Grade ${grade})`}>
      <Section style={{ backgroundColor: BRAND.mint, padding: "40px 24px", textAlign: "center" }}>
        <Text
          style={{
            margin: "0 0 8px",
            fontSize: "64px",
            fontWeight: 800,
            color: BRAND.slate,
            lineHeight: 1,
          }}
        >
          {score}
        </Text>
        <Text
          style={{
            display: "inline-block",
            margin: "0 0 12px",
            padding: "4px 14px",
            borderRadius: "999px",
            backgroundColor: BRAND.amber,
            color: BRAND.slate,
            fontSize: "14px",
            fontWeight: 700,
          }}
        >
          Grade {grade}
        </Text>
        <Text style={{ margin: 0, fontSize: "15px", fontWeight: 600, color: "#334155" }}>
          {GRADE_VERDICT[grade]}
        </Text>
      </Section>

      <Section style={{ padding: "32px 24px" }}>
        <Text
          style={{ margin: "0 0 16px", fontSize: "15px", lineHeight: "22px", color: "#334155" }}
        >
          Hi {name}, your AI Visibility scan for {businessName} is complete. Here&apos;s what we
          found:
        </Text>

        <Text style={{ margin: "0 0 8px", fontSize: "15px", fontWeight: 700, color: BRAND.slate }}>
          Your top {issues.length} issues:
        </Text>
        {issues.map((issue, i) => (
          <Text
            key={issue.title}
            style={{ margin: "0 0 10px", fontSize: "14px", lineHeight: "20px", color: "#334155" }}
          >
            <span style={{ fontWeight: 700, color: BRAND.slate }}>
              {i + 1}. {issue.title}
            </span>{" "}
            — {issue.evidence}
          </Text>
        ))}

        <Section style={{ margin: "28px 0 0", textAlign: "center" }}>
          <Button
            href={reportUrl}
            style={{
              backgroundColor: BRAND.amber,
              color: "#000000",
              padding: "14px 26px",
              borderRadius: "8px",
              fontSize: "15px",
              fontWeight: 700,
              textDecoration: "none",
              display: "inline-block",
              margin: "0 8px 12px",
            }}
          >
            View full report →
          </Button>
          <Button
            href={CONSULT_URL}
            style={{
              backgroundColor: BRAND.white,
              color: BRAND.emerald,
              border: `2px solid ${BRAND.emerald}`,
              padding: "12px 24px",
              borderRadius: "8px",
              fontSize: "15px",
              fontWeight: 700,
              textDecoration: "none",
              display: "inline-block",
              margin: "0 8px 12px",
            }}
          >
            Book free consultation
          </Button>
        </Section>
      </Section>

      <Hr style={{ borderColor: "#e2e8f0", margin: "0 24px" }} />

      <Section style={{ padding: "24px", textAlign: "center" }}>
        <Text style={{ margin: "0 0 12px", fontSize: "13px", fontWeight: 700, color: BRAND.slate }}>
          Explore KlivIQ:
        </Text>
        {["AI Consulting", "WhatsApp Chatbots", "QA Automation"].map((label) => (
          <Link
            key={label}
            href={SERVICES_URL}
            style={{
              display: "inline-block",
              margin: "0 4px 8px",
              padding: "6px 14px",
              borderRadius: "999px",
              backgroundColor: BRAND.mint,
              color: BRAND.emerald,
              fontSize: "12px",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            {label}
          </Link>
        ))}
      </Section>
    </EmailShell>
  );
}

export function renderReportEmail(props: ReportEmailProps): Promise<string> {
  return render(<ReportEmail {...props} />);
}
