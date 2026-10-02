"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Pencil, Plus, Trash2, Code2, ListPlus, Eye } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { JenisIcon, ICON_CHOICES } from "@/components/jenis-icon";
import { parseTemplateSurat, KUNCI_TETAP, type TemplateSurat } from "@/lib/surat-template";
import type { FormField, JenisRekomDTO } from "@/lib/types";
import { BIDANG_LIST } from "@/lib/types";

const TIPE_FIELD = [
  { value: "text", label: "Teks singkat" },
  { value: "textarea", label: "Teks panjang" },
  { value: "number", label: "Angka" },
  { value: "date", label: "Tanggal" },
  { value: "select", label: "Pilihan (dropdown)" },
] as const;

// Input pilihan dropdown: teks disimpan lokal agar koma TETAP terlihat saat mengetik,
// lalu dipecah jadi daftar pilihan. Bug lama: input controlled -> koma langsung
// terhapus saat diketik sehingga semua pilihan menyatu jadi satu.
function OptionsInput({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [teks, setTeks] = useState(value.join(", "));
  // sinkron bila daftar pilihan berubah dari luar (edit JSON, ganti tipe, dsb.)
  // — pola "adjust state during render"
  const [valueSebelum, setValueSebelum] = useState(value);
  if (valueSebelum !== value) {
    setValueSebelum(value);
    const normal = teks.split(",").map((s) => s.trim()).filter(Boolean).join(", ");
    if (normal !== value.join(", ")) setTeks(value.join(", "));
  }
  return (
    <Input
      className="ml-1 text-xs"
      placeholder="Isi pilihan dipisah koma, mis: Umum, Gigi, Farmasi"
      value={teks}
      onChange={(e) => {
        setTeks(e.target.value);
        onChange(e.target.value.split(",").map((s) => s.trim()).filter(Boolean));
      }}
    />
  );
}

/** Editor daftar baris identitas: Label : [placeholder | nilai manual] — dipakai blok 1 & 2 */
function BarisIdentitasEditor({
  rows,
  setRows,
  kunciTersedia,
}: {
  rows: { label: string; kunci: string; nilai?: string }[];
  setRows: (r: { label: string; kunci: string; nilai?: string }[]) => void;
  kunciTersedia: { kunci: string; label: string }[];
}) {
  const ubah = (i: number, patch: Partial<{ label: string; kunci: string; nilai?: string }>) =>
    setRows(rows.map((x, xi) => (xi === i ? { ...x, ...patch } : x)));
  return (
    <div className="space-y-2">
      {rows.map((b, i) => {
        const manual = !b.kunci;
        const opsi = kunciTersedia.some((k) => k.kunci === b.kunci)
          ? kunciTersedia
          : b.kunci
            ? [{ kunci: b.kunci, label: b.kunci }, ...kunciTersedia]
            : kunciTersedia;
        return (
          <div key={i} className="grid grid-cols-[110px_1fr_1fr_36px] items-center gap-2">
            <Input placeholder="Label" value={b.label} onChange={(e) => ubah(i, { label: e.target.value })} />
            <Select
              value={manual ? "__manual__" : b.kunci}
              onValueChange={(v) => ubah(i, v === "__manual__" ? { kunci: "" } : { kunci: v })}
            >
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {opsi.map((k) => (
                  <SelectItem key={k.kunci} value={k.kunci}>
                    {`{${k.kunci}`}{"}"} — {k.label}
                  </SelectItem>
                ))}
                <SelectItem value="__manual__">Isi manual…</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder={manual ? "Nilai tetap / boleh {placeholder}" : "Timpa manual (opsional)"}
              value={b.nilai ?? ""}
              onChange={(e) => ubah(i, { nilai: e.target.value })}
            />
            <button
              type="button"
              onClick={() => setRows(rows.filter((_, xi) => xi !== i))}
              className="text-red-400 hover:text-red-600"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        );
      })}
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => setRows([...rows, { label: "", kunci: "nama_pemohon" }])}
      >
        <Plus className="size-3.5" /> Tambah baris
      </Button>
    </div>
  );
}

/** Tab editor Template Surat — format surat per jenis mengikuti template resmi Dinkes */
function TabTemplateSurat({
  tpl,
  setTpl,
  tplDefault,
  setTplDefault,
  kunciTersedia,
  onPratinjau,
  onPakaiDefault,
}: {
  tpl: TemplateSurat;
  setTpl: (t: TemplateSurat) => void;
  tplDefault: boolean;
  setTplDefault: (v: boolean) => void;
  kunciTersedia: { kunci: string; label: string }[];
  onPratinjau: () => void;
  onPakaiDefault: () => void;
}) {
  const set = (patch: Partial<TemplateSurat>) => setTpl({ ...tpl, ...patch });

  // teks penutup & penempatan TTD disimpan lokal agar baris kosong pemisah paragraf tetap
  // terlihat saat mengetik — disinkronkan bila tpl berubah dari luar (pola adjust-during-render)
  const [penutupTeks, setPenutupTeks] = useState(tpl.penutup.join("\n\n"));
  // baris penempatan TTD ("Ditetapkan di / Pada tanggal") — satu baris per kalimat
  const [penempatanTeks, setPenempatanTeks] = useState((tpl.penempatanTtd ?? []).join("\n"));
  const [tplSebelum, setTplSebelum] = useState(tpl);
  if (tplSebelum !== tpl) {
    setTplSebelum(tpl);
    const normalPenutup = penutupTeks.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean).join("\n\n");
    if (normalPenutup !== tpl.penutup.join("\n\n")) setPenutupTeks(tpl.penutup.join("\n\n"));
    const normalPenempatan = penempatanTeks.split("\n").map((s) => s.trim()).filter(Boolean).join("\n");
    if (normalPenempatan !== (tpl.penempatanTtd ?? []).join("\n"))
      setPenempatanTeks((tpl.penempatanTtd ?? []).join("\n"));
  }

  if (tplDefault) {
    return (
      <div className="space-y-3 rounded-xl border border-slate-200 p-4">
        <p className="text-sm font-semibold">Template Surat</p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Saat ini surat memakai <b>format bawaan sistem</b> (judul &ldquo;Surat Rekomendasi&rdquo;, redaksi standar,
          identitas Nama / NIP-NIK / Instansi). Klik <b>Sesuaikan Format</b> untuk mengikuti template resmi Dinkes Anda.
        </p>
        <div className="flex gap-2">
          <Button type="button" size="sm" className="bg-brand" onClick={() => setTplDefault(false)}>
            <Pencil className="size-3.5" /> Sesuaikan Format
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={onPratinjau}>
            <Eye className="size-3.5" /> Pratinjau
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3.5 rounded-xl border border-slate-200 p-3.5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Template Surat (khusus jenis ini)</p>
        <button type="button" onClick={onPakaiDefault} className="text-xs font-medium text-brand hover:underline">
          Kembalikan Default
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label className="mb-1.5 block text-sm">Judul Surat</Label>
          <Input value={tpl.judul} onChange={(e) => set({ judul: e.target.value })} placeholder="Surat Rekomendasi" />
        </div>
        <div>
          <Label className="mb-1.5 block text-sm">Letak Nomor Surat</Label>
          <Select value={tpl.letakNomor === "bawah" ? "bawah" : "atas"} onValueChange={(v) => set({ letakNomor: v as "atas" | "bawah" })}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="atas">Nomor dulu, judul di bawah (klasik)</SelectItem>
              <SelectItem value="bawah">Judul dulu, nomor di tengah (pernyataan)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="mb-1.5 block text-sm">Kota Tanda Tangan</Label>
          <Input value={tpl.kotaTtd} onChange={(e) => set({ kotaTtd: e.target.value })} placeholder="Tenggarong" />
        </div>
        <div>
          <Label className="mb-1.5 block text-sm">Gaya Tanda Tangan</Label>
          <Select value={tpl.gayaTtd === "elektronik" ? "elektronik" : "klasik"} onValueChange={(v) => set({ gayaTtd: v as "klasik" | "elektronik" })}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="klasik">Klasik — jabatan + nama + NIP</SelectItem>
              <SelectItem value="elektronik">Elektronik — kotak BSrE + QR di samping</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label className="mb-1.5 block text-sm">Baris Lampiran</Label>
        <Input value={tpl.lampiran} onChange={(e) => set({ lampiran: e.target.value })} placeholder="Kosongkan bila tidak perlu" />
      </div>
      <div>
        <Label className="mb-1.5 block text-sm">Paragraf Pembuka — Blok Identitas 1</Label>
        <Textarea rows={2} value={tpl.pembuka} onChange={(e) => set({ pembuka: e.target.value })} placeholder="mis: Yang bertanda tangan di bawah ini:" />
      </div>

      <div>
        <Label className="mb-1.5 block text-sm">Baris Identitas — Blok 1 (mis. pejabat penandatangan)</Label>
        <BarisIdentitasEditor
          rows={tpl.barisIdentitas}
          setRows={(r) => set({ barisIdentitas: r })}
          kunciTersedia={kunciTersedia}
        />
      </div>

      <div className="rounded-lg border border-dashed border-slate-300 p-3">
        <p className="mb-2 text-sm font-semibold">Blok Identitas 2 — opsional</p>
        <p className="mb-2 text-[11px] leading-relaxed text-muted-foreground">
          Untuk surat dengan dua blok identitas (mis. surat pernyataan: pejabat lalu pemohon).
          Kosongkan untuk surat rekomendasi biasa.
        </p>
        <Label className="mb-1.5 block text-sm">Paragraf Pembuka Blok 2</Label>
        <Textarea
          rows={2}
          value={tpl.pembukaKedua ?? ""}
          onChange={(e) => set({ pembukaKedua: e.target.value })}
          placeholder="mis: Menyatakan dengan sesungguhnya bahwa nama yang tercantum di bawah ini:"
        />
        <div className="mt-2">
          <Label className="mb-1.5 block text-sm">Baris Identitas — Blok 2 (mis. pemohon)</Label>
          <BarisIdentitasEditor
            rows={tpl.barisIdentitasKedua ?? []}
            setRows={(r) => set({ barisIdentitasKedua: r })}
            kunciTersedia={kunciTersedia}
          />
        </div>
      </div>

      <div>
        <Label className="mb-1.5 block text-sm">Paragraf Penutup / Isi Surat</Label>
        <Textarea
          rows={6}
          value={penutupTeks}
          onChange={(e) => {
            setPenutupTeks(e.target.value);
            set({ penutup: e.target.value.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean) });
          }}
        />
        <p className="mt-1 text-[11px] text-muted-foreground">
          Pisahkan tiap paragraf dengan satu baris kosong. Baris berawalan &ldquo;1. &rdquo;, &ldquo;2. &rdquo; dst. otomatis tercetak rata gantung seperti daftar ketentuan.
        </p>
      </div>

      <div>
        <Label className="mb-1.5 block text-sm">Baris Penempatan Tanda Tangan — opsional</Label>
        <Textarea
          rows={2}
          value={penempatanTeks}
          onChange={(e) => {
            setPenempatanTeks(e.target.value);
            set({ penempatanTtd: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) });
          }}
          placeholder={"Ditetapkan di: Tenggarong\nPada tanggal: {tgl_terbit}"}
        />
        <p className="mt-1 text-[11px] text-muted-foreground">Mengganti baris &ldquo;Kota, tanggal&rdquo;. Satu baris per kalimat.</p>
      </div>

      <div>
        <Label className="mb-1.5 block text-sm">Jabatan di Blok Tanda Tangan</Label>
        <Textarea rows={2} value={tpl.jabatanTtd} onChange={(e) => set({ jabatanTtd: e.target.value })} />
        {tpl.gayaTtd === "elektronik" && (
          <>
            <p className="mt-1 text-[11px] text-muted-foreground">Gaya elektronik: tulis jabatan KAPITAL (mis. KEPALA DINAS KESEHATAN).</p>
            <div className="mt-2">
              <Label className="mb-1.5 block text-sm">Pangkat di Bawah Nama (TTD Elektronik)</Label>
              <Input value={tpl.pangkatTtd ?? ""} onChange={(e) => set({ pangkatTtd: e.target.value })} placeholder="mis: Pembina Tingkat I" />
            </div>
          </>
        )}
      </div>

      <div className="rounded-lg bg-slate-50 p-2.5">
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Placeholder — klik untuk salin, tempel di kolom mana pun
        </p>
        <div className="flex flex-wrap gap-1">
          {kunciTersedia.map((k) => (
            <button
              key={k.kunci}
              type="button"
              title={k.label}
              onClick={() => {
                navigator.clipboard?.writeText(`{${k.kunci}}`).catch(() => undefined);
                toast.success(`{${k.kunci}} disalin`);
              }}
              className="rounded-md bg-white px-2 py-0.5 font-mono text-[10px] text-slate-600 ring-1 ring-slate-200 transition-colors hover:bg-brand-50 hover:text-brand hover:ring-brand/30"
            >
              {`{${k.kunci}}`}
            </button>
          ))}
        </div>
      </div>

      <Button type="button" size="sm" variant="outline" onClick={onPratinjau}>
        <Eye className="size-3.5" /> Pratinjau Surat (data contoh)
      </Button>
    </div>
  );
}

/** Dialog pratinjau PDF surat — memakai endpoint /api/jenis/pratinjau-surat */
function PratinjauSuratDialog({
  state,
  onClose,
}: {
  state: { open: boolean; jenisId?: string; templateSurat?: string | null };
  onClose: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // reset pratinjau saat dialog dibuka/ditutup (adjust state during render)
  const [prevOpen, setPrevOpen] = useState(false);
  if (state.open !== prevOpen) {
    setPrevOpen(state.open);
    setUrl(null);
    setLoading(state.open);
  }

  useEffect(() => {
    if (!state.open) return;
    let objUrl: string | null = null;
    let batal = false;
    fetch("/api/jenis/pratinjau-surat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jenisId: state.jenisId, templateSurat: state.templateSurat }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error ?? "Gagal membuat pratinjau.");
        }
        const blob = await res.blob();
        if (batal) return;
        objUrl = URL.createObjectURL(blob);
        setUrl(objUrl);
      })
      .catch((e) => {
        if (!batal) toast.error((e as Error).message);
      })
      .finally(() => {
        if (!batal) setLoading(false);
      });
    return () => {
      batal = true;
      if (objUrl) URL.revokeObjectURL(objUrl);
    };
  }, [state.open, state.jenisId, state.templateSurat]);

  return (
    <Dialog open={state.open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Pratinjau Surat — data contoh</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center py-16 text-muted-foreground">
            <Loader2 className="mr-2 size-5 animate-spin" /> Menyiapkan PDF...
          </div>
        ) : url ? (
          <iframe src={url} title="Pratinjau Surat" className="h-[70vh] w-full rounded-lg border" />
        ) : (
          <p className="py-10 text-center text-sm text-muted-foreground">Pratinjau tidak tersedia.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}

interface FormJenis {
  id?: string;
  kodeJenis: string;
  namaJenis: string;
  deskripsi: string;
  icon: string;
  warna: string;
  bidang: string;
  templateNomor: string;
  urutan: number;
  isActive: boolean;
  fields: FormField[];
  dokumen: { nama: string; required: boolean }[];
}

const KOSONG: FormJenis = {
  kodeJenis: "",
  namaJenis: "",
  deskripsi: "",
  icon: "FileText",
  warna: "#0F766E",
  bidang: "Sekretariat",
  templateNomor: "440/{seq}/{kode}/Dinkes-Kukar/{year}",
  urutan: 99,
  isActive: true,
  fields: [],
  dokumen: [],
};

export default function AdminJenisPage() {
  const [list, setList] = useState<JenisRekomDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [buka, setBuka] = useState(false);
  const [form, setForm] = useState<FormJenis>(KOSONG);
  const [modeJson, setModeJson] = useState(false);
  const [jsonText, setJsonText] = useState("");
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"form" | "surat">("form");
  const [tpl, setTpl] = useState<TemplateSurat>(parseTemplateSurat(null));
  const [tplDefault, setTplDefault] = useState(true);
  const [pratinjau, setPratinjau] = useState<{ open: boolean; jenisId?: string; templateSurat?: string | null }>({ open: false });

  const muat = async () => {
    const res = await fetch("/api/jenis?activeOnly=false");
    const j = await res.json();
    setList(j.data ?? []);
    setLoading(false);
  };
  useEffect(() => {
    muat();
  }, []);

  const persyaratanJson = useMemo(() => {
    if (modeJson) return jsonText;
    return JSON.stringify({ fields: form.fields, dokumen: form.dokumen }, null, 2);
  }, [form, modeJson, jsonText]);

  /** Validasi langsung Mode JSON: null = valid, string = pesan galat */
  const jsonGalat = useMemo(() => {
    if (!modeJson) return null;
    try {
      const p = JSON.parse(jsonText);
      if (typeof p !== "object" || p === null || Array.isArray(p)) return "Harus objek { fields, dokumen }.";
      if (p.fields !== undefined && !Array.isArray(p.fields)) return '"fields" harus berupa array.';
      if (p.dokumen !== undefined && !Array.isArray(p.dokumen)) return '"dokumen" harus berupa array.';
      for (const f of p.fields ?? []) {
        if (f.type === "select" && !Array.isArray(f.options)) return `Kolom "${f.label ?? f.key}" bertipe select wajib punya "options".`;
      }
      return null;
    } catch (e) {
      return (e as Error).message;
    }
  }, [modeJson, jsonText]);

  const bukaBaru = () => {
    setForm(KOSONG);
    setModeJson(false);
    setJsonText("");
    setTab("form");
    setTpl(parseTemplateSurat(null));
    setTplDefault(true);
    setBuka(true);
  };

  const bukaEdit = (j: JenisRekomDTO) => {
    let p: { fields?: FormField[]; dokumen?: { nama: string; required: boolean }[] } = {};
    try {
      p = JSON.parse(j.persyaratanJson);
    } catch {
      p = {};
    }
    setForm({
      id: j.id,
      kodeJenis: j.kodeJenis,
      namaJenis: j.namaJenis,
      deskripsi: j.deskripsi ?? "",
      icon: j.icon,
      warna: j.warna,
      bidang: j.bidang,
      templateNomor: j.templateNomor,
      urutan: j.urutan,
      isActive: j.isActive,
      fields: p.fields ?? [],
      dokumen: p.dokumen ?? [],
    });
    setTab("form");
    setTpl(parseTemplateSurat(j.templateSurat));
    setTplDefault(j.templateSurat == null);
    setModeJson(false);
    setBuka(true);
  };

  const simpan = async () => {
    setBusy(true);
    try {
      // validasi JSON
      try {
        JSON.parse(persyaratanJson);
      } catch {
        throw new Error("JSON persyaratan tidak valid.");
      }
      const payload = {
        kodeJenis: form.kodeJenis,
        namaJenis: form.namaJenis,
        deskripsi: form.deskripsi,
        icon: form.icon,
        warna: form.warna,
        bidang: form.bidang,
        templateNomor: form.templateNomor,
        urutan: form.urutan,
        isActive: form.isActive,
        persyaratanJson,
        templateSurat: tplDefault ? null : JSON.stringify(tpl),
      };
      const res = form.id
        ? await fetch(`/api/jenis/${form.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
        : await fetch("/api/jenis", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Gagal menyimpan");
      toast.success(form.id ? "Jenis rekomendasi diperbarui." : "Jenis rekomendasi baru dibuat.");
      setBuka(false);
      await muat();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const toggleAktif = async (j: JenisRekomDTO) => {
    await fetch(`/api/jenis/${j.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !j.isActive }),
    });
    muat();
  };

  const hapus = async (j: JenisRekomDTO) => {
    if (!confirm(`Hapus jenis "${j.namaJenis}"? Jika sudah ada pengajuan, jenis hanya dinonaktifkan.`)) return;
    const res = await fetch(`/api/jenis/${j.id}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok) return toast.error(json.error ?? "Gagal menghapus");
    toast.success("Jenis rekomendasi dihapus / dinonaktifkan.");
    muat();
  };

  const setField = (i: number, patch: Partial<FormField>) =>
    setForm((f) => ({ ...f, fields: f.fields.map((x, xi) => (xi === i ? { ...x, ...patch } : x)) }));

  /** Daftar placeholder yang tersedia: kunci tetap + semua kolom formulir jenis ini */
  const kunciTersedia = useMemo(() => {
    const base = KUNCI_TETAP.map((k) => ({ kunci: k.kunci, label: k.label }));
    const tambahan = form.fields
      .filter((f) => f.key && !base.some((b) => b.kunci === f.key))
      .map((f) => ({ kunci: f.key, label: f.label || f.key }));
    return [...base, ...tambahan];
  }, [form.fields]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Master Jenis Rekomendasi</h1>
          <p className="text-sm text-muted-foreground">
            Tambahkan jenis rekomendasi baru tanpa coding — form & dokumen yang diminta dapat disesuaikan di sini.
          </p>
        </div>
        <Button onClick={bukaBaru} className="bg-brand">
          <Plus className="size-4" /> Jenis Baru
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20 text-muted-foreground">
          <Loader2 className="mr-2 size-5 animate-spin" /> Memuat...
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {list.map((j) => (
            <div key={j.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span
                    className="flex size-10 items-center justify-center rounded-xl"
                    style={{ backgroundColor: `${j.warna}14`, color: j.warna }}
                  >
                    <JenisIcon icon={j.icon} className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{j.namaJenis}</p>
                    <p className="font-mono text-[11px] text-slate-400">{j.kodeJenis} · {j.bidang}</p>
                  </div>
                </div>
                <Switch checked={j.isActive} onCheckedChange={() => toggleAktif(j)} aria-label="Aktif" />
              </div>
              <p className="mt-2 line-clamp-2 min-h-8 text-xs text-muted-foreground">{j.deskripsi}</p>
              <p className="mt-2 truncate font-mono text-[10px] text-slate-400">{j.templateNomor}</p>
              <div className="mt-3 flex gap-1.5 border-t border-slate-100 pt-3">
                <Button size="sm" variant="outline" onClick={() => setPratinjau({ open: true, jenisId: j.id })}>
                  <Eye className="size-3.5" /> Pratinjau
                </Button>
                <Button size="sm" variant="outline" onClick={() => bukaEdit(j)}>
                  <Pencil className="size-3.5" /> Edit
                </Button>
                <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600" onClick={() => hapus(j)}>
                  <Trash2 className="size-3.5" /> Hapus
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* dialog form */}
      <Dialog open={buka} onOpenChange={setBuka}>
        <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit Jenis Rekomendasi" : "Tambah Jenis Rekomendasi"}</DialogTitle>
          </DialogHeader>
          <div className="flex gap-1 rounded-full bg-slate-100 p-1 text-sm font-medium">
            {[
              ["form", "Formulir & Dokumen"],
              ["surat", "Template Surat"],
            ].map(([v, l]) => (
              <button
                key={v}
                type="button"
                onClick={() => setTab(v as "form" | "surat")}
                className={`flex-1 rounded-full px-3 py-1.5 transition-colors ${
                  tab === v ? "bg-white text-brand shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
          <div className="space-y-3.5">
            {tab === "form" ? (
              <>
            <div className="grid gap-3.5 sm:grid-cols-2">
              <div>
                <Label className="mb-1.5 block text-sm">Kode Jenis *</Label>
                <Input value={form.kodeJenis} onChange={(e) => setForm({ ...form, kodeJenis: e.target.value.toUpperCase() })} placeholder="SIP-DMK" />
              </div>
              <div>
                <Label className="mb-1.5 block text-sm">Nama Jenis *</Label>
                <Input value={form.namaJenis} onChange={(e) => setForm({ ...form, namaJenis: e.target.value })} placeholder="Rekomendasi ..." />
              </div>
            </div>
            <div>
              <Label className="mb-1.5 block text-sm">Deskripsi</Label>
              <Textarea rows={2} value={form.deskripsi} onChange={(e) => setForm({ ...form, deskripsi: e.target.value })} />
            </div>
            <div className="grid gap-3.5 sm:grid-cols-3">
              <div>
                <Label className="mb-1.5 block text-sm">Bidang</Label>
                <Select value={form.bidang} onValueChange={(v) => setForm({ ...form, bidang: v })}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BIDANG_LIST.map((b) => (
                      <SelectItem key={b} value={b}>{b}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1.5 block text-sm">Warna</Label>
                <input
                  type="color"
                  value={form.warna}
                  onChange={(e) => setForm({ ...form, warna: e.target.value })}
                  className="h-9 w-full cursor-pointer rounded-md border border-input bg-transparent"
                  aria-label="Warna jenis"
                />
              </div>
              <div>
                <Label className="mb-1.5 block text-sm">Urutan</Label>
                <Input type="number" value={form.urutan} onChange={(e) => setForm({ ...form, urutan: Number(e.target.value) })} />
              </div>
            </div>
            <div>
              <Label className="mb-1.5 block text-sm">Ikon</Label>
              <div className="flex flex-wrap gap-1.5">
                {ICON_CHOICES.map((ic) => (
                  <button
                    key={ic}
                    type="button"
                    onClick={() => setForm({ ...form, icon: ic })}
                    className={`flex size-9 items-center justify-center rounded-lg border transition-colors ${form.icon === ic ? "border-brand bg-brand-50 text-brand" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}
                  >
                    <JenisIcon icon={ic} className="size-4.5" />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label className="mb-1.5 block text-sm">Template Nomor Surat</Label>
              <Input
                className="font-mono text-xs"
                value={form.templateNomor}
                onChange={(e) => setForm({ ...form, templateNomor: e.target.value })}
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Variabel: {"{seq}"} nomor urut, {"{kode}"} kode jenis, {"{year}"} tahun.
              </p>
            </div>

            {/* pembangun form dinamis */}
            <div className="rounded-xl border border-slate-200 p-3.5">
              <div className="mb-2 flex items-center justify-between">
                <p className="flex items-center gap-1.5 text-sm font-semibold">
                  <ListPlus className="size-4 text-teal-brand" /> Formulir & Dokumen
                </p>
                <button
                  type="button"
                  onClick={() => {
                    if (!modeJson) setJsonText(JSON.stringify({ fields: form.fields, dokumen: form.dokumen }, null, 2));
                    else {
                      try {
                        const p = JSON.parse(jsonText);
                        setForm({ ...form, fields: p.fields ?? [], dokumen: p.dokumen ?? [] });
                      } catch {
                        toast.error("JSON tidak valid");
                        return;
                      }
                    }
                    setModeJson(!modeJson);
                  }}
                  className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline"
                >
                  <Code2 className="size-3.5" /> {modeJson ? "Mode visual" : "Mode JSON"}
                </button>
              </div>

              {modeJson ? (
                <div className="space-y-1.5">
                  <Textarea
                    rows={12}
                    className="font-mono text-xs"
                    value={jsonText}
                    onChange={(e) => setJsonText(e.target.value)}
                    placeholder={`Contoh:\n{\n  "fields": [\n    { "key": "keperluan", "label": "Keperluan", "type": "text", "required": true },\n    { "key": "poli_tujuan", "label": "Poli tujuan", "type": "select", "required": true, "options": ["Umum", "Gigi", "Farmasi"] }\n  ],\n  "dokumen": [\n    { "nama": "Surat permohonan", "required": true }\n  ]\n}`}
                  />
                  {jsonGalat ? (
                    <p className="text-xs font-medium text-red-500">✗ {jsonGalat}</p>
                  ) : (
                    <p className="text-xs font-medium text-emerald-600">✓ JSON valid</p>
                  )}
                  <p className="text-[11px] text-muted-foreground">
                    Struktur: objek dengan "fields" (kolom formulir) dan "dokumen" (berkas yang diminta). Tipe kolom: text, textarea, number, date, select. Kolom bertipe <b>select</b> wajib punya "options" berupa daftar pilihan.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Kolom formulir</p>
                  {form.fields.map((f, i) => (
                    <div key={i} className="space-y-1.5">
                      <div className="grid grid-cols-[1fr_130px_70px_36px] items-center gap-2">
                        <Input placeholder={`Label kolom ${i + 1}`} value={f.label} onChange={(e) => setField(i, { label: e.target.value, key: e.target.value.toLowerCase().replace(/\s+/g, "_").slice(0, 40) || `kolom_${i + 1}` })} />
                        <Select
                          value={f.type}
                          onValueChange={(v) =>
                            setField(i, {
                              type: v as FormField["type"],
                              ...(v === "select" && !f.options ? { options: ["Pilihan 1", "Pilihan 2"] } : {}),
                            })
                          }
                        >
                          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {TIPE_FIELD.map((t) => (
                              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <label className="flex items-center gap-1 text-xs text-muted-foreground">
                          <input type="checkbox" checked={f.required} onChange={(e) => setField(i, { required: e.target.checked })} /> Wajib
                        </label>
                        <button type="button" onClick={() => setForm({ ...form, fields: form.fields.filter((_, xi) => xi !== i) })} className="text-red-400 hover:text-red-600">
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                      {f.type === "select" && (
                        <OptionsInput value={f.options ?? []} onChange={(options) => setField(i, { options })} />
                      )}
                    </div>
                  ))}
                  <Button type="button" size="sm" variant="outline" onClick={() => setForm({ ...form, fields: [...form.fields, { key: `kolom_${form.fields.length + 1}`, label: "", type: "text", required: true }] })}>
                    <Plus className="size-3.5" /> Tambah kolom
                  </Button>

                  <p className="pt-2 text-xs font-medium uppercase tracking-wide text-slate-500">Dokumen yang diminta</p>
                  {form.dokumen.map((d, i) => (
                    <div key={i} className="grid grid-cols-[1fr_70px_36px] items-center gap-2">
                      <Input placeholder={`Nama dokumen ${i + 1}`} value={d.nama} onChange={(e) => setForm({ ...form, dokumen: form.dokumen.map((x, xi) => (xi === i ? { ...x, nama: e.target.value } : x)) })} />
                      <label className="flex items-center gap-1 text-xs text-muted-foreground">
                        <input type="checkbox" checked={d.required} onChange={(e) => setForm({ ...form, dokumen: form.dokumen.map((x, xi) => (xi === i ? { ...x, required: e.target.checked } : x)) })} /> Wajib
                      </label>
                      <button type="button" onClick={() => setForm({ ...form, dokumen: form.dokumen.filter((_, xi) => xi !== i) })} className="text-red-400 hover:text-red-600">
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  ))}
                  <Button type="button" size="sm" variant="outline" onClick={() => setForm({ ...form, dokumen: [...form.dokumen, { nama: "", required: true }] })}>
                    <Plus className="size-3.5" /> Tambah dokumen
                  </Button>
                </div>
              )}
            </div>
              </>
            ) : (
              <TabTemplateSurat
                tpl={tpl}
                setTpl={setTpl}
                tplDefault={tplDefault}
                setTplDefault={setTplDefault}
                kunciTersedia={kunciTersedia}
                onPratinjau={() =>
                  setPratinjau({ open: true, jenisId: form.id, templateSurat: tplDefault ? null : JSON.stringify(tpl) })
                }
                onPakaiDefault={() => {
                  setTpl(parseTemplateSurat(null));
                  setTplDefault(true);
                }}
              />
            )}

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} /> Aktifkan jenis ini
              </label>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setBuka(false)}>Batal</Button>
                <Button onClick={simpan} disabled={busy || !form.kodeJenis || !form.namaJenis || (modeJson && !!jsonGalat)} className="bg-brand">
                  {busy && <Loader2 className="size-4 animate-spin" />} Simpan
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <PratinjauSuratDialog state={pratinjau} onClose={() => setPratinjau({ open: false })} />
    </div>
  );
}
