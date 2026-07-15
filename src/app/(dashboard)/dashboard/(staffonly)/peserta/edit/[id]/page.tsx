import { notFound } from "next/navigation";
import { db } from "~/server/db";
import { pesertaDidik } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { EditPesertaForm } from "./edit-peserta-form";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditPesertaPage({ params }: PageProps) {
  const { id } = await params;

  const peserta = await db.query.pesertaDidik.findFirst({
    where: eq(pesertaDidik.id, id),
  });

  if (!peserta) {
    notFound();
  }

  return <EditPesertaForm initialData={peserta} />;
}
