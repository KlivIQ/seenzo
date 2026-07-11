import {
  Body,
  Column,
  Container,
  Head,
  Hr,
  Html,
  Link,
  Row,
  Section,
  Text,
} from "@react-email/components";
import type { ReactNode } from "react";

export const BRAND = {
  emerald: "#10b981",
  amber: "#f59e0b",
  slate: "#0f172a",
  mint: "#ecfdf5",
  white: "#ffffff",
} as const;

const UNSUBSCRIBE_URL = "mailto:reports@seenzo.in?subject=UNSUBSCRIBE";

export function EmailShell({
  previewText,
  children,
}: {
  previewText: string;
  children: ReactNode;
}) {
  return (
    <Html lang="en">
      <Head />
      <Body
        style={{
          margin: 0,
          padding: 0,
          backgroundColor: "#f1f5f9",
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        }}
      >
        <span
          style={{
            display: "none",
            overflow: "hidden",
            lineHeight: "1px",
            opacity: 0,
            maxHeight: 0,
            maxWidth: 0,
          }}
        >
          {previewText}
        </span>
        <Container style={{ maxWidth: "600px", margin: "0 auto", backgroundColor: BRAND.white }}>
          <EmailHeader />
          {children}
          <EmailFooter />
        </Container>
      </Body>
    </Html>
  );
}

function EmailHeader() {
  return (
    <Section
      style={{
        backgroundColor: BRAND.white,
        borderTop: `4px solid ${BRAND.emerald}`,
        padding: "20px 24px",
      }}
    >
      <Text style={{ margin: 0, fontSize: "20px", fontWeight: 800 }}>
        <span style={{ color: BRAND.emerald }}>seenzo</span>{" "}
        <span style={{ color: "#6b7280", fontSize: "13px", fontWeight: 500 }}>by KlivIQ</span>
      </Text>
    </Section>
  );
}

function EmailFooter() {
  return (
    <Section style={{ backgroundColor: BRAND.slate, padding: "28px 24px" }}>
      <Text style={{ margin: "0 0 12px", color: BRAND.white, fontSize: "13px", fontWeight: 600 }}>
        Seenzo by KlivIQ · seenzo.in
      </Text>
      <Row>
        <Column>
          <Link
            href="https://kliviq.com/#products"
            style={{ color: "#cbd5e1", fontSize: "12px", marginRight: "12px" }}
          >
            Our Products
          </Link>
          <Link
            href="https://kliviq.com/#services"
            style={{ color: "#cbd5e1", fontSize: "12px", marginRight: "12px" }}
          >
            Our Services
          </Link>
          <Link
            href="https://www.seenzo.in/#contact"
            style={{ color: "#cbd5e1", fontSize: "12px" }}
          >
            Contact Us
          </Link>
        </Column>
      </Row>
      <Hr style={{ borderColor: "#334155", margin: "16px 0" }} />
      <Text style={{ margin: "0 0 4px", color: "#94a3b8", fontSize: "11px" }}>
        © KlivIQ Technologies OPC Private Limited, Chennai
      </Text>
      <Link
        href={UNSUBSCRIBE_URL}
        style={{ color: "#94a3b8", fontSize: "11px", textDecoration: "underline" }}
      >
        Unsubscribe
      </Link>
    </Section>
  );
}
