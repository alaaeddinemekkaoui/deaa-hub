"use client";

import { PointerEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ExportDataButton } from "@/components/admin/export-data-button";
import { PageHeader } from "@/components/admin/page-header";
import { api, fetchCollectionRef, getApiErrorMessage } from "@/services/api";
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
  eSignatureEnabled?: boolean;
  eSignatureSignerName?: string | null;
  eSignatureSignerTitle?: string | null;
  eSignatureStampText?: string | null;
  eSignaturePositionX?: number;
  eSignaturePositionY?: number;
  eSignatureWidth?: number;
  eSignatureHeight?: number;
  docxTemplateName?: string | null;
  docxTemplatePath?: string | null;
  isDefault: boolean;
  documentType?: { id: number; name: string } | null;
};

type Student = {
  id: number;
  fullName: string;
  codeMassar?: string | null;
  codeEtudiant?: string | null;
  anneeAcademique?: string | null;
  academicClass?: { name?: string | null; academicYear?: string | null } | null;
  filiere?: { name?: string | null } | null;
};
type Teacher = { id: number; firstName: string; lastName: string };
type DocumentType = { id: number; name: string };

const emptyTemplate = (): Omit<DocumentTemplate, "id"> => ({
  name: "",
  type: "releve_note",
  documentTypeId: null,
  header: "",
  body: "Le présent relevé récapitule les notes enregistrées pour {{studentName}} ({{codeMassar}}) en {{academicYear}}.",
  footer: "",
  primaryColor: "#111827",
  signatureLabel: "Direction des Affaires Académiques",
  eSignatureEnabled: true,
  eSignatureSignerName: "DEAA Hub",
  eSignatureSignerTitle: "Direction des Affaires Académiques",
  eSignatureStampText: "Signé électroniquement",
  eSignaturePositionX: 0.62,
  eSignaturePositionY: 0.82,
  eSignatureWidth: 0.24,
  eSignatureHeight: 0.08,
  isDefault: false,
});

const signedTemplate = (
  documentTypeId: number | null,
): Omit<DocumentTemplate, "id"> => ({
  name: "Modèle signé électroniquement",
  type: "student_request",
  documentTypeId,
  header: "",
  body: "Document préparé pour {{studentName}} ({{codeMassar}}), inscrit(e) en {{className}} - {{filiereName}}.",
  footer: "",
  primaryColor: "#111827",
  signatureLabel: "Direction des Affaires Académiques",
  eSignatureEnabled: true,
  eSignatureSignerName: "Service scolarité",
  eSignatureSignerTitle: "Direction des Affaires Académiques",
  eSignatureStampText: "Signé électroniquement",
  eSignaturePositionX: 0.62,
  eSignaturePositionY: 0.82,
  eSignatureWidth: 0.24,
  eSignatureHeight: 0.08,
  isDefault: false,
});

const studentTemplateFields = [
  { label: "Nom étudiant", token: "{{studentName}}", key: "studentName" },
  { label: "Code Massar", token: "{{codeMassar}}", key: "codeMassar" },
  { label: "Code étudiant", token: "{{codeEtudiant}}", key: "codeEtudiant" },
  { label: "Classe", token: "{{className}}", key: "className" },
  { label: "Filière", token: "{{filiereName}}", key: "filiereName" },
  { label: "Année académique", token: "{{academicYear}}", key: "academicYear" },
  { label: "Moyenne", token: "{{average}}", key: "average" },
  { label: "Date génération", token: "{{generatedAt}}", key: "generatedAt" },
] as const;

const templateRequestPayload = (draft: Omit<DocumentTemplate, "id">) => ({
  name: draft.name,
  type: draft.type,
  documentTypeId: draft.documentTypeId,
  header: draft.header,
  body: draft.body,
  footer: draft.footer,
  primaryColor: draft.primaryColor,
  signatureLabel: draft.signatureLabel,
  eSignatureEnabled: draft.eSignatureEnabled,
  eSignatureSignerName: draft.eSignatureSignerName,
  eSignatureSignerTitle: draft.eSignatureSignerTitle,
  eSignatureStampText: draft.eSignatureStampText,
  eSignaturePositionX: draft.eSignaturePositionX,
  eSignaturePositionY: draft.eSignaturePositionY,
  eSignatureWidth: draft.eSignatureWidth,
  eSignatureHeight: draft.eSignatureHeight,
  isDefault: draft.isDefault,
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
  const [templateDocxFile, setTemplateDocxFile] = useState<File | null>(null);
  const [generating, setGenerating] = useState(false);
  const [signaturePreviewUrl, setSignaturePreviewUrl] = useState<string | null>(null);
  const [draggingSignature, setDraggingSignature] = useState(false);
  const sandboxPageRef = useRef<HTMLDivElement>(null);

  const selectedTemplate = useMemo(
    () =>
      templates.find((template) => String(template.id) === selectedTemplateId),
    [selectedTemplateId, templates],
  );
  const selectedStudent = useMemo(
    () => students.find((student) => String(student.id) === studentId) ?? null,
    [studentId, students],
  );
  const studentPreviewValues = useMemo(
    () => ({
      studentName: selectedStudent?.fullName ?? "Nom étudiant",
      codeMassar: selectedStudent?.codeMassar ?? "Code Massar",
      codeEtudiant: selectedStudent?.codeEtudiant ?? "Code étudiant",
      className: selectedStudent?.academicClass?.name ?? "Classe",
      filiereName: selectedStudent?.filiere?.name ?? "Filière",
      academicYear:
        selectedStudent?.academicClass?.academicYear ??
        selectedStudent?.anneeAcademique ??
        "Année académique",
      average: "Moyenne",
      generatedAt: new Date().toLocaleDateString("fr-FR"),
    }),
    [selectedStudent],
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
    let objectUrl: string | null = null;
    void api
      .get<Blob>("/documents/e-signature/image", { responseType: "blob" })
      .then((response) => {
        objectUrl = URL.createObjectURL(response.data);
        setSignaturePreviewUrl(objectUrl);
      })
      .catch(() => {
        setSignaturePreviewUrl(null);
      });

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, []);

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
      eSignatureEnabled: selectedTemplate.eSignatureEnabled ?? true,
      eSignatureSignerName:
        selectedTemplate.eSignatureSignerName ?? "DEAA Hub",
      eSignatureSignerTitle:
        selectedTemplate.eSignatureSignerTitle ??
        "Direction des Affaires Académiques",
      eSignatureStampText:
        selectedTemplate.eSignatureStampText ?? "Signé électroniquement",
      eSignaturePositionX: selectedTemplate.eSignaturePositionX ?? 0.62,
      eSignaturePositionY: selectedTemplate.eSignaturePositionY ?? 0.82,
      eSignatureWidth: selectedTemplate.eSignatureWidth ?? 0.24,
      eSignatureHeight: selectedTemplate.eSignatureHeight ?? 0.08,
      docxTemplateName: selectedTemplate.docxTemplateName ?? null,
      docxTemplatePath: selectedTemplate.docxTemplatePath ?? null,
      isDefault: selectedTemplate.isDefault,
    });
    setTemplateDocxFile(null);
  }, [selectedTemplate]);

  const saveTemplate = async () => {
    if (!templateDraft.name.trim()) {
      toast.error("Nom du modèle requis");
      return;
    }
    try {
      const templatePayload = templateRequestPayload(templateDraft);
      const response = editingTemplateId
        ? await api.patch<DocumentTemplate>(
            `/documents/templates/${editingTemplateId}`,
            {
              ...templatePayload,
              documentTypeId: templateDraft.documentTypeId || null,
            },
          )
        : await api.post<DocumentTemplate>("/documents/templates", {
            ...templatePayload,
            documentTypeId: templateDraft.documentTypeId || undefined,
          });
      if (templateDocxFile) {
        const form = new FormData();
        form.append("file", templateDocxFile);
        await api.post(`/documents/templates/${response.data.id}/docx`, form, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setTemplateDocxFile(null);
      }
      toast.success("Modèle enregistré");
      await load();
      setSelectedTemplateId(String(response.data.id));
    } catch {
      toast.error("Échec de l'enregistrement du modèle");
    }
  };

  const openDocument = async (
    doc: Pick<DocumentItem, "id" | "name" | "mimeType">,
    mode: "inline" | "download" = "inline",
  ) => {
    try {
      const response = await api.get<Blob>(`/documents/${doc.id}/file`, {
        responseType: "blob",
      });
      const blob = new Blob([response.data], { type: doc.mimeType });
      const url = URL.createObjectURL(blob);

      if (mode === "download") {
        const link = document.createElement("a");
        link.href = url;
        link.download = doc.name;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        return;
      }

      window.open(url, "_blank", "noopener,noreferrer");
      window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Ouverture impossible"));
    }
  };

  const insertStudentField = (token: string) => {
    setTemplateDraft((draft) => ({
      ...draft,
      body: `${draft.body ?? ""}${token}`,
    }));
  };

  const clampSignaturePlacement = (
    positionX: number,
    positionY: number,
    width = templateDraft.eSignatureWidth ?? 0.24,
    height = templateDraft.eSignatureHeight ?? 0.08,
  ) => ({
    eSignaturePositionX: Math.min(Math.max(positionX, 0), 1 - width),
    eSignaturePositionY: Math.min(Math.max(positionY, 0), 1 - height),
  });

  const moveSignature = (event: PointerEvent<HTMLDivElement>) => {
    if (!draggingSignature || !sandboxPageRef.current) return;
    const bounds = sandboxPageRef.current.getBoundingClientRect();
    const width = templateDraft.eSignatureWidth ?? 0.24;
    const height = templateDraft.eSignatureHeight ?? 0.08;
    setTemplateDraft((draft) => ({
      ...draft,
      ...clampSignaturePlacement(
        (event.clientX - bounds.left) / bounds.width - width / 2,
        (event.clientY - bounds.top) / bounds.height - height / 2,
        width,
        height,
      ),
    }));
  };

  const generateReleve = async (format: "pdf" | "docx") => {
    if (!studentId) {
      toast.error("Sélectionnez un étudiant");
      return;
    }
    if (format === "docx" && !selectedTemplate?.docxTemplateName) {
      toast.error("Aucun fichier DOCX lié au modèle sélectionné");
      return;
    }
    setGenerating(true);
    try {
      const endpoint =
        format === "docx"
          ? `/documents/generate/student/${studentId}/docx`
          : `/documents/generate/student/${studentId}`;
      const response = await api.post<DocumentItem>(
        endpoint,
        {
          templateId: selectedTemplateId
            ? Number(selectedTemplateId)
            : undefined,
          documentTypeId: templateDraft.documentTypeId || undefined,
        },
      );
      toast.success(
        format === "docx" ? "Document DOCX généré" : "Document PDF généré",
      );
      await load();
      await openDocument(response.data, format === "docx" ? "download" : "inline");
    } catch {
      toast.error("Échec de la génération du document");
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
              Génération de documents PDF
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
                setTemplateDocxFile(null);
              }}
            >
              Nouveau modèle
            </button>
            <button
              className="btn-outline"
              type="button"
              onClick={() => {
                setEditingTemplateId(null);
                setSelectedTemplateId("");
                setTemplateDraft(
                  signedTemplate(templateDraft.documentTypeId ?? null),
                );
                setTemplateDocxFile(null);
              }}
            >
              Modèle e-signature
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
              onChange={(e) => {
                const nextDocumentTypeId = e.target.value
                  ? Number(e.target.value)
                  : null;
                const matchingTemplate = templates.find(
                  (template) => template.documentTypeId === nextDocumentTypeId,
                );
                setTemplateDraft((draft) => ({
                  ...draft,
                  documentTypeId: nextDocumentTypeId,
                }));
                if (matchingTemplate) {
                  setSelectedTemplateId(String(matchingTemplate.id));
                }
              }}
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
            <div className="flex gap-2">
              <button
                className="btn-outline h-11 flex-1"
                type="button"
                disabled={generating || !selectedTemplate?.docxTemplateName}
                onClick={() => generateReleve("docx")}
                title={
                  selectedTemplate?.docxTemplateName
                    ? "Générer le fichier DOCX avec l'en-tête du modèle"
                    : "Aucun modèle DOCX lié"
                }
              >
                {generating ? "..." : "Extraire DOCX"}
              </button>
              <button
                className="btn-primary h-11 flex-1"
                type="button"
                disabled={generating}
                onClick={() => generateReleve("pdf")}
              >
                {generating ? "Génération..." : "PDF"}
              </button>
            </div>
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
          <div className="field-stack">
            <label className="field-label">Type du modèle</label>
            <select
              className="input"
              value={templateDraft.type}
              onChange={(event) =>
                setTemplateDraft((draft) => ({
                  ...draft,
                  type: event.target.value,
                }))
              }
            >
              <option value="releve_note">Relevé de notes</option>
              <option value="student_request">Document administratif</option>
            </select>
          </div>
          <div className="field-stack md:col-span-2">
            <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={templateDraft.eSignatureEnabled ?? true}
                onChange={(e) =>
                  setTemplateDraft((draft) => ({
                    ...draft,
                    eSignatureEnabled: e.target.checked,
                  }))
                }
              />
              Signature électronique automatique
            </label>
          </div>
          <div className="md:col-span-2 grid gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 lg:grid-cols-[280px_1fr]">
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                  Sandbox corps du document
                </p>
                <h3 className="mt-1 text-sm font-semibold text-slate-900">
                  Champs étudiant et placement signature
                </h3>
              </div>
              <div className="field-stack">
                <label className="field-label">Données étudiant</label>
                <select
                  className="input"
                  defaultValue=""
                  onChange={(e) => {
                    if (!e.target.value) return;
                    insertStudentField(e.target.value);
                    e.target.value = "";
                  }}
                >
                  <option value="">Ajouter un champ...</option>
                  {studentTemplateFields.map((field) => (
                    <option key={field.token} value={field.token}>
                      {field.label} · {studentPreviewValues[field.key]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="field-stack">
                  <label className="field-label">Largeur signature</label>
                  <input
                    className="input"
                    type="range"
                    min="0.12"
                    max="0.45"
                    step="0.01"
                    value={templateDraft.eSignatureWidth ?? 0.24}
                    onChange={(e) => {
                      const width = Number(e.target.value);
                      setTemplateDraft((draft) => ({
                        ...draft,
                        eSignatureWidth: width,
                        ...clampSignaturePlacement(
                          draft.eSignaturePositionX ?? 0.62,
                          draft.eSignaturePositionY ?? 0.82,
                          width,
                          draft.eSignatureHeight ?? 0.08,
                        ),
                      }));
                    }}
                  />
                </div>
                <div className="field-stack">
                  <label className="field-label">Hauteur signature</label>
                  <input
                    className="input"
                    type="range"
                    min="0.04"
                    max="0.2"
                    step="0.01"
                    value={templateDraft.eSignatureHeight ?? 0.08}
                    onChange={(e) => {
                      const height = Number(e.target.value);
                      setTemplateDraft((draft) => ({
                        ...draft,
                        eSignatureHeight: height,
                        ...clampSignaturePlacement(
                          draft.eSignaturePositionX ?? 0.62,
                          draft.eSignaturePositionY ?? 0.82,
                          draft.eSignatureWidth ?? 0.24,
                          height,
                        ),
                      }));
                    }}
                  />
                </div>
              </div>
              <p className="text-xs text-slate-500">
                La génération PDF utilise uniquement le corps du modèle et place l&apos;image e-signature sur la dernière page, sans détail ni référence.
              </p>
            </div>
            <div
              ref={sandboxPageRef}
              className="relative mx-auto aspect-[210/297] w-full max-w-[430px] overflow-hidden rounded border border-slate-300 bg-white shadow-sm"
              onPointerMove={moveSignature}
              onPointerUp={() => setDraggingSignature(false)}
              onPointerLeave={() => setDraggingSignature(false)}
            >
              <div className="absolute inset-x-8 top-8 h-10 rounded bg-slate-100" />
              <div className="absolute left-8 right-8 top-24 space-y-2">
                <div className="h-3 w-2/3 rounded bg-slate-200" />
                <div className="h-3 w-full rounded bg-slate-100" />
                <div className="h-3 w-5/6 rounded bg-slate-100" />
                <div className="mt-6 grid grid-cols-2 gap-3">
                  <div className="h-14 rounded border border-slate-200 bg-slate-50" />
                  <div className="h-14 rounded border border-slate-200 bg-slate-50" />
                </div>
              </div>
              <div className="absolute bottom-8 left-8 right-8 h-px bg-slate-100" />
              {templateDraft.eSignatureEnabled ? (
                <div
                  className="absolute cursor-move touch-none rounded border border-dashed border-emerald-500/70 bg-emerald-50/40 p-1"
                  style={{
                    left: `${(templateDraft.eSignaturePositionX ?? 0.62) * 100}%`,
                    top: `${(templateDraft.eSignaturePositionY ?? 0.82) * 100}%`,
                    width: `${(templateDraft.eSignatureWidth ?? 0.24) * 100}%`,
                    height: `${(templateDraft.eSignatureHeight ?? 0.08) * 100}%`,
                  }}
                  onPointerDown={(e) => {
                    e.currentTarget.setPointerCapture(e.pointerId);
                    setDraggingSignature(true);
                  }}
                >
                  {signaturePreviewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={signaturePreviewUrl}
                      alt="E-signature"
                      className="h-full w-full object-contain"
                      draggable={false}
                    />
                  ) : (
                    <span className="flex h-full items-center justify-center text-[10px] font-semibold text-emerald-700">
                      E-signature
                    </span>
                  )}
                </div>
              ) : null}
            </div>
          </div>
          <div className="field-stack md:col-span-2">
            <label className="field-label">Modèle source DOCX</label>
            <input
              className="input"
              type="file"
              accept=".docx"
              onChange={(e) => setTemplateDocxFile(e.target.files?.[0] ?? null)}
            />
            <p className="text-xs text-slate-500">
              {templateDraft.docxTemplateName
                ? `Fichier actuel: ${templateDraft.docxTemplateName}`
                : "Aucun fichier DOCX lié à ce modèle."}
            </p>
          </div>
          <div className="field-stack md:col-span-2">
            <label className="field-label">Corps du document</label>
            <textarea
              className="input min-h-48"
              value={templateDraft.body}
              onChange={(e) =>
                setTemplateDraft((draft) => ({
                  ...draft,
                  body: e.target.value,
                }))
              }
            />
          </div>
        </div>

        <p className="text-xs text-slate-500">
          Variables disponibles: {"{{studentName}}"}, {"{{codeMassar}}"},{" "}
          {"{{codeEtudiant}}"}, {"{{className}}"}, {"{{filiereName}}"},{" "}
          {"{{academicYear}}"}, {"{{average}}"}, {"{{generatedAt}}"},{" "}
          {"{{body}}"}, {"{{footer}}"}, {"{{gradesText}}"}.
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
                      <button
                        className="btn-outline"
                        type="button"
                        onClick={() => void openDocument(doc)}
                      >
                        Ouvrir
                      </button>
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
