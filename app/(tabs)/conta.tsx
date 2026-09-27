import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

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

function formatSyncedAt(epochMs: number): string {
  return new Date(epochMs).toLocaleString("pt-BR");
}

function SyncLine({ status }: { status: SyncStatus }) {
  if (status.kind === "error") {
    return (
      <View style={styles.stack}>
        <Text style={styles.body}>Não sincronizado</Text>
        <Text style={styles.body}>{status.message}</Text>
      </View>
    );
  }
  if (status.kind === "ok") {
    return (
      <View style={styles.stack}>
        <Text style={styles.body}>Sincronizado</Text>
        <Text style={styles.muted}>{formatSyncedAt(status.syncedAt)}</Text>
      </View>
    );
  }
  return <Text style={styles.body}>Ainda não sincronizado</Text>;
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
      {ready && hasSession ? (
        <View style={styles.form}>
          <Text style={styles.body}>{sessionEmail}</Text>
          <SyncLine status={syncStatus} />
          <Button
            label={syncing ? "Sincronizando..." : "Sincronizar"}
            disabled={syncing}
            onPress={() => {
              void syncNow();
            }}
          />
          <Button label="Sair" variant="secondary" disabled={busy} onPress={() => void leave()} />
          {formMessage ? <Text style={styles.body}>{formMessage}</Text> : null}
        </View>
      ) : null}
      {ready && !hasSession ? (
        <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.form}>
            <TextField
              placeholder="E-mail"
              accessibilityLabel="E-mail"
              autoCapitalize="none"
              keyboardType="email-address"
              textContentType="emailAddress"
              value={email}
              onChangeText={setEmail}
            />
            <TextField
              placeholder="Senha"
              accessibilityLabel="Senha"
              autoCapitalize="none"
              secureTextEntry
              textContentType="password"
              value={password}
              onChangeText={setPassword}
            />
            {formMessage ? <Text style={styles.body}>{formMessage}</Text> : null}
            <Button
              label="Entrar"
              disabled={busy}
              onPress={() => {
                void submit("sign-in");
              }}
            />
            <Button
              label="Criar conta"
              variant="secondary"
              disabled={busy}
              onPress={() => {
                void submit("sign-up");
              }}
            />
          </View>
        </ScrollView>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  form: {
    gap: layout.cardGap,
  },
  stack: {
    gap: 4,
  },
  body: {
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
});
