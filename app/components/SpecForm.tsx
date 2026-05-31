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

const inputClass =
  "w-full border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-blue-500";

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
            className="border border-zinc-700 bg-transparent px-3 py-1 text-sm text-zinc-400 transition-colors hover:border-zinc-500 hover:text-zinc-300"
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Spec */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-zinc-400">
          Sourcing spec <span className="text-red-500">*</span>
        </label>
        <textarea
          value={fields.spec}
          onChange={(e) => set("spec", e.target.value)}
          placeholder="e.g. AS9100-certified contract manufacturers capable of CNC machining titanium components under 50kg"
          rows={3}
          className={`${inputClass} font-mono ${errors.spec ? "border-red-500" : ""}`}
        />
        {errors.spec && (
          <p className="text-xs text-red-500">{errors.spec}</p>
        )}
      </div>

      {/* Geography + Certifications */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-zinc-400">
            Geography{" "}
            <span className="font-normal text-zinc-600">(optional)</span>
          </label>
          <input
            type="text"
            value={fields.geography}
            onChange={(e) => set("geography", e.target.value)}
            placeholder="e.g. Mexico, Eastern Europe"
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-zinc-400">
            Certifications{" "}
            <span className="font-normal text-zinc-600">(optional)</span>
          </label>
          <input
            type="text"
            value={fields.certifications}
            onChange={(e) => set("certifications", e.target.value)}
            placeholder="e.g. AS9100, NADCAP, ITAR"
            className={inputClass}
          />
        </div>
      </div>

      {/* Volume range */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-zinc-400">
          Volume range{" "}
          <span className="font-normal text-zinc-600">(optional)</span>
        </label>
        <input
          type="text"
          value={fields.volumeRange}
          onChange={(e) => set("volumeRange", e.target.value)}
          placeholder="e.g. 1,000–10,000 units / month"
          className={inputClass}
        />
      </div>

      {/* Advanced toggle */}
      <button
        type="button"
        onClick={() => setShowAdvanced((v) => !v)}
        className="w-fit text-xs text-zinc-600 hover:text-zinc-400"
      >
        {showAdvanced ? "▾ Hide advanced" : "▸ Advanced options"}
      </button>

      {showAdvanced && (
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-zinc-400">
            Exclude domains{" "}
            <span className="font-normal text-zinc-600">(optional)</span>
          </label>
          <input
            type="text"
            value={fields.excludeDomains}
            onChange={(e) => set("excludeDomains", e.target.value)}
            placeholder="e.g. thomasnet.com, industrialnet.com"
            className={inputClass}
          />
          <p className="text-xs text-zinc-600">
            Comma-separated. Use to force novel discovery beyond known directories.
          </p>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {loading ? "Searching…" : "Find suppliers"}
      </button>
    </form>
  );
}
