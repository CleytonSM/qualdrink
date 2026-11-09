import { useFocusEffect, router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator, Image, Linking, Modal, ScrollView, StyleSheet, Text, View,
} from "react-native";

import { addIngredients } from "@/src/data/selection";
import type { Ingredient } from "@/src/db/types";
import { getSupabase } from "@/src/supabase/client";
import { colors } from "@/src/theme/colors";
import { layout } from "@/src/theme/layout";
import { typography } from "@/src/theme/typography";
import { Button } from "@/src/ui/button";
import { PressableScale } from "@/src/ui/pressable-scale";
import { Screen } from "@/src/ui/screen";
import { newPhotoRecognitionClient } from "@/src/vision/client";
import { choosePhoto, discardPhoto, PhotoError, recoverPendingPhoto, type PreparedPhoto } from "@/src/vision/photo";
import { RecognitionError } from "../../supabase/functions/_shared/vision-contract";

type Stage = "idle" | "picking" | "preview" | "analyzing" | "review";

export function PhotoIngredients({ ingredients }: { ingredients: readonly Ingredient[] }) {
  const [client] = useState(newPhotoRecognitionClient);
  const [stage, setStage] = useState<Stage>("idle");
  const [photo, setPhoto] = useState<PreparedPhoto | null>(null);
  const [draft, setDraft] = useState<string[]>([]);
  const [detectedCount, setDetectedCount] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(() => getSupabase() === null);
  const photoRef = useRef<PreparedPhoto | null>(null);
  const userRef = useRef<string | null>(null);
  const epoch = useRef(0);
  const focused = useRef(false);
  const picking = useRef(false);
  const recovered = useRef(false);

  const reset = useCallback(() => {
    epoch.current += 1;
    client.cancel();
    discardPhoto(photoRef.current);
    photoRef.current = null;
    setPhoto(null);
    setDraft([]);
    setStage("idle");
    setMessage(null);
  }, [client]);

  useFocusEffect(useCallback(() => {
    focused.current = true;
    return () => {
      focused.current = false;
      reset();
    };
  }, [reset]));

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;
    let mounted = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      const next = session?.user.id ?? null;
      if (userRef.current !== next) {
        reset();
        setNotice(null);
      }
      userRef.current = next;
      setUserId(next);
      setAuthReady(true);
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, [reset]);

  useEffect(() => {
    if (!authReady || recovered.current) return;
    recovered.current = true;
    const version = epoch.current;
    picking.current = true;
    void recoverPendingPhoto().then((chosen) => {
      if (version !== epoch.current || !focused.current || !userRef.current) {
        discardPhoto(chosen);
        if (version === epoch.current && focused.current) setStage("idle");
        return;
      }
      photoRef.current = chosen;
      setPhoto(chosen);
      setStage(chosen ? "preview" : "idle");
    }).catch(() => {
      if (version === epoch.current && focused.current) {
        setStage("idle");
        setMessage("Não foi possível recuperar a foto. Escolha uma imagem novamente.");
      }
    }).finally(() => { picking.current = false; });
  }, [authReady]);

  async function pick(source: "camera" | "library") {
    if (!userId || picking.current || stage !== "idle") return;
    picking.current = true;
    const version = ++epoch.current;
    setNotice(null);
    setMessage(null);
    setStage("picking");
    try {
      const chosen = await choosePhoto(source);
      if (version !== epoch.current || !focused.current) { discardPhoto(chosen); return; }
      photoRef.current = chosen;
      setPhoto(chosen);
      setStage(chosen ? "preview" : "idle");
    } catch (error) {
      if (version !== epoch.current || !focused.current) return;
      setMessage(error instanceof RecognitionError || error instanceof PhotoError
        ? error.message : "Não foi possível abrir essa foto. Tente outra imagem.");
      setStage("idle");
    } finally {
      picking.current = false;
    }
  }

  async function analyze() {
    if (!photo || client.running || stage !== "preview") return;
    const version = epoch.current;
    setMessage(null);
    setStage("analyzing");
    try {
      const result = await client.analyze({ imageBase64: photo.imageBase64, mimeType: photo.mimeType });
      if (!result || version !== epoch.current || !focused.current) return;
      const available = new Set(ingredients.map(({ id }) => id));
      const ids = result.ingredientIds.filter((id) => available.has(id));
      setDraft(ids);
      setDetectedCount(ids.length);
      setStage("review");
    } catch (error) {
      if (version !== epoch.current || !focused.current) return;
      if (error instanceof RecognitionError && error.code === "cancelled") return;
      setMessage(error instanceof RecognitionError
        ? error.message : "Não foi possível analisar. Selecione os ingredientes manualmente.");
      setStage("preview");
    }
  }

  function confirm() {
    if (!userRef.current || stage !== "review") return;
    addIngredients(draft);
    const count = draft.length;
    reset();
    setNotice(count === 0 ? "Nenhum ingrediente foi acrescentado."
      : "Ingredientes confirmados. Confira as receitas abaixo.");
  }

  const modalVisible = stage === "preview" || stage === "analyzing" || stage === "review";
  const errorText = message ? (
    <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.message}>{message}</Text>
  ) : null;

  return (
    <View style={styles.panel}>
      <Text style={styles.heading}>Ingredientes por foto</Text>
      <Text style={styles.body}>
        Fotografe alimentos ou embalagens com rótulo legível. Revise os ingredientes antes de buscar receitas.
      </Text>
      {!userId ? (
        <>
          <Text style={styles.muted}>Entre na conta para analisar fotos. A seleção manual continua disponível.</Text>
          <Button label={authReady ? "Entrar na conta" : "Verificando conta..."}
            disabled={!authReady} variant="secondary" onPress={() => router.push("/(tabs)/conta")} />
        </>
      ) : (
        <View style={styles.actions}>
          <Button label="Tirar foto" disabled={stage !== "idle"} onPress={() => { void pick("camera"); }} />
          <Button label="Escolher da galeria" variant="secondary" disabled={stage !== "idle"}
            onPress={() => { void pick("library"); }} />
        </View>
      )}
      {stage === "picking" ? <Text style={styles.muted}>Preparando foto...</Text> : null}
      {!modalVisible ? errorText : null}
      {notice ? <Text accessibilityLiveRegion="polite" style={styles.muted}>{notice}</Text> : null}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="fullScreen"
        onRequestClose={reset}>
        <Screen title={stage === "review" ? "Revisar ingredientes" : "Analisar foto"}>
          <ScrollView contentContainerStyle={styles.modalContent}>
            {photo ? <Image source={{ uri: photo.uri }} style={styles.preview} resizeMode="contain"
              accessibilityLabel="Foto dos ingredientes escolhida para análise" /> : null}
            {stage === "review" ? (
              <>
                <Text style={styles.body}>{detectedCount === 0
                  ? "Não reconhecemos ingredientes com clareza. Você pode marcar os itens abaixo."
                  : "Confira as sugestões: desmarque erros e marque os ingredientes que faltaram."}</Text>
                <Text style={styles.muted}>A foto pode não mostrar tudo. Só os itens confirmados serão acrescentados à sua seleção.</Text>
                <View style={styles.chips}>
                  {ingredients.map((ingredient) => {
                    const active = draft.includes(ingredient.id);
                    return (
                      <PressableScale key={ingredient.id} accessibilityLabel={ingredient.name}
                        accessibilityState={{ selected: active }}
                        style={[styles.chip, active && styles.chipSelected]}
                        onPress={() => setDraft((current) => current.includes(ingredient.id)
                          ? current.filter((id) => id !== ingredient.id) : [...current, ingredient.id])}>
                        <Text style={[styles.chipLabel, active && styles.chipLabelSelected]}>
                          {active ? "✓ " : ""}{ingredient.name}
                        </Text>
                      </PressableScale>
                    );
                  })}
                </View>
                <Button label={`Confirmar ${draft.length} ingrediente${draft.length === 1 ? "" : "s"}`}
                  onPress={confirm} />
              </>
            ) : (
              <>
                <Text style={styles.body}>
                  Ao tocar em Analisar, esta foto será enviada à OpenAI. A análise precisa de internet.
                  O QualDrink não guarda fotos ou histórico; o processamento externo segue as políticas da OpenAI.
                </Text>
                <Button label="Ver políticas de dados da OpenAI" variant="quiet" onPress={() => {
                  void Linking.openURL("https://developers.openai.com/api/docs/guides/your-data").catch(() => {
                    setMessage("Não foi possível abrir os termos. Tente mais tarde.");
                  });
                }} />
                {stage === "analyzing" ? (
                  <View accessibilityLiveRegion="polite" style={styles.progress}>
                    <ActivityIndicator color={colors.accent} />
                    <Text style={styles.body}>Analisando foto... até 30 segundos</Text>
                  </View>
                ) : <Button label="Analisar" onPress={() => { void analyze(); }} />}
              </>
            )}
            {errorText}
            <Button label={stage === "analyzing" ? "Cancelar análise" : "Cancelar e voltar"}
              variant="secondary" onPress={reset} />
          </ScrollView>
        </Screen>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { gap: 12, padding: 16, borderRadius: layout.radiusCard,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  heading: { ...typography.drinkName, color: colors.text },
  body: { ...typography.body, color: colors.text },
  muted: { ...typography.label, fontFamily: typography.body.fontFamily, color: colors.textMuted },
  message: { ...typography.body, color: colors.amber },
  actions: { gap: 10 },
  modalContent: { gap: 18, paddingBottom: 40 },
  preview: { width: "100%", height: 240, backgroundColor: colors.surface, borderRadius: layout.radiusCard },
  progress: { flexDirection: "row", gap: 12, alignItems: "center", flexWrap: "wrap" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { minHeight: layout.minTouch, justifyContent: "center", paddingHorizontal: 14,
    borderRadius: layout.radiusPill, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surfaceRaised },
  chipSelected: { backgroundColor: colors.amber, borderColor: colors.amber },
  chipLabel: { ...typography.label, color: colors.text },
  chipLabelSelected: { color: colors.background },
});
