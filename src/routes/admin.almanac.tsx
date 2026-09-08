import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/almanac")({
  head: () => ({
    meta: [
      { title: "Almanac Management — Crew On Set! Admin" },
      { name: "description", content: "Manage the in-game equipment almanac catalog." },
      { property: "og:title", content: "Almanac Management — Crew On Set! Admin" },
      { property: "og:description", content: "Manage the in-game equipment almanac catalog." },
    ],
  }),
  component: AlmanacPage,
});

import Image from "@/components/next-compat/image";
import { useMemo, useState } from "react";
import { BookOpen, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { logAdminActivity, uid } from "@/lib/demo/store";
import { almanacStore, type AlmanacEntry } from "@/lib/demo/almanac";

const DEFAULT_IMAGE = "/assets/gameplay-shot.png";

type FormState = {
  id: string | null;
  name: string;
  category: string;
  tier: string;
  role: string;
  image: string;
  description: string;
  gameplay: string;
  features: string[];
  specs: [string, string][];
};

function emptyForm(): FormState {
  return {
    id: null,
    name: "",
    category: "",
    tier: "",
    role: "",
    image: DEFAULT_IMAGE,
    description: "",
    gameplay: "",
    features: [""],
    specs: [["", ""]],
  };
}

function entryToForm(entry: AlmanacEntry): FormState {
  return {
    id: entry.id,
    name: entry.name,
    category: entry.category,
    tier: entry.tier,
    role: entry.role,
    image: entry.image,
    description: entry.description,
    gameplay: entry.gameplay,
    features: entry.features.length > 0 ? [...entry.features] : [""],
    specs: entry.specs.length > 0 ? entry.specs.map((s) => [...s] as [string, string]) : [["", ""]],
  };
}

function AlmanacPage() {
  const [entries, setEntries] = almanacStore.useStore();
  const [query, setQuery] = useState("");
  const [form, setForm] = useState<FormState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AlmanacEntry | null>(null);

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return entries;
    return entries.filter((entry) =>
      `${entry.name} ${entry.category} ${entry.tier} ${entry.role}`.toLowerCase().includes(search)
    );
  }, [entries, query]);

  function openCreate() {
    setForm(emptyForm());
  }

  function openEdit(entry: AlmanacEntry) {
    setForm(entryToForm(entry));
  }

  function saveForm() {
    if (!form) return;

    const cleanEntry: AlmanacEntry = {
      id: form.id ?? uid("alm"),
      name: form.name.trim() || "Untitled Equipment",
      category: form.category.trim(),
      tier: form.tier.trim(),
      role: form.role.trim(),
      image: form.image.trim() || DEFAULT_IMAGE,
      description: form.description.trim(),
      gameplay: form.gameplay.trim(),
      features: form.features.map((f) => f.trim()).filter(Boolean),
      specs: form.specs
        .map(([label, value]) => [label.trim(), value.trim()] as [string, string])
        .filter(([label, value]) => label || value),
    };

    if (form.id) {
      setEntries(entries.map((entry) => (entry.id === form.id ? cleanEntry : entry)));
      logAdminActivity({
        kind: "almanac",
        label: "Almanac entry updated",
        detail: `${cleanEntry.name} was updated.`,
      });
    } else {
      setEntries([cleanEntry, ...entries]);
      logAdminActivity({
        kind: "almanac",
        label: "Almanac entry created",
        detail: `${cleanEntry.name} was added to the catalog.`,
      });
    }

    setForm(null);
  }

  function deleteEntry(entry: AlmanacEntry) {
    setEntries(entries.filter((e) => e.id !== entry.id));
    logAdminActivity({
      kind: "almanac",
      label: "Almanac entry deleted",
      detail: `${entry.name} was removed from the catalog.`,
    });
    setDeleteTarget(null);
  }

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  }

  function updateFeature(index: number, value: string) {
    setForm((current) => {
      if (!current) return current;
      const features = [...current.features];
      features[index] = value;
      return { ...current, features };
    });
  }

  function addFeature() {
    setForm((current) => (current ? { ...current, features: [...current.features, ""] } : current));
  }

  function removeFeature(index: number) {
    setForm((current) =>
      current ? { ...current, features: current.features.filter((_, i) => i !== index) } : current
    );
  }

  function updateSpec(index: number, part: 0 | 1, value: string) {
    setForm((current) => {
      if (!current) return current;
      const specs = current.specs.map((spec, i) =>
        i === index ? ([part === 0 ? value : spec[0], part === 1 ? value : spec[1]] as [string, string]) : spec
      );
      return { ...current, specs };
    });
  }

  function addSpec() {
    setForm((current) => (current ? { ...current, specs: [...current.specs, ["", ""]] } : current));
  }

  function removeSpec(index: number) {
    setForm((current) =>
      current ? { ...current, specs: current.specs.filter((_, i) => i !== index) } : current
    );
  }

  return (
    <div className="admin-page h-full overflow-y-auto bg-[#101923] text-white">
      <header className="mb-8 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-black tracking-[.18em] !text-coral">CATALOG</p>
          <h1 className="admin-heading mt-2 !text-white">Almanac Management</h1>
          <p className="admin-kicker !text-white/45">
            Manage the equipment almanac shown to players in-game.
          </p>
        </div>

        <button
          onClick={openCreate}
          className="inline-flex shrink-0 items-center gap-2 rounded-md bg-coral px-4 py-2.5 text-xs font-black uppercase tracking-wide text-white transition hover:opacity-90"
        >
          <Plus className="size-4" />
          <span className="hidden sm:inline">New Entry</span>
        </button>
      </header>

      <section className="admin-card mb-4 rounded-lg border border-white/[0.06] bg-[#182330] p-4 shadow-xl">
        <label className="relative block max-w-md">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 !text-white/30" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name, category, tier, or role"
            className="admin-input h-11 w-full rounded-md border border-white/10 bg-[#101923] pl-10 pr-3 text-sm font-bold !text-white outline-none transition placeholder:!text-white/25 focus:border-coral"
          />
        </label>
      </section>

      <section className="admin-table-wrap overflow-hidden rounded-lg border border-white/[0.06] bg-[#182330] shadow-xl">
        <div className="overflow-x-auto">
          <table className="admin-table min-w-[680px] w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-white/[0.08] bg-[#141e29]">
                <th className="px-5 py-4 text-xs font-black uppercase tracking-wider !text-white/40">Name</th>
                <th className="px-5 py-4 text-xs font-black uppercase tracking-wider !text-white/40">Category</th>
                <th className="px-5 py-4 text-xs font-black uppercase tracking-wider !text-white/40">Tier</th>
                <th className="px-5 py-4 text-xs font-black uppercase tracking-wider !text-white/40">Role</th>
                <th className="px-5 py-4 text-xs font-black uppercase tracking-wider !text-white/40">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry) => (
                <tr key={entry.id} className="border-b border-white/[0.05] transition hover:bg-white/[0.025] last:border-0">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="relative size-10 shrink-0 overflow-hidden rounded-md bg-[#101923]">
                        <Image src={entry.image || DEFAULT_IMAGE} alt={entry.name} fill className="object-cover" />
                      </div>
                      <p className="font-bold !text-white">{entry.name}</p>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm !text-white/60">{entry.category}</td>
                  <td className="px-5 py-4 text-sm !text-white/60">{entry.tier}</td>
                  <td className="px-5 py-4 text-sm !text-white/60">{entry.role}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEdit(entry)}
                        title="Edit entry"
                        aria-label="Edit entry"
                        className="grid size-8 place-items-center rounded-md border border-white/10 !text-white/60 transition hover:border-coral hover:!text-white"
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(entry)}
                        title="Delete entry"
                        aria-label="Delete entry"
                        className="grid size-8 place-items-center rounded-md border border-white/10 !text-white/60 transition hover:border-coral hover:!text-coral"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-16 text-center">
                    <BookOpen className="mx-auto size-8 !text-white/20" />
                    <p className="mt-2 text-sm font-bold !text-white/40">No almanac entries found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* CREATE / EDIT MODAL */}
      {form && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setForm(null)}
        >
          <div
            className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-white/10 bg-[#151c28] shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-6 py-4">
              <h3 className="text-lg font-black uppercase text-white">
                {form.id ? "Edit Equipment" : "New Equipment"}
              </h3>
              <button onClick={() => setForm(null)} className="!text-white/40 hover:!text-white">
                <X className="size-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-black uppercase tracking-wide !text-white/40">Equipment Name</span>
                  <input
                    value={form.name}
                    onChange={(event) => updateField("name", event.target.value)}
                    className="admin-input mt-1.5 h-11 w-full rounded-md border border-white/10 bg-[#101923] px-3 text-sm font-bold !text-white outline-none focus:border-coral"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-black uppercase tracking-wide !text-white/40">Equipment Type / Role</span>
                  <input
                    value={form.role}
                    onChange={(event) => updateField("role", event.target.value)}
                    placeholder="e.g. Cameraman"
                    className="admin-input mt-1.5 h-11 w-full rounded-md border border-white/10 bg-[#101923] px-3 text-sm font-bold !text-white outline-none focus:border-coral"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-black uppercase tracking-wide !text-white/40">Equipment Category (Department)</span>
                  <input
                    value={form.category}
                    onChange={(event) => updateField("category", event.target.value)}
                    placeholder="e.g. Cameras"
                    className="admin-input mt-1.5 h-11 w-full rounded-md border border-white/10 bg-[#101923] px-3 text-sm font-bold !text-white outline-none focus:border-coral"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-black uppercase tracking-wide !text-white/40">Tier / Class</span>
                  <input
                    value={form.tier}
                    onChange={(event) => updateField("tier", event.target.value)}
                    placeholder="e.g. Mid-End"
                    className="admin-input mt-1.5 h-11 w-full rounded-md border border-white/10 bg-[#101923] px-3 text-sm font-bold !text-white outline-none focus:border-coral"
                  />
                </label>
              </div>

              <p className="text-[11px] !text-white/30">
                Department maps to Category, Class maps to Tier, and Role is shared across both concepts above.
              </p>

              <label className="block">
                <span className="text-xs font-black uppercase tracking-wide !text-white/40">Equipment Image (path)</span>
                <div className="mt-1.5 flex items-center gap-3">
                  <div className="relative size-12 shrink-0 overflow-hidden rounded-md border border-white/10 bg-[#101923]">
                    <Image src={form.image || DEFAULT_IMAGE} alt="Preview" fill className="object-cover" />
                  </div>
                  <input
                    value={form.image}
                    onChange={(event) => updateField("image", event.target.value)}
                    placeholder={DEFAULT_IMAGE}
                    className="admin-input h-11 w-full rounded-md border border-white/10 bg-[#101923] px-3 text-sm font-bold !text-white outline-none focus:border-coral"
                  />
                </div>
              </label>

              <label className="block">
                <span className="text-xs font-black uppercase tracking-wide !text-white/40">Equipment Overview</span>
                <textarea
                  value={form.description}
                  onChange={(event) => updateField("description", event.target.value)}
                  rows={4}
                  className="admin-input mt-1.5 w-full rounded-md border border-white/10 bg-[#101923] px-3 py-2 text-sm !text-white outline-none focus:border-coral"
                />
              </label>

              <label className="block">
                <span className="text-xs font-black uppercase tracking-wide !text-white/40">Gameplay Function</span>
                <textarea
                  value={form.gameplay}
                  onChange={(event) => updateField("gameplay", event.target.value)}
                  rows={3}
                  className="admin-input mt-1.5 w-full rounded-md border border-white/10 bg-[#101923] px-3 py-2 text-sm !text-white outline-none focus:border-coral"
                />
              </label>

              {/* SPECS */}
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wide !text-white/40">Equipment Specifications</span>
                  <button
                    onClick={addSpec}
                    className="inline-flex items-center gap-1 text-[11px] font-black uppercase !text-coral hover:!text-white"
                  >
                    <Plus className="size-3.5" /> Add
                  </button>
                </div>
                <div className="mt-2 space-y-2">
                  {form.specs.map((spec, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        value={spec[0]}
                        onChange={(event) => updateSpec(index, 0, event.target.value)}
                        placeholder="Label"
                        className="admin-input h-10 w-1/2 rounded-md border border-white/10 bg-[#101923] px-3 text-sm !text-white outline-none focus:border-coral"
                      />
                      <input
                        value={spec[1]}
                        onChange={(event) => updateSpec(index, 1, event.target.value)}
                        placeholder="Value"
                        className="admin-input h-10 w-1/2 rounded-md border border-white/10 bg-[#101923] px-3 text-sm !text-white outline-none focus:border-coral"
                      />
                      <button
                        onClick={() => removeSpec(index)}
                        aria-label="Remove spec"
                        className="shrink-0 !text-white/30 hover:!text-coral"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* FEATURES */}
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wide !text-white/40">Special Features</span>
                  <button
                    onClick={addFeature}
                    className="inline-flex items-center gap-1 text-[11px] font-black uppercase !text-coral hover:!text-white"
                  >
                    <Plus className="size-3.5" /> Add
                  </button>
                </div>
                <div className="mt-2 space-y-2">
                  {form.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        value={feature}
                        onChange={(event) => updateFeature(index, event.target.value)}
                        placeholder="Feature"
                        className="admin-input h-10 w-full rounded-md border border-white/10 bg-[#101923] px-3 text-sm !text-white outline-none focus:border-coral"
                      />
                      <button
                        onClick={() => removeFeature(index)}
                        aria-label="Remove feature"
                        className="shrink-0 !text-white/30 hover:!text-coral"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex shrink-0 justify-end gap-2 border-t border-white/10 px-6 py-4">
              <button
                onClick={() => setForm(null)}
                className="rounded-md border border-white/10 px-4 py-2.5 text-xs font-bold text-white/60 transition hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={saveForm}
                className="rounded-md bg-coral px-4 py-2.5 text-xs font-black uppercase text-white transition hover:opacity-90"
              >
                {form.id ? "Save Changes" : "Create Entry"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-[#ff6248]/40 bg-[#151c28] p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="text-lg font-black uppercase text-white">Delete Entry?</h3>
            <p className="mt-3 text-sm text-white/50">
              This will permanently remove "{deleteTarget.name}" from the almanac. This cannot be undone in this demo session.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="rounded-md border border-white/10 px-4 py-2 text-xs font-bold text-white/60 transition hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteEntry(deleteTarget)}
                className="rounded-md bg-[#ff6248] px-4 py-2 text-xs font-black uppercase text-white transition hover:bg-[#e5533b]"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
