export const LLM_CATALOG: Record<string, string[]> = {
  google: [
    "google/gemini-2.5-pro",
    "google/gemini-2.5-flash",
    "google/gemini-2.5-flash-lite",
  ],
  openai: [
    "openai/gpt-5",
    "openai/gpt-5-mini",
    "openai/gpt-5-nano",
  ],
};

export const PROVIDERS = Object.keys(LLM_CATALOG);

export function providerFromModel(model: string | null | undefined): string {
  if (!model) return "";
  return model.split("/")[0] ?? "";
}
