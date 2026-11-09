import { createRecognitionHandler } from "./handler.ts";

Deno.serve(createRecognitionHandler({ env: (name) => Deno.env.get(name) }));
