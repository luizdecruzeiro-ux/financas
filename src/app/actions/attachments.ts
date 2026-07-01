"use server";

import { uploadAttachment } from "@/lib/supabaseStorage";

export async function uploadTransactionAttachment(
  formData: FormData
): Promise<{ url: string } | { error: string }> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Nenhum arquivo enviado." };
  }

  try {
    const url = await uploadAttachment(file);
    return { url };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Não foi possível enviar o anexo." };
  }
}
