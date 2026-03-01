import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import { format } from "date-fns";
import { cs } from "date-fns/locale";

import type {
  TechnicalAuditResult,
  TechnicalAuditCategories,
  Issue,
} from "@agency-ops/shared";
import type { ScoredIssue, ParsedRecommendations } from "@/lib/seo-utils";
import {
  CATEGORY_LABELS,
  SEVERITY_LABELS,
  AUDIT_LIMITATIONS,
} from "@/lib/seo-utils";

// ── Colors (hex from design.md) ──────────────────────────────

const C = {
  primary: "#F18B32",
  secondary: "#005A87",
  success: "#10B981",
  warning: "#F59E0B",
  error: "#EF4444",
  info: "#3B82F6",
  text: "#111827",
  textSecondary: "#4B5563",
  textMuted: "#9CA3AF",
  border: "#E2E4E8",
  surface: "#F8F9FA",
  white: "#FFFFFF",
} as const;

function getScoreColorHex(score: number): string {
  if (score >= 90) return C.success;
  if (score >= 70) return C.info;
  if (score >= 40) return C.warning;
  return C.error;
}

function getScoreLabel(score: number): string {
  if (score >= 90) return "Výborný";
  if (score >= 70) return "Dobrý";
  if (score >= 40) return "Ke zlepšení";
  return "Špatný";
}

function getSeverityColorHex(severity: string): string {
  switch (severity) {
    case "critical":
      return C.error;
    case "warning":
      return C.warning;
    case "info":
      return C.info;
    default:
      return C.textMuted;
  }
}

function getQuadrantColorHex(quadrant: string): string {
  switch (quadrant) {
    case "Quick Win":
      return C.success;
    case "Major Project":
      return C.warning;
    case "Fill-in":
      return C.info;
    case "Time Waster":
      return C.error;
    default:
      return C.textMuted;
  }
}

// ── Styles ───────────────────────────────────────────────────

const s = StyleSheet.create({
  page: {
    fontFamily: "Poppins",
    fontSize: 10,
    color: C.text,
    paddingTop: 50,
    paddingBottom: 60,
    paddingHorizontal: 40,
  },
  // Title page
  topBar: { backgroundColor: C.secondary, height: 8, marginBottom: 30 },
  brandName: {
    fontSize: 24,
    fontWeight: 600,
    color: C.secondary,
    marginBottom: 4,
  },
  reportTitle: {
    fontSize: 18,
    fontWeight: 500,
    color: C.text,
    marginBottom: 16,
  },
  metaRow: {
    flexDirection: "row",
    gap: 20,
    marginBottom: 6,
    fontSize: 10,
    color: C.textSecondary,
  },
  accentLine: {
    backgroundColor: C.primary,
    height: 3,
    marginVertical: 24,
  },
  overallScoreWrap: { alignItems: "center", marginVertical: 20 },
  overallScoreNumber: { fontSize: 48, fontWeight: 600 },
  overallScoreLabel: { fontSize: 14, fontWeight: 500, color: C.textSecondary },
  // Sections
  sectionTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: C.secondary,
    marginBottom: 10,
    marginTop: 24,
  },
  bodyText: { fontSize: 10, lineHeight: 1.6, color: C.textSecondary },
  // Score cards row
  scoreRow: { flexDirection: "row", gap: 10, marginVertical: 12 },
  scoreCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  scoreCardNumber: { fontSize: 24, fontWeight: 600 },
  scoreCardLabel: { fontSize: 9, color: C.textMuted, marginTop: 2 },
  // Category
  categoryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: C.surface,
    padding: 8,
    borderRadius: 4,
    marginTop: 16,
    marginBottom: 6,
  },
  categoryName: { fontSize: 12, fontWeight: 600, color: C.text },
  categoryScore: { fontSize: 12, fontWeight: 600 },
  // Issue
  issueWrap: {
    flexDirection: "row",
    marginBottom: 8,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 4,
    overflow: "hidden",
  },
  issueSeverityBar: { width: 4 },
  issueBody: { flex: 1, padding: 8 },
  issueTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 3,
  },
  issueTitle: { fontSize: 11, fontWeight: 500, flex: 1 },
  issueSeverityLabel: { fontSize: 8, fontWeight: 600, paddingHorizontal: 4 },
  issueDesc: { fontSize: 9, color: C.textSecondary, marginBottom: 4 },
  recBox: {
    backgroundColor: C.surface,
    padding: 6,
    borderRadius: 3,
    marginBottom: 4,
  },
  recText: { fontSize: 9, color: C.textSecondary },
  urlText: {
    fontFamily: "JetBrains Mono",
    fontSize: 8,
    color: C.textMuted,
  },
  // Action plan table
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: C.secondary,
    padding: 6,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  tableHeaderCell: { fontSize: 9, fontWeight: 600, color: C.white },
  tableRow: { flexDirection: "row", padding: 6, borderBottomWidth: 1, borderBottomColor: C.border },
  tableCell: { fontSize: 9, color: C.text },
  // Limitations
  limitationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.warning,
    marginTop: 3,
    marginRight: 6,
  },
  limitationRow: { flexDirection: "row", marginBottom: 6 },
  limitationText: { fontSize: 9, color: C.textSecondary, flex: 1 },
  // Footer
  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 8,
  },
  footerText: { fontSize: 8, color: C.textMuted },
});

// ── Props ────────────────────────────────────────────────────

type SeoReportPdfProps = {
  result: TechnicalAuditResult;
  clientName: string;
  domain: string;
  completedAt: string;
  scoredIssues: Record<string, ScoredIssue>;
  parsedRecommendations: ParsedRecommendations;
};

// ── Component ────────────────────────────────────────────────

export function SeoReportPdf({
  result,
  clientName,
  domain,
  completedAt,
  scoredIssues,
  parsedRecommendations,
}: SeoReportPdfProps) {
  const { summary, categories } = result;
  const formattedDate = format(new Date(completedAt), "d. MMMM yyyy", {
    locale: cs,
  });

  const scoreColor = getScoreColorHex(summary.overall_score);

  // Build sorted action plan rows
  const actionRows = Object.values(scoredIssues).sort((a, b) => {
    if (b.impact !== a.impact) return b.impact - a.impact;
    return a.effort - b.effort;
  });

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Footer — fixed on every page */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>
            Vygenerováno platformou agency_ops | MacroConsulting
          </Text>
          <Text
            style={s.footerText}
            render={({ pageNumber, totalPages }) =>
              `${pageNumber} / ${totalPages}`
            }
          />
        </View>

        {/* ── Title page ─────────────────────────────────── */}
        <View style={s.topBar} />
        <Text style={s.brandName}>MacroConsulting</Text>
        <Text style={s.reportTitle}>Technická SEO analýza</Text>
        <View style={s.metaRow}>
          <Text>Doména: {domain}</Text>
          <Text>Klient: {clientName}</Text>
          <Text>Datum: {formattedDate}</Text>
        </View>
        <View style={s.accentLine} />
        <View style={s.overallScoreWrap}>
          <Text style={[s.overallScoreNumber, { color: scoreColor }]}>
            {summary.overall_score}
          </Text>
          <Text style={s.overallScoreLabel}>
            {getScoreLabel(summary.overall_score)} — Celkové skóre
          </Text>
        </View>

        {/* ── Executive Summary ──────────────────────────── */}
        {parsedRecommendations.executiveSummary ? (
          <View>
            <Text style={s.sectionTitle}>Executive Summary</Text>
            <Text style={s.bodyText}>
              {parsedRecommendations.executiveSummary}
            </Text>
          </View>
        ) : null}

        {/* ── Score Overview ─────────────────────────────── */}
        <Text style={s.sectionTitle}>Přehled skóre</Text>
        <View style={s.scoreRow}>
          <View style={s.scoreCard}>
            <Text
              style={[
                s.scoreCardNumber,
                { color: getScoreColorHex(summary.overall_score) },
              ]}
            >
              {summary.overall_score}
            </Text>
            <Text style={s.scoreCardLabel}>Celkové /100</Text>
          </View>
          <View style={s.scoreCard}>
            <Text style={[s.scoreCardNumber, { color: C.error }]}>
              {summary.critical_count}
            </Text>
            <Text style={s.scoreCardLabel}>Kritické</Text>
          </View>
          <View style={s.scoreCard}>
            <Text style={[s.scoreCardNumber, { color: C.warning }]}>
              {summary.warning_count}
            </Text>
            <Text style={s.scoreCardLabel}>Varování</Text>
          </View>
          <View style={s.scoreCard}>
            <Text style={[s.scoreCardNumber, { color: C.info }]}>
              {summary.info_count}
            </Text>
            <Text style={s.scoreCardLabel}>Info</Text>
          </View>
        </View>

        {/* ── Categories with issues ─────────────────────── */}
        {(
          Object.entries(categories) as [
            keyof TechnicalAuditCategories,
            { score: number; issues: Issue[] },
          ][]
        ).map(([key, cat]) => {
          if (cat.issues.length === 0) return null;
          return (
            <View key={key}>
              <View style={s.categoryHeader}>
                <Text style={s.categoryName}>{CATEGORY_LABELS[key]}</Text>
                <Text
                  style={[
                    s.categoryScore,
                    { color: getScoreColorHex(cat.score) },
                  ]}
                >
                  {cat.score}/100
                </Text>
              </View>
              {cat.issues.map((issue, idx) => (
                <IssueBlock key={idx} issue={issue} />
              ))}
            </View>
          );
        })}

        {/* ── Action plan table ──────────────────────────── */}
        <Text style={s.sectionTitle}>Akční plán</Text>
        {actionRows.length > 0 ? (
          <View>
            <View style={s.tableHeaderRow}>
              <Text style={[s.tableHeaderCell, { width: "45%" }]}>Issue</Text>
              <Text style={[s.tableHeaderCell, { width: "15%" }]}>Impact</Text>
              <Text style={[s.tableHeaderCell, { width: "15%" }]}>Effort</Text>
              <Text style={[s.tableHeaderCell, { width: "25%" }]}>
                Kvadrant
              </Text>
            </View>
            {actionRows.map((row, idx) => (
              <View
                key={idx}
                style={[
                  s.tableRow,
                  { backgroundColor: idx % 2 === 0 ? C.white : C.surface },
                ]}
              >
                <Text style={[s.tableCell, { width: "45%" }]}>
                  {row.title}
                </Text>
                <Text style={[s.tableCell, { width: "15%" }]}>
                  {row.impact}/5
                </Text>
                <Text style={[s.tableCell, { width: "15%" }]}>
                  {row.effort}/5
                </Text>
                <Text
                  style={[
                    s.tableCell,
                    { width: "25%", color: getQuadrantColorHex(row.quadrant) },
                  ]}
                >
                  {row.quadrant}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={s.bodyText}>
            AI hodnocení nebylo k dispozici pro tento report.
          </Text>
        )}

        {/* ── Limitations ────────────────────────────────── */}
        <Text style={s.sectionTitle}>Omezení analýzy</Text>
        {AUDIT_LIMITATIONS.map((text, idx) => (
          <View key={idx} style={s.limitationRow}>
            <View style={s.limitationDot} />
            <Text style={s.limitationText}>{text}</Text>
          </View>
        ))}
      </Page>
    </Document>
  );
}

// ── Issue sub-component ──────────────────────────────────────

function IssueBlock({ issue }: { issue: Issue }) {
  const sevColor = getSeverityColorHex(issue.severity);
  const sevLabel = SEVERITY_LABELS[issue.severity] ?? issue.severity;

  return (
    <View style={s.issueWrap} wrap={false}>
      <View style={[s.issueSeverityBar, { backgroundColor: sevColor }]} />
      <View style={s.issueBody}>
        <View style={s.issueTitleRow}>
          <Text style={s.issueTitle}>{issue.title}</Text>
          <Text style={[s.issueSeverityLabel, { color: sevColor }]}>
            {sevLabel}
          </Text>
        </View>
        <Text style={s.issueDesc}>{issue.description}</Text>
        {issue.recommendation ? (
          <View style={s.recBox}>
            <Text style={s.recText}>{issue.recommendation}</Text>
          </View>
        ) : null}
        {issue.affected_urls.length > 0 ? (
          <View>
            {issue.affected_urls.slice(0, 10).map((url, i) => (
              <Text key={i} style={s.urlText}>
                {url}
              </Text>
            ))}
            {issue.affected_urls.length > 10 ? (
              <Text style={s.urlText}>
                … a dalších {issue.affected_urls.length - 10} URL
              </Text>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}
