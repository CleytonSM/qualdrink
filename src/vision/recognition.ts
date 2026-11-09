import {
  ANALYSIS_TIMEOUT_MS,
  parseRecognitionImage,
  parseRecognitionResult,
  RecognitionError,
  recognitionErrorCode,
  type RecognitionImage,
  type RecognitionResult,
} from "../../supabase/functions/_shared/vision-contract";

export type RecognitionSession = { userId: string; accessToken: string };
type Options = {
  getSession: () => Promise<RecognitionSession | null>;
  send: (image: RecognitionImage, session: RecognitionSession, signal: AbortSignal) =>
    Promise<{ status: number; body: unknown }>;
  timeoutMs?: number;
};

/** Uma operação por vez. Cancelar invalida inclusive transportes que ignorem abort. */
export function createRecognitionClient(options: Options) {
  let active: { controller: AbortController; reject: (error: RecognitionError) => void } | null = null;
  return {
    cancel() {
      if (!active) return;
      const previous = active;
      active = null;
      previous.reject(new RecognitionError("cancelled"));
      previous.controller.abort();
    },
    get running() { return active !== null; },
    async analyze(image: RecognitionImage): Promise<RecognitionResult | null> {
      if (active) return null;
      const controller = new AbortController();
      let rejectOperation!: (error: RecognitionError) => void;
      const interrupted = new Promise<never>((_, reject) => { rejectOperation = reject; });
      const task = { controller, reject: rejectOperation };
      active = task;
      const timer = setTimeout(() => {
        rejectOperation(new RecognitionError("timeout"));
        controller.abort();
      }, options.timeoutMs ?? ANALYSIS_TIMEOUT_MS);
      const operation = async () => {
        const session = await options.getSession();
        if (active !== task || controller.signal.aborted) throw new RecognitionError("cancelled");
        if (!session) throw new RecognitionError("unauthorized");
        const response = await options.send(parseRecognitionImage(image), session, controller.signal);
        if (active !== task || controller.signal.aborted) throw new RecognitionError("cancelled");
        if (response.status < 200 || response.status >= 300) {
          const code = recognitionErrorCode(response.body);
          throw new RecognitionError(code ?? (response.status === 401 || response.status === 403
            ? "unauthorized" : response.status === 429 ? "quota_exceeded" : "unavailable"));
        }
        return parseRecognitionResult(response.body);
      };
      try {
        return await Promise.race([operation(), interrupted]);
      } catch (error) {
        if (error instanceof RecognitionError) throw error;
        throw new RecognitionError("network");
      } finally {
        clearTimeout(timer);
        if (active === task) active = null;
      }
    },
  };
}
