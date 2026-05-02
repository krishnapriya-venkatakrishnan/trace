'use client';

import { useState, useTransition } from 'react';
import { format } from 'date-fns';
import type { TemplateGroup, PromptVersion } from '../page';
import { activateVersion, createVersion } from '../actions';

interface Props {
    templates: TemplateGroup[];
}

export function PromptsClient({ templates }: Props) {
    const [selectedId, setSelectedId] = useState(templates[0]?.template_id ?? '');
    const [viewingId, setViewingId] = useState<string | null>(null);
    const [showEditor, setShowEditor] = useState(false);
    const [editorContent, setEditorContent] = useState('');
    const [editorNotes, setEditorNotes] = useState('');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [activatingId, setActivatingId] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    const template = templates.find((t) => t.template_id === selectedId);
    const activeVersion = template?.versions.find((v) => v.is_active) ?? null;
    const viewingVersion: PromptVersion | null =
        viewingId
            ? (template?.versions.find((v) => v.id === viewingId) ?? activeVersion)
            : activeVersion;

    const nextVersionNum = (template?.versions[0]?.version ?? 0) + 1;

    function openEditor() {
        setEditorContent(activeVersion?.content ?? '');
        setEditorNotes('');
        setShowEditor(true);
        setErrorMsg(null);
    }

    function handleSelectTemplate(id: string) {
        setSelectedId(id);
        setViewingId(null);
        setShowEditor(false);
        setErrorMsg(null);
    }

    function handleActivate(id: string, templateId: string) {
        setActivatingId(id);
        setErrorMsg(null);
        startTransition(async () => {
            const result = await activateVersion(id, templateId);
            setActivatingId(null);
            if (result.error) setErrorMsg(result.error);
        });
    }

    function handleSave() {
        if (!editorContent.trim()) return;
        setErrorMsg(null);
        startTransition(async () => {
            const result = await createVersion(
                selectedId,
                editorContent.trim(),
                editorNotes.trim() || null,
            );
            if (result.error) {
                setErrorMsg(result.error);
            } else {
                setShowEditor(false);
                setViewingId(null);
            }
        });
    }

    return (
        <div className="flex h-full">
            {/* ── Template selector sidebar ── */}
            <div className="w-60 shrink-0 border-r border-border overflow-y-auto py-5 px-3 space-y-1">
                <p className="text-xs text-muted font-medium uppercase tracking-wide px-2 mb-3">
                    Templates
                </p>
                {templates.length === 0 && (
                    <p className="text-xs text-muted px-2">No templates found.</p>
                )}
                {templates.map((t) => {
                    const active = t.versions.find((v) => v.is_active);
                    const isSelected = selectedId === t.template_id;
                    return (
                        <button
                            key={t.template_id}
                            onClick={() => handleSelectTemplate(t.template_id)}
                            className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${
                                isSelected
                                    ? 'bg-navy text-white'
                                    : 'text-ink hover:bg-surface'
                            }`}
                        >
                            <p className="text-sm font-medium font-mono truncate">
                                {t.template_id}
                            </p>
                            <p
                                className={`text-xs mt-0.5 ${
                                    isSelected ? 'text-white/50' : 'text-muted'
                                }`}
                            >
                                {active ? `v${active.version} active` : 'no active version'} ·{' '}
                                {t.versions.length} version{t.versions.length !== 1 ? 's' : ''}
                            </p>
                        </button>
                    );
                })}
            </div>

            {/* ── Right panel ── */}
            {template ? (
                <div className="flex-1 overflow-y-auto p-6 space-y-6 min-w-0">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h1 className="text-base font-semibold text-ink font-mono">
                                {template.template_id}
                            </h1>
                            <p className="text-xs text-muted mt-0.5">
                                {template.versions.length} version
                                {template.versions.length !== 1 ? 's' : ''}
                                {activeVersion ? ` · v${activeVersion.version} active` : ''}
                            </p>
                        </div>
                        <button
                            onClick={openEditor}
                            className="shrink-0 px-3 py-1.5 rounded-lg bg-navy text-white text-sm font-medium hover:bg-navy-light transition"
                        >
                            + New version
                        </button>
                    </div>

                    {errorMsg && (
                        <p className="text-xs text-error bg-error/10 rounded-lg px-3 py-2">
                            {errorMsg}
                        </p>
                    )}

                    {/* Version list */}
                    <div className="bg-surface border border-border rounded-xl overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border">
                                    <th className="text-left px-4 py-2.5 text-xs text-muted font-medium w-20">
                                        Version
                                    </th>
                                    <th className="text-left px-4 py-2.5 text-xs text-muted font-medium">
                                        Notes
                                    </th>
                                    <th className="text-left px-4 py-2.5 text-xs text-muted font-medium w-36">
                                        Created
                                    </th>
                                    <th className="text-right px-4 py-2.5 text-xs text-muted font-medium w-28">
                                        Status
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {template.versions.map((v) => {
                                    const isViewing =
                                        viewingId === v.id ||
                                        (!viewingId && v.is_active);
                                    return (
                                        <tr
                                            key={v.id}
                                            onClick={() => setViewingId(v.id)}
                                            className={`border-b border-border last:border-0 cursor-pointer transition-colors ${
                                                isViewing
                                                    ? 'bg-accent/5'
                                                    : 'hover:bg-hover'
                                            }`}
                                        >
                                            <td className="px-4 py-3 font-mono text-xs text-ink">
                                                v{v.version}
                                            </td>
                                            <td className="px-4 py-3 text-xs text-muted max-w-xs truncate">
                                                {v.notes ?? '—'}
                                            </td>
                                            <td className="px-4 py-3 text-xs text-muted whitespace-nowrap">
                                                {format(new Date(v.created_at), 'MMM d, yyyy')}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                {v.is_active ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-success/10 text-success text-xs font-medium">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-success inline-block" />
                                                        Active
                                                    </span>
                                                ) : (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleActivate(v.id, v.template_id);
                                                        }}
                                                        disabled={isPending}
                                                        className="px-2.5 py-0.5 rounded-lg border border-border text-xs text-muted hover:text-ink hover:border-ink transition disabled:opacity-40"
                                                    >
                                                        {activatingId === v.id
                                                            ? 'Activating…'
                                                            : 'Activate'}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Content viewer */}
                    {viewingVersion && (
                        <div className="bg-surface border border-border rounded-xl p-4 space-y-2">
                            <div className="flex items-center gap-2">
                                <p className="text-xs text-muted font-medium uppercase tracking-wide">
                                    Content — v{viewingVersion.version}
                                </p>
                                {viewingVersion.is_active && (
                                    <span className="text-xs text-success font-medium">
                                        · active
                                    </span>
                                )}
                            </div>
                            <pre className="text-xs text-ink font-mono whitespace-pre-wrap leading-relaxed bg-paper rounded-lg p-3 max-h-72 overflow-y-auto border border-border">
                                {viewingVersion.content}
                            </pre>
                        </div>
                    )}

                    {/* New version editor */}
                    {showEditor && (
                        <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
                            <p className="text-xs text-muted font-medium uppercase tracking-wide">
                                New version (v{nextVersionNum})
                            </p>
                            <textarea
                                value={editorContent}
                                onChange={(e) => setEditorContent(e.target.value)}
                                rows={14}
                                spellCheck={false}
                                placeholder="Prompt content…"
                                className="w-full text-xs font-mono bg-paper border border-border rounded-lg p-3 text-ink resize-y focus:outline-none focus:ring-1 focus:ring-accent leading-relaxed"
                            />
                            <input
                                value={editorNotes}
                                onChange={(e) => setEditorNotes(e.target.value)}
                                placeholder="Notes (optional) — describe what changed"
                                className="w-full text-xs bg-paper border border-border rounded-lg px-3 py-2 text-ink focus:outline-none focus:ring-1 focus:ring-accent"
                            />
                            <div className="flex gap-2">
                                <button
                                    onClick={handleSave}
                                    disabled={isPending || !editorContent.trim()}
                                    className="px-3 py-1.5 rounded-lg bg-navy text-white text-sm font-medium hover:bg-navy-light transition disabled:opacity-40"
                                >
                                    {isPending ? 'Saving…' : `Save as v${nextVersionNum}`}
                                </button>
                                <button
                                    onClick={() => setShowEditor(false)}
                                    className="px-3 py-1.5 rounded-lg border border-border text-ink text-sm hover:bg-hover transition"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex-1 flex items-center justify-center text-sm text-muted">
                    No prompt templates found. Seed your database to get started.
                </div>
            )}
        </div>
    );
}
