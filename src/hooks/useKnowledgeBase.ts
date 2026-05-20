import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface KnowledgeDocumentStatus {
  doc_number: number;
  title: string;
  version: string;
  is_restricted: boolean;
  chunk_count: number;
  last_ingested: string | null;
  status: "ingestado" | "pendente" | "restrito";
}

interface IngestResult {
  chunks_created: number;
}

const EXPECTED_DOCS = [
  { doc_number: 1,  title: "Identidade",            is_restricted: false },
  { doc_number: 2,  title: "Glossário",              is_restricted: false },
  { doc_number: 3,  title: "Frentes Comerciais",     is_restricted: false },
  { doc_number: 4,  title: "Pilares Técnicos",       is_restricted: false },
  { doc_number: 5,  title: "Portfólio",              is_restricted: false },
  { doc_number: 6,  title: "Taxonomia ROI",          is_restricted: false },
  { doc_number: 7,  title: "Objeções Comerciais",    is_restricted: false },
  { doc_number: 8,  title: "Playbook Comercial",     is_restricted: false },
  { doc_number: 9,  title: "Precificação Interna",   is_restricted: true  },
  { doc_number: 10, title: "Processo de Entrega",    is_restricted: false },
  { doc_number: 11, title: "Renovação e Retenção",   is_restricted: false },
] as const;

export function useKnowledgeBase() {
  const [documents, setDocuments] = useState<KnowledgeDocumentStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const { data, error: err } = await (supabase as any)
      .from("knowledge_documents")
      .select(`
        doc_number,
        title,
        version,
        is_restricted,
        updated_at,
        knowledge_chunks(count)
      `)
      .order("doc_number");

    if (err) {
      setError(err.message);
      setIsLoading(false);
      return;
    }

    const ingested = new Map<number, { version: string; is_restricted: boolean; chunk_count: number; updated_at: string | null }>();
    for (const row of (data ?? [])) {
      ingested.set(row.doc_number, {
        version: row.version ?? "—",
        is_restricted: row.is_restricted ?? false,
        chunk_count: Array.isArray(row.knowledge_chunks)
          ? (row.knowledge_chunks[0]?.count ?? 0)
          : 0,
        updated_at: row.updated_at ?? null,
      });
    }

    const merged: KnowledgeDocumentStatus[] = EXPECTED_DOCS.map((expected) => {
      const found = ingested.get(expected.doc_number);
      if (!found) {
        return {
          doc_number: expected.doc_number,
          title: expected.title,
          version: "—",
          is_restricted: expected.is_restricted,
          chunk_count: 0,
          last_ingested: null,
          status: expected.is_restricted ? "restrito" : "pendente",
        };
      }
      return {
        doc_number: expected.doc_number,
        title: expected.title,
        version: found.version,
        is_restricted: found.is_restricted,
        chunk_count: Number(found.chunk_count),
        last_ingested: found.updated_at,
        status: found.is_restricted ? "restrito" : "ingestado",
      };
    });

    setDocuments(merged);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const reingest = useCallback(async (docNumber: number): Promise<IngestResult> => {
    const { data: docData, error: fetchErr } = await (supabase as any)
      .from("knowledge_documents")
      .select("full_content, title, version, is_restricted, layer")
      .eq("doc_number", docNumber)
      .single();

    if (fetchErr || !docData) {
      throw new Error(fetchErr?.message ?? "Documento não encontrado");
    }

    const { data: session } = await supabase.auth.getSession();
    const token = session?.session?.access_token;
    if (!token) throw new Error("Não autenticado");

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
    const res = await fetch(`${supabaseUrl}/functions/v1/knowledge-ingest`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        doc_number: docNumber,
        title: docData.title,
        version: docData.version,
        content: docData.full_content,
        is_restricted: docData.is_restricted,
        layer: docData.layer,
      }),
    });

    if (!res.ok) {
      const msg = await res.text().catch(() => res.statusText);
      throw new Error(msg);
    }

    const result = (await res.json()) as IngestResult;
    await load();
    return result;
  }, [load]);

  const reingestAll = useCallback(async (
    onProgress: (current: number, total: number, chunksCreated: number) => void
  ): Promise<number> => {
    const toReingest = documents.filter((d) => !d.is_restricted);
    let totalChunks = 0;

    for (let i = 0; i < toReingest.length; i++) {
      const doc = toReingest[i];
      const result = await reingest(doc.doc_number);
      totalChunks += result.chunks_created;
      onProgress(i + 1, toReingest.length, totalChunks);
    }

    return totalChunks;
  }, [documents, reingest]);

  const totalChunks = documents.reduce((sum, d) => sum + d.chunk_count, 0);

  return { documents, isLoading, error, totalChunks, reingest, reingestAll, reload: load };
}
