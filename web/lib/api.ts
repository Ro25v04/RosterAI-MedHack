const BASE = "";


export async function apiUploadRoster(file: File) {
  const fd = new FormData();
  fd.append("file", file);

  const res = await fetch(`${BASE}/roster/upload`, {
    method: "POST",
    body: fd,
  });

  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function apiOptimize(rosterId: string) {
  const res = await fetch(`${BASE}/roster/${rosterId}/optimize`, { method: "POST" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function apiPreview(rosterId: string, limit = 200) {
  const res = await fetch(`${BASE}/roster/${rosterId}/preview?limit=${limit}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function apiChat(rosterId: string, message: string) {
  const res = await fetch(`${BASE}/roster/${rosterId}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export function downloadUrl(rosterId: string, format: "xlsx" | "csv" | "json" | "pdf") {
  return `${BASE}/roster/${rosterId}/download?format=${format}`;
}


export async function apiUploadCompliance(rosterId: string, file: File) {
  const fd = new FormData();
  fd.append("file", file);

  const res = await fetch(`${BASE}/roster/${rosterId}/compliance/upload`, {
    method: "POST",
    body: fd,
  });

  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function apiGetCompliance(rosterId: string) {
  const res = await fetch(`${BASE}/roster/${rosterId}/compliance`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function apiValidateCompliance(rosterId: string) {
  const res = await fetch(`${BASE}/roster/${rosterId}/compliance/validate`, { method: "POST" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}