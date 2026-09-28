import { SymbolView } from "expo-symbols";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState, type ComponentProps } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { NETWORK_FAILURE } from "@/src/auth/credentials";
import { readSessionEmail, signIn, signOut, signUp } from "@/src/auth/session";
import { readSyncStatus, type SyncStatus } from "@/src/db/queries";
import { getSessionUserId } from "@/src/supabase/client";
import { colors } from "@/src/theme/colors";
import { layout } from "@/src/theme/layout";
import { typography } from "@/src/theme/typography";
import { subscribeDataChanged, syncAll } from "@/src/sync/sync";
import { Button } from "@/src/ui/button";
import { Screen } from "@/src/ui/screen";
import { TextField } from "@/src/ui/text-field";

const NOT_SYNCED = "Não sincronizado";

function formatSyncedAt(epochMs: number): string {
  return new Date(epochMs).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

/** A mensagem gravada já começa com "Não sincronizado."; o título da linha diz isso. */
function errorDetail(message: string): string {
  const prefix = `${NOT_SYNCED}.`;
  return message.startsWith(prefix) ? message.slice(prefix.length).trim() : message;
}

function SyncLine({ status }: { status: SyncStatus }) {
  if (status.kind === "error") {
    return (
      <View style={styles.valueStack}>
        <Text style={styles.value}>{NOT_SYNCED}</Text>
        <Text style={styles.muted}>{errorDetail(status.message)}</Text>
      </View>
    );
  }
  if (status.kind === "ok") {
    return (
      <View style={styles.valueStack}>
        <Text style={styles.value}>Sincronizado</Text>
        <Text style={styles.muted}>{formatSyncedAt(status.syncedAt)}</Text>
      </View>
    );
  }
  return <Text style={styles.value}>Ainda não sincronizado</Text>;
}

function Field({
  label,
  hint,
  ...props
}: { label: string; hint?: string } & ComponentProps<typeof TextField>) {
  return (
    <View style={styles.fieldBlock}>
      <Text maxFontSizeMultiplier={1.4} style={styles.fieldLabel}>
        {label}
      </Text>
      <TextField accessibilityLabel={label} accessibilityHint={hint} {...props} />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

function FormMessage({ message }: { message: string }) {
  return (
    <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.message}>
      <SymbolView
        name={{ ios: "exclamationmark.circle", android: "error", web: "error" }}
        tintColor={colors.text}
        size={18}
      />
      <Text style={styles.messageText}>{message}</Text>
    </View>
  );
}

export default function ContaScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [hasSession, setHasSession] = useState(false);
  const [sessionEmail, setSessionEmail] = useState("");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ kind: "never" });

  const refresh = useCallback(async () => {
    const userId = await getSessionUserId();
    setHasSession(userId !== null);
    setSessionEmail(userId ? ((await readSessionEmail()) ?? "") : "");
    setSyncStatus(readSyncStatus());
    setReady(true);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  useEffect(() => {
    return subscribeDataChanged(() => {
      setSyncStatus(readSyncStatus());
    });
  }, []);

  async function submit(mode: "sign-in" | "sign-up") {
    setFormMessage(null);
    setBusy(true);
    const result = mode === "sign-in" ? await signIn(email, password) : await signUp(email, password);
    setBusy(false);
    if (!result.ok) {
      setFormMessage(result.message);
      return;
    }
    setPassword("");
    await refresh();
  }

  async function syncNow() {
    const userId = await getSessionUserId();
    if (!userId) {
      return;
    }
    setSyncing(true);
    await syncAll(userId);
    setSyncing(false);
    setSyncStatus(readSyncStatus());
  }

  async function leave() {
    setBusy(true);
    try {
      await signOut();
    } catch {
      setFormMessage(NETWORK_FAILURE);
    }
    setBusy(false);
    await refresh();
  }

  return (
    <Screen title="Conta">
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        {ready && hasSession ? (
          <ScrollView style={styles.flex} contentContainerStyle={styles.page}>
            <View style={styles.group}>
              <View style={styles.groupRow}>
                <Text style={styles.rowLabel}>E-mail</Text>
                <Text style={styles.value} numberOfLines={1}>
                  {sessionEmail}
                </Text>
              </View>
              <View style={styles.hairline} />
              <View style={styles.groupRow}>
                <Text style={styles.rowLabel}>Favoritos</Text>
                <SyncLine status={syncStatus} />
              </View>
            </View>
            <Button
              label={syncing ? "Sincronizando..." : "Sincronizar"}
              disabled={syncing}
              onPress={() => {
                void syncNow();
              }}
            />
            {formMessage ? <FormMessage message={formMessage} /> : null}
            <View style={styles.leave}>
              <Text style={styles.muted}>
                Sair mantém seus favoritos neste aparelho.
              </Text>
              <Button label="Sair" variant="quiet" disabled={busy} onPress={() => void leave()} />
            </View>
          </ScrollView>
        ) : null}
        {ready && !hasSession ? (
          <ScrollView
            style={styles.flex}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.page}
          >
            <Text style={styles.muted}>
              Busca, identificação e favoritos funcionam sem conta. Entre para levar seus
              favoritos para outro aparelho.
            </Text>
            <View style={styles.fields}>
              <Field
                label="E-mail"
                autoCapitalize="none"
                keyboardType="email-address"
                textContentType="emailAddress"
                autoComplete="email"
                value={email}
                onChangeText={setEmail}
              />
              <Field
                label="Senha"
                hint="Ao menos 6 caracteres"
                autoCapitalize="none"
                secureTextEntry
                textContentType="password"
                autoComplete="password"
                value={password}
                onChangeText={setPassword}
              />
            </View>
            {formMessage ? <FormMessage message={formMessage} /> : null}
            <Button
              label="Entrar"
              disabled={busy}
              onPress={() => {
                void submit("sign-in");
              }}
            />
            <View style={styles.alt}>
              <Text style={styles.muted}>Primeira vez aqui?</Text>
              <Button
                label="Criar conta"
                variant="quiet"
                size="compact"
                disabled={busy}
                onPress={() => {
                  void submit("sign-up");
                }}
              />
            </View>
          </ScrollView>
        ) : null}
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  page: {
    gap: 20,
    paddingTop: 4,
    paddingBottom: 32,
  },
  fields: {
    gap: 16,
  },
  fieldBlock: {
    gap: 8,
  },
  fieldLabel: {
    fontFamily: typography.label.fontFamily,
    fontSize: typography.label.fontSize,
    lineHeight: typography.label.lineHeight,
    color: colors.text,
    includeFontPadding: false,
  },
  hint: {
    fontFamily: typography.body.fontFamily,
    fontSize: typography.label.fontSize,
    lineHeight: typography.label.lineHeight,
    color: colors.textMuted,
  },
  message: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: layout.radiusField,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  messageText: {
    flex: 1,
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
    color: colors.text,
  },
  alt: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 0,
    marginTop: -8,
  },
  group: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: layout.radiusCard,
    paddingHorizontal: layout.screenPadding,
  },
  groupRow: {
    gap: 4,
    paddingVertical: 14,
  },
  rowLabel: {
    fontFamily: typography.body.fontFamily,
    fontSize: typography.label.fontSize,
    lineHeight: typography.label.lineHeight,
    color: colors.textMuted,
    includeFontPadding: false,
  },
  hairline: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  valueStack: {
    gap: 2,
  },
  value: {
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
    color: colors.text,
  },
  muted: {
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
    color: colors.textMuted,
  },
  leave: {
    marginTop: 12,
    paddingTop: 20,
    gap: 4,
    alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});
