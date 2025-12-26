import bg from "./assets/bg.jpg";
import React from "react";
import { useEffect, useMemo, useState } from "react";
import "./App.css";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

/** Luôn lock UI chỉ 8 biến */
const ALLOWED = [
  "odor",
  "spore-print-color",
  "gill-size",
  "gill-color",
  "ring-type",
  "habitat",
  "bruises",
  "cap-color",
];

const VN_NAME = {
  odor: "Mùi",
  "spore-print-color": "Màu bào tử in",
  "gill-size": "Kích thước lá tia",
  "gill-color": "Màu lá tia",
  "ring-type": "Kiểu vòng",
  habitat: "Môi trường sống",
  bruises: "Bầm/dập",
  "cap-color": "Màu mũ nấm",
};


function Field({ field, value, onChange }) {
  const isObj = field.options?.length && typeof field.options[0] === "object";

  const displayName = VN_NAME[field.name] || field.displayName || field.name;

  const selected = useMemo(() => {
    if (!isObj) return null;
    return field.options.find((o) => o.value === value) || null;
  }, [field.options, value, isObj]);

  return (
    <div className="field">
      {/* Tên biến */}
      <label>{displayName}</label>

      {/* Mô tả xuống dưới + icon i */}
      {field.description ? (
        <div className="desc-row">
          <span className="info" title={field.description}>ⓘ</span>
          <span>{field.description}</span>
        </div>
      ) : null}

      {/* Dropdown */}
      <select
        className="select"
        value={value || ""}
        onChange={(e) => onChange(field.name, e.target.value)}
      >
        <option value="">(Chọn)</option>

        {/* Nếu options là string (hiếm), thì show y nguyên */}
        {!isObj &&
          field.options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}

        {/* Options object: chỉ show label/giải nghĩa */}
        {isObj &&
          field.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label || opt.description || opt.value}
            </option>
          ))}
      </select>
    </div>
  );
}

export default function App() {
  const [schema, setSchema] = useState(null);
  const [form, setForm] = useState({});
  const [result, setResult] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const filteredFeatures = useMemo(() => {
    if (!schema?.features) return [];
    return schema.features.filter((f) => ALLOWED.includes(f.name));
  }, [schema]);

  useEffect(() => {
    fetch(`${API}/schema`)
      .then((r) => r.json())
      .then((s) => {
        setSchema(s);
        const init = {};
        s.features
          .filter((f) => ALLOWED.includes(f.name))
          .forEach((f) => (init[f.name] = ""));
        setForm(init);
      })
      .catch(() => setErr("Không load được schema từ backend. Kiểm tra backend đang chạy + CORS."));
  }, []);

  const progress = useMemo(() => {
    const keys = Object.keys(form);
    if (!keys.length) return 0;
    const done = keys.filter((k) => form[k]).length;
    return Math.round((done / keys.length) * 100);
  }, [form]);

  const onChange = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const canPredict = useMemo(() => {
    const keys = Object.keys(form);
    if (!keys.length) return false;
    return keys.every((k) => form[k]);
  }, [form]);

  const reset = () => {
    if (!confirm("Bạn muốn xoá toàn bộ lựa chọn và làm lại từ đầu?")) return;
    setErr("");
    setResult(null);
    setLoading(false);
    setForm((prev) => {
      const cleared = {};
      for (const k of Object.keys(prev)) cleared[k] = "";
      return cleared;
    });
  };

  const predict = async () => {
    setErr("");
    setResult(null);
    setLoading(true);

    try {
      const res = await fetch(`${API}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) {
        setErr(data.detail || "Lỗi predict.");
        setLoading(false);
        return;
      }
      setResult(data);
    } catch {
      setErr("Không gọi được API /predict. Kiểm tra backend đang chạy.");
    } finally {
      setLoading(false);
    }
  };

  const badgeClass = useMemo(() => {
    if (!result) return "warn";
    if (result.class === "e") return "good";
    if (result.class === "p") return "bad";
    return "warn";
  }, [result]);

  const resultIcon = useMemo(() => {
    if (!result) return "🧫";
    if (result.class === "e") return "✅";
    if (result.class === "p") return "☠️";
    return "⚠️";
  }, [result]);

  const resultTitle = useMemo(() => {
    if (!result) return "Chưa có kết quả";
    return `${resultIcon} ${result.label} (${result.class})`;
  }, [result, resultIcon]);

  return (
    <div className="app-bg" style={{ "--bgUrl": `url(${bg})` }}>
      <div className="container">
        <div className="header">
          <div className="brand">
            <h1 className="title">Mushroom Safety Classifier</h1>
            <p className="subtitle">
              Mô tả các đặc trưng của chiếc nấm bạn vừa tìm được để biết nó <b>Ăn được</b> hay <b>Độc</b>
            </p>
          </div>

          <div className="progress-wrap">
            <div className="progress" title="Tiến độ điền form">
              <div style={{ width: `${progress}%` }} />
            </div>
            <div style={{ marginTop: 6, color: "rgba(255,255,255,0.75)", fontSize: 12 }}>
              Tiến độ: <b>{progress}%</b>
            </div>
          </div>
        </div>

        <div className="grid">
          {/* LEFT: Form */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Thông tin quan sát</h2>
              <div className="actions">
                <button className="btn btn-danger" onClick={reset} type="button">
                  Reset
                </button>
                <button
                  className="btn btn-primary"
                  onClick={predict}
                  type="button"
                  disabled={!canPredict || loading}
                  title={!canPredict ? "Hãy mô tả đủ 8 đặc trưng của nấm để dự đoán chính xác hơn" : "Dự đoán"}
                >
                  {loading ? "Đang phân tích..." : "Predict"}
                </button>
              </div>
            </div>

            <div className="card-body">
              {!schema ? (
                <div className="status">Loading schema…</div>
              ) : (
                <div className="form-grid">
                  {filteredFeatures.map((f) => (
                    <Field key={f.name} field={f} value={form[f.name]} onChange={onChange} />
                  ))}
                </div>
              )}

              {err ? (
                <div className="status" style={{ borderColor: "rgba(244,63,94,0.35)" }}>
                  {err}
                </div>
              ) : null}

              {!err && !canPredict ? (
                <div className="status">
                  Mô tả đủ 8 đặc trưng để dự đoán chính xác hơn
                </div>
              ) : null}
            </div>
          </div>

          {/* RIGHT: Result */}
          <div className="card right-sticky">
            <div className="card-header">
              <h2 className="card-title">Kết quả</h2>
              <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 11 }}>
              </div>
            </div>

            <div className="card-body">
              <div className="result-box">
                <div className={`badge ${badgeClass}`}>
                  <p className="big">{resultTitle}</p>
                  <p className="small">
                    {result
                      ? "Đây là kết quả DỰ ĐOÁN. Không nên dựa vào kết quả 100% để quyết định việc ăn nấm hay không."
                      : "Chọn đủ thông tin và bấm Predict để xem kết quả."}
                  </p>
                </div>

                {result?.confidence != null ? (
                  <div className="badge">
                    <div className="kv">
                      <div>
                        <b>Độ tin cậy (ước lượng):</b> {(result.confidence * 100).toFixed(2)}%
                      </div>
                      <div>
                        <b>Gợi ý:</b>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}