const BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");

function url(path: string) {
  // Ensures BASE is used and path is correct
  return `${BASE}${path.startsWith("/") ? "" : "/"}${path}`;
}

export async function apiUploadRoster(file: File) {
  if (!BASE) throw new Error("NEXT_PUBLIC_API_BASE_URL is not set");

  const fd = new FormData();
  fd.append("file", file);

  const res = await fetch(url("/roster/upload"), {
    method: "POST",
    body: fd,
  });

  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function apiOptimize(rosterId: string) {
  if (!BASE) throw new Error("NEXT_PUBLIC_API_BASE_URL is not set");

  const res = await fetch(url(`/roster/${rosterId}/optimize`), { method: "POST" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function apiPreview(rosterId: string, limit = 200) {
  if (!BASE) throw new Error("NEXT_PUBLIC_API_BASE_URL is not set");

  const res = await fetch(url(`/roster/${rosterId}/preview?limit=${limit}`));
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function apiChat(rosterId: string, message: string) {
  if (!BASE) throw new Error("NEXT_PUBLIC_API_BASE_URL is not set");

  const res = await fetch(url(`/roster/${rosterId}/chat`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export function downloadUrl(rosterId: string, format: "xlsx" | "csv" | "json" | "pdf") {
  if (!BASE) throw new Error("NEXT_PUBLIC_API_BASE_URL is not set");
  return url(`/roster/${rosterId}/download?format=${format}`);
}

export async function apiUploadCompliance(rosterId: string, file: File) {
  if (!BASE) throw new Error("NEXT_PUBLIC_API_BASE_URL is not set");

  const fd = new FormData();
  fd.append("file", file);

  const res = await fetch(url(`/roster/${rosterId}/compliance/upload`), {
    method: "POST",
    body: fd,
  });

  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function apiGetCompliance(rosterId: string) {
  if (!BASE) throw new Error("NEXT_PUBLIC_API_BASE_URL is not set");

  const res = await fetch(url(`/roster/${rosterId}/compliance`));
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function apiValidateCompliance(rosterId: string) {
  if (!BASE) throw new Error("NEXT_PUBLIC_API_BASE_URL is not set");

  const res = await fetch(url(`/roster/${rosterId}/compliance/validate`), { method: "POST" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}