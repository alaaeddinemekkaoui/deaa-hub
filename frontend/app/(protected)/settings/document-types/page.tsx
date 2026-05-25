'use client';

import { useEffect, useState } from 'react';
import { FileText, FileUp, Pencil, Plus, Trash2 } from 'lucide-react';
import { EmptyState } from '@/components/admin/empty-state';
import { ModalShell } from '@/components/admin/modal-shell';
import { PageHeader } from '@/components/admin/page-header';
import { api, getApiErrorMessage } from '@/services/api';
import { toast } from 'sonner';

type DocType = {
  id: number;
  name: string;
  description?: string;
  createdAt: string;
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
};

export default function DocumentTypesPage() {
  const [rows, setRows] = useState<DocType[]>([]);
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [templateSaving, setTemplateSaving] = useState(false);
  const [templateDocType, setTemplateDocType] = useState<DocType | null>(null);
  const [templateId, setTemplateId] = useState<number | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [templateHeader, setTemplateHeader] = useState('');
  const [templateBody, setTemplateBody] = useState('');
  const [templateFooter, setTemplateFooter] = useState('');
  const [templateDocxFile, setTemplateDocxFile] = useState<File | null>(null);
  const [templateSignatureEnabled, setTemplateSignatureEnabled] = useState(true);
  const [templateSignatureX, setTemplateSignatureX] = useState(0.62);
  const [templateSignatureY, setTemplateSignatureY] = useState(0.82);
  const [templateSignatureWidth, setTemplateSignatureWidth] = useState(0.24);
  const [templateSignatureHeight, setTemplateSignatureHeight] = useState(0.08);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [typesRes, templatesRes] = await Promise.all([
          api.get<DocType[]>('/document-types'),
          api.get<DocumentTemplate[]>('/documents/templates'),
        ]);
        setRows(Array.isArray(typesRes.data) ? typesRes.data : []);
        setTemplates(Array.isArray(templatesRes.data) ? templatesRes.data : []);
      } catch (err) {
        toast.error(getApiErrorMessage(err, 'Impossible de charger les types de documents'));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [refreshKey]);

  const resetForm = () => { setEditingId(null); setName(''); setDescription(''); };

  const openCreate = () => { resetForm(); setModalOpen(true); };

  const openEdit = (row: DocType) => {
    setEditingId(row.id);
    setName(row.name);
    setDescription(row.description ?? '');
    setModalOpen(true);
  };

  const closeModal = () => { setModalOpen(false); resetForm(); };

  const openTemplate = (row: DocType) => {
    const existing = templates.find((template) => template.documentTypeId === row.id);
    setTemplateDocType(row);
    setTemplateId(existing?.id ?? null);
    setTemplateName(existing?.name ?? `Modèle - ${row.name}`);
    setTemplateHeader(
      existing?.header ??
        '',
    );
    setTemplateBody(
      existing?.body ??
        'Document préparé pour {{studentName}} ({{codeMassar}}), inscrit(e) en {{className}} - {{filiereName}}.',
    );
    setTemplateFooter(existing?.footer ?? '');
    setTemplateSignatureEnabled(existing?.eSignatureEnabled ?? true);
    setTemplateSignatureX(existing?.eSignaturePositionX ?? 0.62);
    setTemplateSignatureY(existing?.eSignaturePositionY ?? 0.82);
    setTemplateSignatureWidth(existing?.eSignatureWidth ?? 0.24);
    setTemplateSignatureHeight(existing?.eSignatureHeight ?? 0.08);
    setTemplateDocxFile(null);
    setTemplateModalOpen(true);
  };

  const closeTemplateModal = () => {
    setTemplateModalOpen(false);
    setTemplateDocType(null);
    setTemplateId(null);
    setTemplateDocxFile(null);
    setTemplateSignatureEnabled(true);
    setTemplateSignatureX(0.62);
    setTemplateSignatureY(0.82);
    setTemplateSignatureWidth(0.24);
    setTemplateSignatureHeight(0.08);
  };

  const onSubmit = async () => {
    if (!name.trim()) { toast.error('Le nom est requis'); return; }
    setSaving(true);
    try {
      if (editingId) {
        await api.patch(`/document-types/${editingId}`, {
          name: name.trim(),
          description: description.trim() || undefined,
        });
        toast.success('Type mis à jour');
      } else {
        await api.post('/document-types', {
          name: name.trim(),
          description: description.trim() || undefined,
        });
        toast.success('Type créé');
      }
      closeModal();
      setRefreshKey((k) => k + 1);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Échec de l'enregistrement"));
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id: number, docName: string) => {
    if (!window.confirm(`Supprimer le type "${docName}" ?`)) return;
    try {
      await api.delete(`/document-types/${id}`);
      toast.success('Type supprimé');
      setRefreshKey((k) => k + 1);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Impossible de supprimer'));
    }
  };

  const onSaveTemplate = async () => {
    if (!templateDocType) return;
    if (!templateName.trim()) { toast.error('Le nom du modèle est requis'); return; }
    setTemplateSaving(true);
    try {
      const payload = {
        name: templateName.trim(),
        type: templateDocType.name === 'Relevé de notes' ? 'releve_note' : 'student_request',
        documentTypeId: templateDocType.id,
        header: templateHeader.trim(),
        body: templateBody.trim(),
        footer: templateFooter.trim(),
        primaryColor: '#111827',
        signatureLabel: 'Direction des Affaires Académiques',
        eSignatureEnabled: templateSignatureEnabled,
        eSignatureSignerName: 'Service scolarité',
        eSignatureSignerTitle: 'Direction des Affaires Académiques',
        eSignatureStampText: 'Signé électroniquement',
        eSignaturePositionX: templateSignatureX,
        eSignaturePositionY: templateSignatureY,
        eSignatureWidth: templateSignatureWidth,
        eSignatureHeight: templateSignatureHeight,
      };
      const saved = templateId
        ? await api.patch<DocumentTemplate>(`/documents/templates/${templateId}`, payload)
        : await api.post<DocumentTemplate>('/documents/templates', payload);

      if (templateDocxFile) {
        const form = new FormData();
        form.append('file', templateDocxFile);
        await api.post(`/documents/templates/${saved.data.id}/docx`, form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      toast.success('Modèle enregistré');
      closeTemplateModal();
      setRefreshKey((k) => k + 1);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Échec de l'enregistrement du modèle"));
    } finally {
      setTemplateSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Paramètres"
        title="Types de documents"
        description="Gérez les catégories de documents administratifs utilisées dans les demandes."
      />

      <section className="surface-card space-y-5">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Liste des types</h2>
            <p className="panel-copy">
              Ces types apparaissent lors de la création d&apos;une demande de document.
            </p>
          </div>
          <button type="button" className="btn-primary flex items-center gap-2" onClick={openCreate}>
            <Plus size={14} />
            Nouveau type
          </button>
        </div>

        {loading ? (
          <div className="empty-note">Chargement…</div>
        ) : rows.length === 0 ? (
          <EmptyState
            title="Aucun type de document"
            description="Créez vos premiers types pour les utiliser dans les demandes."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="pb-3 pr-4">Nom</th>
                  <th className="pb-3 pr-4">Description</th>
                  <th className="pb-3 pr-4">Modèle</th>
                  <th className="pb-3 pr-4">Créé le</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => (
                  <tr key={row.id} className="group">
                    {(() => {
                      const template = templates.find((item) => item.documentTypeId === row.id);
                      return (
                        <>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <FileText size={14} className="shrink-0 text-slate-400" />
                        <span className="font-semibold text-slate-900">{row.name}</span>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-slate-500">
                      {row.description ?? <span className="text-slate-300 italic">—</span>}
                    </td>
                    <td className="py-3 pr-4 text-slate-500">
                      {template ? (
                        <div>
                          <p className="font-medium text-slate-700">{template.name}</p>
                          <p className="text-xs text-slate-400">
                            {template.docxTemplateName ?? 'Modèle texte'}
                          </p>
                        </div>
                      ) : (
                        <span className="text-slate-300 italic">Aucun</span>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-slate-500">
                      {new Date(row.createdAt).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          className="icon-btn"
                          onClick={() => openTemplate(row)}
                          title="Créer le modèle"
                        >
                          <FileUp size={14} />
                        </button>
                        <button
                          type="button"
                          className="icon-btn"
                          onClick={() => openEdit(row)}
                          title="Modifier"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          className="icon-btn text-red-500 hover:bg-red-50"
                          onClick={() => onDelete(row.id, row.name)}
                          title="Supprimer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                        </>
                      );
                    })()}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <ModalShell
        open={modalOpen}
        onClose={closeModal}
        title={editingId ? 'Modifier le type de document' : 'Nouveau type de document'}
      >
        <div className="space-y-4">
          <div className="field-stack">
            <label className="field-label">
              Nom <span className="text-red-500">*</span>
            </label>
            <input
              className="input"
              placeholder="ex: Attestation de scolarité"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
            />
          </div>

          <div className="field-stack">
            <label className="field-label">Description</label>
            <textarea
              className="input resize-none"
              rows={3}
              placeholder="Description optionnelle…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-outline" onClick={closeModal}>
              Annuler
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={onSubmit}
              disabled={saving || !name.trim()}
            >
              {saving ? 'Enregistrement…' : editingId ? 'Mettre à jour' : 'Créer'}
            </button>
          </div>
        </div>
      </ModalShell>

      <ModalShell
        open={templateModalOpen}
        onClose={closeTemplateModal}
        title={templateId ? 'Modifier le modèle' : 'Créer un modèle'}
        description={templateDocType ? `Type: ${templateDocType.name}` : undefined}
      >
        <div className="space-y-4">
          <div className="field-stack">
            <label className="field-label">Nom du modèle</label>
            <input
              className="input"
              value={templateName}
              onChange={(event) => setTemplateName(event.target.value)}
            />
          </div>
          <div className="field-stack">
            <label className="field-label">Fichier DOCX optionnel</label>
            <input
              className="input"
              type="file"
              accept=".docx"
              onChange={(event) => setTemplateDocxFile(event.target.files?.[0] ?? null)}
            />
          </div>
          <div className="field-stack">
            <label className="field-label">Corps du document</label>
            <textarea
              className="input min-h-40"
              value={templateBody}
              onChange={(event) => setTemplateBody(event.target.value)}
            />
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <label className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={templateSignatureEnabled}
                onChange={(event) => setTemplateSignatureEnabled(event.target.checked)}
              />
              Signature électronique
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="field-stack">
                <label className="field-label">Position horizontale</label>
                <input
                  className="input"
                  type="range"
                  min="0"
                  max={Math.max(0, 1 - templateSignatureWidth)}
                  step="0.01"
                  value={templateSignatureX}
                  onChange={(event) => setTemplateSignatureX(Number(event.target.value))}
                />
              </div>
              <div className="field-stack">
                <label className="field-label">Position verticale</label>
                <input
                  className="input"
                  type="range"
                  min="0"
                  max={Math.max(0, 1 - templateSignatureHeight)}
                  step="0.01"
                  value={templateSignatureY}
                  onChange={(event) => setTemplateSignatureY(Number(event.target.value))}
                />
              </div>
              <div className="field-stack">
                <label className="field-label">Largeur</label>
                <input
                  className="input"
                  type="range"
                  min="0.12"
                  max="0.45"
                  step="0.01"
                  value={templateSignatureWidth}
                  onChange={(event) => {
                    const next = Number(event.target.value);
                    setTemplateSignatureWidth(next);
                    setTemplateSignatureX((value) => Math.min(value, 1 - next));
                  }}
                />
              </div>
              <div className="field-stack">
                <label className="field-label">Hauteur</label>
                <input
                  className="input"
                  type="range"
                  min="0.04"
                  max="0.2"
                  step="0.01"
                  value={templateSignatureHeight}
                  onChange={(event) => {
                    const next = Number(event.target.value);
                    setTemplateSignatureHeight(next);
                    setTemplateSignatureY((value) => Math.min(value, 1 - next));
                  }}
                />
              </div>
            </div>
          </div>
          <p className="text-xs text-slate-500">
            Variables: {'{{studentName}}'}, {'{{codeMassar}}'}, {'{{className}}'}, {'{{filiereName}}'}, {'{{academicYear}}'}, {'{{generatedAt}}'}, {'{{gradesText}}'}.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-outline" onClick={closeTemplateModal}>
              Annuler
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={onSaveTemplate}
              disabled={templateSaving || !templateName.trim()}
            >
              {templateSaving ? 'Enregistrement…' : 'Enregistrer le modèle'}
            </button>
          </div>
        </div>
      </ModalShell>
    </div>
  );
}
