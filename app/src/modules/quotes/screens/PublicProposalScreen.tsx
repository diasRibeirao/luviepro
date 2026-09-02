import { useEffect, useState } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { LanguageSwitch, Text, TextInput } from "../../../i18n";
import { useLocalSearchParams } from "expo-router";
import { ApiError, money, publicApi } from "../../../api";
import { theme } from "../../../theme";
import { standardPaymentPlan } from "../paymentPlan";
type ProposalStage = { description: string };
type ProposalItem = {
  serviceName: string;
  days: number;
  people: number;
  totalCents: number;
  stages?: ProposalStage[];
};
type ProposalProductItem = {
  productId: string;
  productName: string;
  sku: string;
  unit: string;
  quantity: number;
  unitPriceCents: number;
  totalCents: number;
};
type ProposalTenant = {
  logoUrl?: string | null;
  name: string;
  document?: string | null;
  siteUrl?: string | null;
  contactEmail?: string | null;
  proposalText?: string | null;
  proposalPaymentTerms?: string | null;
  pixKey?: string | null;
  responsibleName?: string | null;
  phone?: string | null;
  proposalFooter?: string | null;
};
type ProposalClient = {
  name: string;
  document?: string | null;
  city?: string | null;
  state?: string | null;
};
type PublicProposalData = {
  number: string;
  status: string;
  validUntil?: string | null;
  expired?: boolean;
  remainingDays?: number | null;
  clientDecision?: "approved" | "rejected" | null;
  clientDecisionName?: string | null;
  clientDecisionAt?: string | null;
  finalTotalCents?: number | null;
  totalCents: number;
  notes?: string | null;
  paymentLinkUrl?: string | null;
  tenant: ProposalTenant;
  client: ProposalClient;
  items: ProposalItem[];
  productItems?: ProposalProductItem[];
};
const errorMessage = (error: unknown) => {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Erro inesperado";
};
export default function PublicProposal() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const [data, setData] = useState<PublicProposalData>(),
    [error, setError] = useState(""),
    [name, setName] = useState(""),
    [busy, setBusy] = useState(false),
    [done, setDone] = useState("");
  useEffect(() => {
    if (token)
      publicApi<PublicProposalData>(`/public/proposals/${token}`)
        .then(setData)
        .catch((e: unknown) => setError(errorMessage(e)));
  }, [token]);
  async function decide(decision: "approved" | "rejected") {
    if (name.trim().length < 2) {
      setError("Informe seu nome para registrar a resposta.");
      return;
    }
    try {
      setBusy(true);
      setError("");
      await publicApi(`/public/proposals/${token}/decision`, {
        method: "POST",
        body: JSON.stringify({ decision, name: name.trim() }),
      });
      setDone(decision);
      setData((x) =>
        x
          ? {
              ...x,
              status: decision === "approved" ? "approved" : "rejected",
              clientDecision: decision,
              clientDecisionName: name.trim(),
            }
          : x,
      );
    } catch (e: unknown) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  if (error && !data)
    return (
      <View style={s.center}>
        <Ionicons name="alert-circle-outline" size={38} color={theme.danger} />
        <Text style={s.error}>{error}</Text>
      </View>
    );
  if (!data)
    return (
      <View style={s.center}>
        <ActivityIndicator color={theme.green} />
      </View>
    );
  const expired =
    data.expired ??
    (data.validUntil && new Date(data.validUntil).getTime() < Date.now());
  const decided =
    done ||
    data.clientDecision ||
    ["approved", "rejected"].includes(data.status);
  const remainingDays =
    data.remainingDays ??
    (data.validUntil
      ? Math.max(
          0,
          Math.ceil(
            (new Date(data.validUntil).getTime() - Date.now()) / 86400000,
          ),
        )
      : null);
  const proposalTotal = data.finalTotalCents || data.totalCents;
  const payment = standardPaymentPlan(proposalTotal);
  const documentTitle =
    data.items.length > 0
      ? "ORDEM DE SERVIÇO PARA ORGANIZAÇÃO"
      : "ORDEM DE REVENDA DE PRODUTO";
  return (
    <ScrollView style={s.page} contentContainerStyle={s.wrap}>
      <View style={s.language}>
        <LanguageSwitch compact />
      </View>
      <View style={s.paper}>
        <View style={s.header}>
          <View style={s.brandRow}>
            {data.tenant.logoUrl ? (
              <Image source={{ uri: data.tenant.logoUrl }} style={s.logo} />
            ) : null}
            <View>
              <Text style={s.brand}>{data.tenant.name}</Text>
              <Text style={s.muted}>
                {[
                  data.tenant.document,
                  data.tenant.siteUrl || data.tenant.contactEmail,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </Text>
            </View>
          </View>
          <View style={s.number}>
            <Text style={s.numberText}>{data.number}</Text>
            <Text style={s.muted}>
              {data.validUntil
                ? `Válida até ${new Date(data.validUntil).toLocaleDateString("pt-BR")}`
                : ""}
            </Text>
            {!decided && !expired && remainingDays !== null && (
              <Text style={s.validBadge}>
                {remainingDays === 0
                  ? "Vence hoje"
                  : remainingDays === 1
                    ? "1 dia restante"
                    : `${remainingDays} dias restantes`}
              </Text>
            )}
          </View>
        </View>
        <View style={s.rule} />
        <Text style={s.kicker}>{documentTitle}</Text>
        <Text style={s.hello}>Olá, {data.client.name}</Text>
        {(data.client.document || data.client.city) && (
          <Text style={s.clientMeta}>
            {[
              data.client.document,
              data.client.city && data.client.state
                ? `${data.client.city}/${data.client.state}`
                : data.client.city,
            ]
              .filter(Boolean)
              .join(" · ")}
          </Text>
        )}
        <Text style={s.intro}>
          {data.tenant.proposalText ||
            "Preparamos esta proposta especialmente para você."}
        </Text>
        {data.items.length > 0 && <Text style={s.section}>Serviços</Text>}
        {data.items.map((x, i) => (
          <View key={i} style={s.item}>
            <View style={{ flex: 1 }}>
              <Text style={s.itemName}>{x.serviceName}</Text>
              <Text style={s.muted}>
                {x.days} dia(s) · {x.people} pessoa(s)
              </Text>
              {x.stages && x.stages.length > 0 && (
                <Text style={s.stage}>
                  {x.stages.map((st) => st.description).join(" · ")}
                </Text>
              )}
            </View>
            <Text style={s.itemValue}>{money(x.totalCents)}</Text>
          </View>
        ))}
        {!!data.productItems?.length && (
          <>
            <Text style={s.section}>Produtos</Text>
            {data.productItems.map((x, i) => (
              <View key={`${x.productId}-${i}`} style={s.item}>
                <View style={{ flex: 1 }}>
                  <Text style={s.itemName}>{x.productName}</Text>
                  <Text style={s.muted}>
                    {x.sku} · {x.quantity} {x.unit} × {money(x.unitPriceCents)}
                  </Text>
                </View>
                <Text style={s.itemValue}>{money(x.totalCents)}</Text>
              </View>
            ))}
          </>
        )}
        <View style={s.totalRow}>
          <Text style={s.totalLabel}>Investimento total</Text>
          <Text style={s.total}>{money(proposalTotal)}</Text>
        </View>
        <View style={s.commercial}>
          <Text style={s.notesTitle}>Plano de pagamento</Text>
          <Text style={s.notesText}>
            Entrada via PIX (30%):{" "}
            <Text style={s.paymentStrong}>{money(payment.depositCents)}</Text>
          </Text>
          <Text style={s.notesText}>
            Saldo no cartão (70%):{" "}
            {payment.installmentCents === payment.lastInstallmentCents
              ? `${payment.installments} parcelas de ${money(payment.installmentCents)}`
              : `${payment.installments - 1} parcelas de ${money(payment.installmentCents)} + última de ${money(payment.lastInstallmentCents)}`}
          </Text>
          {data.tenant.proposalPaymentTerms ? (
            <Text style={s.notesText}>{data.tenant.proposalPaymentTerms}</Text>
          ) : null}
          {data.tenant.pixKey ? (
            <Text style={s.notesText}>Chave PIX: {data.tenant.pixKey}</Text>
          ) : null}
        </View>
        {data.notes && (
          <View style={s.notes}>
            <Text style={s.notesTitle}>Observações</Text>
            <Text style={s.notesText}>{data.notes}</Text>
          </View>
        )}
        <View style={s.contact}>
          <Text style={s.contactName}>
            {data.tenant.responsibleName || data.tenant.name}
          </Text>
          <Text style={s.muted}>
            {[data.tenant.contactEmail, data.tenant.phone]
              .filter(Boolean)
              .join(" · ")}
          </Text>
          {data.tenant.proposalFooter ? (
            <Text style={s.muted}>{data.tenant.proposalFooter}</Text>
          ) : null}
        </View>
        {decided ? (
          <View
            style={[
              s.decision,
              data.status === "approved" ? s.approved : s.rejected,
            ]}
          >
            <Ionicons
              name={
                data.status === "approved" ? "checkmark-circle" : "close-circle"
              }
              size={26}
              color={data.status === "approved" ? theme.green2 : theme.danger}
            />
            <View>
              <Text style={s.decisionTitle}>
                {data.status === "approved"
                  ? "Proposta aprovada"
                  : "Proposta recusada"}
              </Text>
              <Text style={s.muted}>
                {data.clientDecisionName
                  ? `Resposta registrada por ${data.clientDecisionName}.`
                  : ""}
                {data.clientDecisionAt
                  ? ` ${new Date(data.clientDecisionAt).toLocaleString("pt-BR")}.`
                  : ""}
              </Text>
            </View>
          </View>
        ) : expired ? (
          <View style={s.decision}>
            <Text style={s.decisionTitle}>Esta proposta está vencida</Text>
            <Text style={s.muted}>
              Entre em contato com {data.tenant.name} para solicitar uma nova
              validade.
            </Text>
          </View>
        ) : (
          <View style={s.acceptBox}>
            <Text style={s.acceptTitle}>Responder proposta</Text>
            <Text style={s.muted}>
              Informe seu nome para registrar formalmente sua decisão.
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Seu nome completo"
              style={s.input}
            />
            {error ? <Text style={s.inlineError}>{error}</Text> : null}
            <View style={s.actions}>
              <Pressable
                disabled={busy}
                onPress={() => decide("rejected")}
                style={s.rejectBtn}
              >
                <Text style={s.rejectText}>Recusar</Text>
              </Pressable>
              <Pressable
                disabled={busy}
                onPress={() => decide("approved")}
                style={s.approveBtn}
              >
                <Ionicons name="checkmark" size={17} color={theme.white} />
                <Text style={s.approveText}>
                  {busy ? "Registrando..." : "Aprovar proposta"}
                </Text>
              </Pressable>
            </View>
          </View>
        )}
        {data.status === "approved" && data.paymentLinkUrl ? (
          <Pressable
            onPress={() => void Linking.openURL(data.paymentLinkUrl!)}
            style={s.payBtn}
          >
            <Ionicons name="card-outline" size={18} color={theme.white} />
            <Text style={s.payText}>Pagar agora</Text>
          </Pressable>
        ) : null}
      </View>
    </ScrollView>
  );
}
const s = StyleSheet.create({
  language: { position: "absolute", top: 18, right: 18, zIndex: 20 },
  page: { flex: 1, backgroundColor: "#EEEAE2" },
  wrap: { padding: 20, paddingVertical: 34 },
  paper: {
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
    backgroundColor: theme.white,
    borderRadius: 4,
    padding: 42,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: theme.cream,
    padding: 30,
  },
  error: { color: theme.danger, fontSize: 13, textAlign: "center" },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  logo: { width: 42, height: 42, borderRadius: 8, resizeMode: "contain" },
  header: { flexDirection: "row", justifyContent: "space-between", gap: 20 },
  brand: {
    fontFamily: "serif",
    fontSize: 23,
    fontWeight: "700",
    color: theme.ink,
  },
  number: { alignItems: "flex-end" },
  numberText: { fontSize: 14, fontWeight: "900", color: theme.ink },
  validBadge: {
    fontSize: 11,
    fontWeight: "800",
    color: theme.green2,
    backgroundColor: theme.green50,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 7,
    overflow: "hidden",
  },
  muted: { fontSize: 11, color: theme.muted, marginTop: 3 },
  rule: { height: 1, backgroundColor: theme.border, marginVertical: 24 },
  kicker: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 2,
    color: theme.gold,
  },
  hello: {
    fontFamily: "serif",
    fontSize: 28,
    fontWeight: "700",
    color: theme.ink,
    marginTop: 10,
  },
  clientMeta: { fontSize: 11, color: theme.muted, marginTop: 6 },
  intro: {
    fontSize: 13,
    lineHeight: 18,
    color: theme.muted,
    marginTop: 8,
    maxWidth: 560,
  },
  section: {
    fontFamily: "serif",
    fontSize: 18,
    fontWeight: "700",
    color: theme.ink,
    marginTop: 30,
    marginBottom: 8,
  },
  item: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  itemName: { fontSize: 14, fontWeight: "800", color: theme.ink },
  itemValue: { fontSize: 14, fontWeight: "900", color: theme.ink },
  stage: { fontSize: 11, lineHeight: 13, color: theme.muted, marginTop: 6 },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 25,
  },
  totalLabel: { fontSize: 12, color: theme.muted },
  total: {
    fontFamily: "serif",
    fontSize: 24,
    fontWeight: "700",
    color: theme.gold,
  },
  commercial: {
    backgroundColor: theme.green50,
    borderRadius: 10,
    padding: 14,
    marginBottom: 14,
  },
  notes: {
    backgroundColor: theme.cream,
    borderRadius: 10,
    padding: 14,
    marginBottom: 20,
  },
  notesTitle: { fontSize: 11, fontWeight: "800", color: theme.ink },
  paymentStrong: { fontWeight: "900", color: theme.ink },
  notesText: { fontSize: 11, lineHeight: 15, color: theme.muted, marginTop: 4 },
  contact: { borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 18 },
  contactName: { fontSize: 13, fontWeight: "800", color: theme.ink },
  acceptBox: {
    marginTop: 30,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    paddingTop: 22,
  },
  acceptTitle: {
    fontFamily: "serif",
    fontSize: 18,
    fontWeight: "700",
    color: theme.ink,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 13,
    color: theme.ink,
    marginTop: 14,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 12,
  },
  rejectBtn: {
    borderWidth: 1,
    borderColor: "#DEC9C4",
    borderRadius: 9,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  rejectText: { fontSize: 12, fontWeight: "800", color: theme.danger },
  approveBtn: {
    backgroundColor: theme.green2,
    borderRadius: 9,
    paddingHorizontal: 18,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  approveText: { fontSize: 12, fontWeight: "800", color: theme.white },
  inlineError: { fontSize: 11, color: theme.danger, marginTop: 7 },
  decision: {
    marginTop: 28,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 11,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: theme.cream,
  },
  approved: { borderColor: "#C8DCCF", backgroundColor: theme.green50 },
  rejected: { borderColor: "#E6CFC9", backgroundColor: "#FFF8F6" },
  decisionTitle: { fontSize: 13, fontWeight: "800", color: theme.ink },
  payBtn: {
    marginTop: 14,
    backgroundColor: theme.green2,
    borderRadius: 9,
    paddingHorizontal: 18,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  payText: { fontSize: 13, fontWeight: "900", color: theme.white },
});
