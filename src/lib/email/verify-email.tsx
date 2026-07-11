import { Button, Section, Text } from "@react-email/components";
import { render } from "@react-email/render";

import { BRAND, EmailShell } from "./brand";

export interface VerifyEmailProps {
  name: string;
  websiteUrl: string;
  verifyUrl: string;
}

export function VerifyEmail({ name, websiteUrl, verifyUrl }: VerifyEmailProps) {
  return (
    <EmailShell previewText="Confirm your email to start your free Seenzo AI Visibility scan">
      <Section style={{ backgroundColor: BRAND.mint, padding: "40px 24px", textAlign: "center" }}>
        <Text style={{ margin: "0 0 12px", fontSize: "44px", lineHeight: 1 }}>🔍</Text>
        <Text style={{ margin: "0 0 12px", fontSize: "24px", fontWeight: 800, color: BRAND.slate }}>
          One click to see your AI score
        </Text>
        <Text
          style={{
            margin: "0 auto",
            maxWidth: "440px",
            fontSize: "15px",
            lineHeight: "22px",
            color: "#334155",
          }}
        >
          Hi {name}, your free Seenzo scan is queued. Confirm your email and we&apos;ll start
          scanning {websiteUrl} immediately.
        </Text>
      </Section>

      <Section style={{ padding: "32px 24px", textAlign: "center" }}>
        <Button
          href={verifyUrl}
          style={{
            backgroundColor: BRAND.amber,
            color: "#000000",
            padding: "16px 32px",
            borderRadius: "8px",
            fontSize: "16px",
            fontWeight: 700,
            textDecoration: "none",
            display: "inline-block",
          }}
        >
          Confirm my scan →
        </Button>

        <Text style={{ margin: "24px 0 4px", fontSize: "13px", color: "#64748b" }}>
          Or paste this link: {verifyUrl}
        </Text>
        <Text style={{ margin: 0, fontSize: "13px", color: "#64748b" }}>
          This link expires in 48 hours.
        </Text>
      </Section>
    </EmailShell>
  );
}

export function renderVerifyEmail(props: VerifyEmailProps): Promise<string> {
  return render(<VerifyEmail {...props} />);
}
