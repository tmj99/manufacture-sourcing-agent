"use client";

import { useState } from "react";
import { anchorSchema, type Anchor } from "@/app/lib/schema";

type FieldErrors = Partial<Record<keyof Anchor, string>>;

const PRESETS: { label: string; fields: Anchor }[] = [
  {
    label: "Aerospace titanium machining",
    fields: {
      spec: "AS9100-certified contract manufacturers capable of CNC machining titanium components under 50kg",
      geography: "Mexico, Eastern Europe",
      certifications: "AS9100",
      volumeRange: "",
      excludeDomains: "",
    },
  },
  {
    label: "Contract pharma packaging (India)",
    fields: {
      spec: "FDA-registered contract pharmaceutical packaging facilities with serialization capability for blister packs",
      geography: "India, Mexico",
      certifications: "FDA registration",
      volumeRange: "",
      excludeDomains: "",
    },
  },
  {
    label: "EV battery module assembly",
    fields: {
      spec: "IATF 16949-certified contract manufacturers with experience in EV battery module assembly capable of 10,000+ units per month",
      geography: "Eastern Europe, Southeast Asia",
      certifications: "IATF 16949",
      volumeRange: "10,000+ units / month",
      excludeDomains: "",
    },
  },
];

const EMPTY: Anchor = {
  spec: "",
  geography: "",
  certifications: "",
  volumeRange: "",
  excludeDomains: "",
};

interface Props {
  onSubmit: (anchor: Anchor) => void;
  loading: boolean;
}

export function SpecForm({ onSubmit, loading }: Props) {
  const [fields, setFields] = useState<Anchor>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [showAdvanced, setShowAdvanced] = useState(false);

  function set(key: keyof Anchor, value: string) {
    setFields((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function applyPreset(preset: (typeof PRESETS)[0]) {
    setFields(preset.fields);
    setErrors({});
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = anchorSchema.safeParse(fields);
    if (!parsed.success) {
      const errs: FieldErrors = {};
      parsed.error.issues.forEach((issue) => {
        errs[issue.path[0] as keyof Anchor] = issue.message;
      });
      setErrors(errs);
      return;
    }
    setErrors({});
    onSubmit(parsed.data);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* Presets */}
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => applyPreset(p)}
            className="rounded-full border border-zinc-300 bg-white px-3 py-1 text-sm text-zinc-700 transition-colors hover:border-zinc-500 hover:bg-zinc-50"
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Spec */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-zinc-700">
          Sourcing spec <span className="text-red-500">*</span>
        </label>
        <textarea
          value={fields.spec}
          onChange={(e) => set("spec", e.target.value)}
          placeholder="e.g. AS9100-certified contract manufacturers capable of CNC machining titanium components under 50kg"
          rows={3}
          className={`w-full rounded-md border px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.spec ? "border-red-400" : "border-zinc-300"
          }`}
        />
        {errors.spec && (
          <p className="text-xs text-red-500">{errors.spec}</p>
        )}
      </div>

      {/* Geography + Certifications */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-zinc-700">
            Geography{" "}
            <span className="font-normal text-zinc-400">(optional)</span>
          </label>
          <input
            type="text"
            value={fields.geography}
            onChange={(e) => set("geography", e.target.value)}
            placeholder="e.g. Mexico, Eastern Europe"
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-zinc-700">
            Certifications{" "}
            <span className="font-normal text-zinc-400">(optional)</span>
          </label>
          <input
            type="text"
            value={fields.certifications}
            onChange={(e) => set("certifications", e.target.value)}
            placeholder="e.g. AS9100, NADCAP, ITAR"
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Volume range */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-zinc-700">
          Volume range{" "}
          <span className="font-normal text-zinc-400">(optional)</span>
        </label>
        <input
          type="text"
          value={fields.volumeRange}
          onChange={(e) => set("volumeRange", e.target.value)}
          placeholder="e.g. 1,000–10,000 units / month"
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Advanced toggle */}
      <button
        type="button"
        onClick={() => setShowAdvanced((v) => !v)}
        className="w-fit text-xs text-zinc-400 hover:text-zinc-600"
      >
        {showAdvanced ? "▾ Hide advanced" : "▸ Advanced options"}
      </button>

      {showAdvanced && (
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-zinc-700">
            Exclude domains{" "}
            <span className="font-normal text-zinc-400">(optional)</span>
          </label>
          <input
            type="text"
            value={fields.excludeDomains}
            onChange={(e) => set("excludeDomains", e.target.value)}
            placeholder="e.g. thomasnet.com, industrialnet.com"
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-zinc-400">
            Comma-separated. Use to force novel discovery beyond known directories.
          </p>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Searching…" : "Find suppliers"}
      </button>
    </form>
  );
}
