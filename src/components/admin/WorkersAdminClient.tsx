"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea, Select } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { Worker } from "@/lib/supabase/types";
import { formatSalary } from "@/lib/utils";
import styles from "./WorkersAdminClient.module.css";

const EMPTY = {
  full_name: "",
  nationality: "فلبينية",
  experience_years: 3,
  languages: ["العربية", "الإنجليزية"],
  religion: "",
  marital_status: "",
  children_count: 0,
  expected_salary: 1500,
  skills: [],
  photo_url: "",
  availability: "available" as const,
  employment_type: "monthly" as const,
  terms: "",
  return_policy: "",
};

export function WorkersAdminClient({ workers }: { workers: Worker[] }) {
  const toast = useToast();
  const [modal, setModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [skillsText, setSkillsText] = useState("");
  const [langsText, setLangsText] = useState("العربية، الإنجليزية");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = e.currentTarget;
    const data = new FormData(form);
    const skills = (skillsText || "").split(/[،,]/).map((s) => s.trim()).filter(Boolean);
    const languages = (langsText || "").split(/[،,]/).map((s) => s.trim()).filter(Boolean);

    const payload = {
      full_name: String(data.get("full_name") ?? ""),
      nationality: String(data.get("nationality") ?? ""),
      experience_years: Number(data.get("experience_years") ?? 0),
      languages,
      religion: String(data.get("religion") ?? "") || null,
      marital_status: String(data.get("marital_status") ?? "") || null,
      children_count: Number(data.get("children_count") ?? 0),
      expected_salary: Number(data.get("expected_salary") ?? 0),
      skills,
      photo_url: String(data.get("photo_url") ?? ""),
      availability: String(data.get("availability") ?? "available"),
      employment_type: String(data.get("employment_type") ?? "full_time_live_in"),
      terms: String(data.get("terms") ?? "") || null,
      return_policy: String(data.get("return_policy") ?? "") || null,
    };

    const res = await fetch("/api/admin/workers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await res.json();
    setLoading(false);
    if (!res.ok) {
      if (result.errors) {
        toast.push(Object.values(result.errors).join("، "), "error");
      } else {
        toast.push(result.error || "فشل", "error");
      }
      return;
    }
    toast.push("تمت إضافة المرشح", "success");
    setModal(false);
    window.location.reload();
  }

  async function toggleAvailability(w: Worker) {
    const next = w.availability === "available" ? "booked" : "available";
    const res = await fetch(`/api/admin/workers/${w.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ availability: next }),
    });
    if (res.ok) {
      toast.push("تم التحديث", "success");
      window.location.reload();
    } else {
      toast.push("فشل", "error");
    }
  }

  async function deleteWorker(w: Worker) {
    if (!confirm(`حذف ${w.full_name}؟`)) return;
    const res = await fetch(`/api/admin/workers/${w.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.push("تم الحذف", "success");
      window.location.reload();
    } else {
      toast.push("فشل", "error");
    }
  }

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>المرشحون ({workers.length})</h1>
        <Button onClick={() => setModal(true)}>+ إضافة مرشح</Button>
      </div>

      <Card className={styles.tableCard}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>الصورة</th>
              <th>الاسم</th>
              <th>الجنسية</th>
              <th>الراتب</th>
              <th>التوفر</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {workers.map((w) => (
              <tr key={w.id}>
                <td><img src={w.photo_url} alt={w.full_name} className={styles.thumb} /></td>
                <td>{w.full_name}</td>
                <td>{w.nationality}</td>
                <td>{formatSalary(w.expected_salary, "ar")}</td>
                <td>
                  <span className={styles.statusBadge} data-status={w.availability}>
                    {w.availability === "available" ? "متاح" : "محجوز"}
                  </span>
                </td>
                <td>
                  <div className={styles.actions}>
                    <button className={styles.actBtn} onClick={() => toggleAvailability(w)}>
                      تبديل
                    </button>
                    <button className={styles.deleteBtn} onClick={() => deleteWorker(w)}>
                      حذف
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Modal open={modal} onClose={() => setModal(false)} title="إضافة مرشح جديد" size="lg">
        <form onSubmit={submit} className={styles.form}>
          <div className={styles.row}>
            <Field label="الاسم الكامل">
              <Input name="full_name" required defaultValue={EMPTY.full_name} />
            </Field>
            <Field label="الجنسية">
              <Input name="nationality" required defaultValue={EMPTY.nationality} />
            </Field>
          </div>
          <div className={styles.row}>
            <Field label="سنوات الخبرة">
              <Input name="experience_years" type="number" required defaultValue={EMPTY.experience_years} />
            </Field>
            <Field label="الراتب المتوقع (ر.ق)">
              <Input name="expected_salary" type="number" required defaultValue={EMPTY.expected_salary} />
            </Field>
          </div>
          <div className={styles.row}>
            <Field label="الديانة">
              <Input name="religion" defaultValue={EMPTY.religion} />
            </Field>
            <Field label="الحالة الاجتماعية">
              <Input name="marital_status" defaultValue={EMPTY.marital_status} />
            </Field>
            <Field label="عدد الأطفال">
              <Input name="children_count" type="number" defaultValue={EMPTY.children_count} />
            </Field>
          </div>
          <Field label="اللغات (افصل بفاصلة)">
            <Input value={langsText} onChange={(e) => setLangsText(e.target.value)} />
          </Field>
          <Field label="المهارات (افصل بفاصلة)">
            <Input value={skillsText} onChange={(e) => setSkillsText(e.target.value)} placeholder="تنظيف، طبخ، رعاية أطفال" />
          </Field>
          <Field label="رابط الصورة">
            <Input name="photo_url" defaultValue={EMPTY.photo_url} placeholder="https://..." />
          </Field>
          <div className={styles.row}>
            <Field label="التوفر">
              <Select name="availability" defaultValue="available">
                <option value="available">متاح</option>
                <option value="booked">محجوز</option>
              </Select>
            </Field>
            <Field label="نوع العمالة">
              <Select name="employment_type" defaultValue="monthly">
                <option value="hourly">بالساعة</option>
                <option value="daily">يومياً</option>
                <option value="monthly">شهرياً</option>
                <option value="yearly">سنوياً</option>
              </Select>
            </Field>
          </div>
          <Field label="الشروط الخاصة">
            <Textarea name="terms" defaultValue={EMPTY.terms} />
          </Field>
          <Field label="سياسة الاسترجاع">
            <Textarea name="return_policy" defaultValue={EMPTY.return_policy} />
          </Field>
          <Button type="submit" size="lg" disabled={loading}>
            {loading ? "جارٍ..." : "إضافة"}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
