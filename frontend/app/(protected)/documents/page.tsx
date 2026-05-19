"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ExportDataButton } from "@/components/admin/export-data-button";
import { PageHeader } from "@/components/admin/page-header";
import { api, fetchCollectionRef } from "@/services/api";
import { toast } from "sonner";

type DocumentItem = {
  id: number;
  name: string;
  mimeType: string;
  category?: string | null;
  studentId?: number | null;
  teacherId?: number | null;
  student?: { fullName: string } | null;
  teacher?: { firstName: string; lastName: string } | null;
};

type DocumentTemplate = {
  id: number;
  name: string;
  type: string;
  documentTypeId?: number | null;
  header: string;
  body: string;
  footer?: string | null;
  primaryColor?: string | null;
  signatureLabel?: string | null;
  isDefault: boolean;
  documentType?: { id: number; name: string } | null;
};

type Student = { id: number; fullName: string };
type Teacher = { id: number; firstName: string; lastName: string };
type DocumentType = { id: number; name: string };

const emptyTemplate = (): Omit<DocumentTemplate, "id"> => ({
  name: "",
  type: "releve_note",
  documentTypeId: null,
  header:
    "DEAA Hub\nDirection des Affaires Académiques\nRelevé de notes officiel",
  body: "Le présent relevé récapitule les notes enregistrées pour {{studentName}} ({{codeMassar}}) en {{academicYear}}.",
  footer:
    "Moyenne générale: {{average}} / 20. Document généré le {{generatedAt}}.",
  primaryColor: "#0f766e",
  signatureLabel: "Direction des Affaires Académiques",
  isDefault: false,
});

export default function DocumentsPage() {
  const [rows, setRows] = useState<DocumentItem[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [ownerType, setOwnerType] = useState<"student" | "teacher">("student");
  const [studentId, setStudentId] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string>("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editOwnerType, setEditOwnerType] = useState<"student" | "teacher">(
    "student",
  );
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [templateDraft, setTemplateDraft] =
    useState<Omit<DocumentTemplate, "id">>(emptyTemplate);
  const [editingTemplateId, setEditingTemplateId] = useState<number | null>(
    null,
  );
  const [generating, setGenerating] = useState(false);

  const selectedTemplate = useMemo(
    () =>
      templates.find((template) => String(template.id) === selectedTemplateId),
    [selectedTemplateId, templates],
  );

  const load = useCallback(async () => {
    const [docsRes, templatesRes, docTypesRes, studentsData, teachersData] =
      await Promise.all([
        api.get<DocumentItem[]>("/documents"),
        api.get<DocumentTemplate[]>("/documents/templates"),
        api.get<DocumentType[]>("/document-types"),
        fetchCollectionRef<Student>("/students", { page: 1, limit: 200 }),
        fetchCollectionRef<Teacher>("/teachers", { page: 1, limit: 200 }),
      ]);
    setRows(docsRes.data);
    setTemplates(templatesRes.data);
    setDocumentTypes(docTypesRes.data);
    setStudents(studentsData);
    setTeachers(teachersData);
    setStudentId(
      (current) =>
        current || (studentsData.length > 0 ? String(studentsData[0].id) : ""),
    );
    setTeacherId(
      (current) =>
        current || (teachersData.length > 0 ? String(teachersData[0].id) : ""),
    );
    setSelectedTemplateId(
      (current) =>
        current ||
        (templatesRes.data.length > 0 ? String(templatesRes.data[0].id) : ""),
    );
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  useEffect(() => {
    if (!selectedTemplate) return;
    setEditingTemplateId(selectedTemplate.id);
    setTemplateDraft({
      name: selectedTemplate.name,
      type: selectedTemplate.type,
      documentTypeId: selectedTemplate.documentTypeId ?? null,
      header: selectedTemplate.header,
      body: selectedTemplate.body,
      footer: selectedTemplate.footer ?? "",
      primaryColor: selectedTemplate.primaryColor ?? "#0f766e",
      signatureLabel: selectedTemplate.signatureLabel ?? "",
      isDefault: selectedTemplate.isDefault,
    });
  }, [selectedTemplate]);

  const saveTemplate = async () => {
    if (!templateDraft.name.trim()) {
      toast.error("Nom du modèle requis");
      return;
    }
    try {
      const response = editingTemplateId
        ? await api.patch<DocumentTemplate>(
            `/documents/templates/${editingTemplateId}`,
            {
              ...templateDraft,
              documentTypeId: templateDraft.documentTypeId || null,
            },
          )
        : await api.post<DocumentTemplate>("/documents/templates", {
            ...templateDraft,
            documentTypeId: templateDraft.documentTypeId || undefined,
          });
      toast.success("Modèle enregistré");
      await load();
      setSelectedTemplateId(String(response.data.id));
    } catch {
      toast.error("Échec de l'enregistrement du modèle");
    }
  };

  const generateReleve = async () => {
    if (!studentId) {
      toast.error("Sélectionnez un étudiant");
      return;
    }
    setGenerating(true);
    try {
      const response = await api.post<DocumentItem>(
        `/documents/generate/releve/${studentId}`,
        {
          templateId: selectedTemplateId
            ? Number(selectedTemplateId)
            : undefined,
          documentTypeId: templateDraft.documentTypeId || undefined,
        },
      );
      toast.success("Relevé généré");
      await load();
      window.open(
        `/api/documents/${response.data.id}/file`,
        "_blank",
        "noopener,noreferrer",
      );
    } catch {
      toast.error("Échec de la génération du relevé");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestion des documents"
        description="Téléversez, générez et gérez les documents associés aux étudiants."
      />

      <div className="surface-card space-y-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          Téléverser un document
        </p>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="field-stack">
            <label className="field-label">Type de propriétaire</label>
            <select
              className="input"
              value={ownerType}
              onChange={(e) =>
                setOwnerType(e.target.value as "student" | "teacher")
              }
            >
              <option value="student">Étudiant</option>
              <option value="teacher">Enseignant</option>
            </select>
          </div>
          <div className="field-stack">
            <label className="field-label">
              {ownerType === "student" ? "Étudiant" : "Enseignant"}
            </label>
            {ownerType === "student" ? (
              <select
                className="input"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
              >
                <option value="">— sélectionner —</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.fullName}
                  </option>
                ))}
              </select>
            ) : (
              <select
                className="input"
                value={teacherId}
                onChange={(e) => setTeacherId(e.target.value)}
              >
                <option value="">— sélectionner —</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.firstName} {t.lastName}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="field-stack">
            <label className="field-label">Fichier</label>
            <input
              className="input"
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ExportDataButton />
          <button
            className="btn-primary"
            type="button"
            onClick={async () => {
              if (!file) return;
              const formData = new FormData();
              if (ownerType === "student") {
                if (!studentId) return;
                formData.append("studentId", studentId);
              } else {
                if (!teacherId) return;
                formData.append("teacherId", teacherId);
              }
              formData.append("file", file);
              try {
                await api.post("/documents/upload", formData, {
                  headers: { "Content-Type": "multipart/form-data" },
                });
                setStatus("Téléversement réussi");
                toast.success("Document téléversé avec succès");
                setFile(null);
                void load();
              } catch {
                toast.error("Échec du téléversement");
              }
            }}
          >
            Téléverser
          </button>
        </div>
        {status ? <p className="text-sm text-primary">{status}</p> : null}
      </div>

      <div className="surface-card space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              Modèles et génération
            </p>
            <h2 className="text-lg font-semibold text-slate-900">
              Relevé de notes PDF
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="btn-outline"
              type="button"
              onClick={() => {
                setEditingTemplateId(null);
                setSelectedTemplateId("");
                setTemplateDraft(emptyTemplate());
              }}
            >
              Nouveau modèle
            </button>
            {editingTemplateId ? (
              <button
                className="btn-outline"
                type="button"
                onClick={async () => {
                  if (!window.confirm("Supprimer ce modèle ?")) return;
                  try {
                    await api.delete(
                      `/documents/templates/${editingTemplateId}`,
                    );
                    toast.success("Modèle supprimé");
                    setEditingTemplateId(null);
                    setTemplateDraft(emptyTemplate());
                    await load();
                  } catch {
                    toast.error("Échec de la suppression");
                  }
                }}
              >
                Supprimer modèle
              </button>
            ) : null}
            <button
              className="btn-primary"
              type="button"
              onClick={saveTemplate}
            >
              Enregistrer modèle
            </button>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-4">
          <div className="field-stack">
            <label className="field-label">Modèle</label>
            <select
              className="input"
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
            >
              <option value="">Nouveau modèle</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                  {template.isDefault ? " · défaut" : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="field-stack">
            <label className="field-label">Type demandé</label>
            <select
              className="input"
              value={templateDraft.documentTypeId ?? ""}
              onChange={(e) =>
                setTemplateDraft((draft) => ({
                  ...draft,
                  documentTypeId: e.target.value
                    ? Number(e.target.value)
                    : null,
                }))
              }
            >
              <option value="">Aucun type lié</option>
              {documentTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field-stack">
            <label className="field-label">Étudiant</label>
            <select
              className="input"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
            >
              <option value="">— sélectionner —</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.fullName}
                </option>
              ))}
            </select>
          </div>
          <div className="field-stack">
            <label className="field-label">Action</label>
            <button
              className="btn-primary h-11"
              type="button"
              disabled={generating}
              onClick={generateReleve}
            >
              {generating ? "Génération..." : "Générer le PDF"}
            </button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="field-stack">
            <label className="field-label">Nom du modèle</label>
            <input
              className="input"
              value={templateDraft.name}
              onChange={(e) =>
                setTemplateDraft((draft) => ({
                  ...draft,
                  name: e.target.value,
                }))
              }
            />
          </div>
          <div className="grid grid-cols-[1fr_120px] gap-3">
            <div className="field-stack">
              <label className="field-label">Signature</label>
              <input
                className="input"
                value={templateDraft.signatureLabel ?? ""}
                onChange={(e) =>
                  setTemplateDraft((draft) => ({
                    ...draft,
                    signatureLabel: e.target.value,
                  }))
                }
              />
            </div>
            <div className="field-stack">
              <label className="field-label">Couleur</label>
              <input
                className="input h-11"
                type="color"
                value={templateDraft.primaryColor ?? "#0f766e"}
                onChange={(e) =>
                  setTemplateDraft((draft) => ({
                    ...draft,
                    primaryColor: e.target.value,
                  }))
                }
              />
            </div>
          </div>
          <div className="field-stack md:col-span-2">
            <label className="field-label">En-tête</label>
            <textarea
              className="input min-h-24"
              value={templateDraft.header}
              onChange={(e) =>
                setTemplateDraft((draft) => ({
                  ...draft,
                  header: e.target.value,
                }))
              }
            />
          </div>
          <div className="field-stack md:col-span-2">
            <label className="field-label">Texte principal</label>
            <textarea
              className="input min-h-28"
              value={templateDraft.body}
              onChange={(e) =>
                setTemplateDraft((draft) => ({
                  ...draft,
                  body: e.target.value,
                }))
              }
            />
          </div>
          <div className="field-stack md:col-span-2">
            <label className="field-label">Pied de page</label>
            <textarea
              className="input min-h-20"
              value={templateDraft.footer ?? ""}
              onChange={(e) =>
                setTemplateDraft((draft) => ({
                  ...draft,
                  footer: e.target.value,
                }))
              }
            />
          </div>
        </div>

        <p className="text-xs text-slate-500">
          Variables disponibles: {"{{studentName}}"}, {"{{codeMassar}}"},{" "}
          {"{{codeEtudiant}}"}, {"{{className}}"}, {"{{filiereName}}"},{" "}
          {"{{academicYear}}"}, {"{{average}}"}, {"{{generatedAt}}"}.
        </p>
      </div>

      <div className="data-table-wrap">
        <div className="table-scroll">
          <table className="table-base">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Type</th>
                <th>Catégorie</th>
                <th>Propriétaire</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((doc) => (
                <tr key={doc.id}>
                  <td>{doc.name}</td>
                  <td>{doc.mimeType}</td>
                  <td>{doc.category ?? "—"}</td>
                  <td>
                    {doc.student
                      ? `Étudiant · ${doc.student.fullName}`
                      : doc.teacher
                        ? `Enseignant · ${doc.teacher.firstName} ${doc.teacher.lastName}`
                        : "—"}
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-2">
                      <a
                        className="btn-outline"
                        href={`/api/documents/${doc.id}/file`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Ouvrir
                      </a>
                      <button
                        className="btn-outline"
                        type="button"
                        onClick={() => {
                          setEditingId(doc.id);
                          setEditName(doc.name);
                          setEditOwnerType(
                            doc.teacherId ? "teacher" : "student",
                          );
                        }}
                      >
                        Modifier
                      </button>
                      <button
                        className="btn-outline"
                        type="button"
                        onClick={async () => {
                          if (!window.confirm("Supprimer ce document ?"))
                            return;
                          try {
                            await api.delete(`/documents/${doc.id}`);
                            toast.success("Document supprimé");
                            void load();
                          } catch {
                            toast.error("Échec de la suppression");
                          }
                        }}
                      >
                        Supprimer
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editingId ? (
        <div className="surface-card space-y-3">
          <h3 className="text-sm font-semibold text-slate-700">
            Modifier le document
          </h3>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="field-stack">
              <label className="field-label">Nom</label>
              <input
                className="input"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="field-stack">
              <label className="field-label">Type</label>
              <select
                className="input"
                value={editOwnerType}
                onChange={(e) =>
                  setEditOwnerType(e.target.value as "student" | "teacher")
                }
              >
                <option value="student">Étudiant</option>
                <option value="teacher">Enseignant</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              className="btn-primary"
              type="button"
              onClick={async () => {
                try {
                  await api.patch(`/documents/${editingId}`, {
                    name: editName,
                  });
                  toast.success("Document mis à jour");
                  setEditingId(null);
                  setEditName("");
                  void load();
                } catch {
                  toast.error("Échec de la mise à jour");
                }
              }}
            >
              Enregistrer
            </button>
            <button
              className="btn-outline"
              type="button"
              onClick={() => setEditingId(null)}
            >
              Annuler
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
