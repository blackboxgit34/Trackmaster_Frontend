import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}



import { API_BASE_URL } from "@/config/Api";

export const downloadReport = async (
  endpoint: string,
  requestModel: any,
  downloadType: "Excel" | "Pdf",
  extraParams?: Record<string, string>
) => {
  const queryParams = new URLSearchParams();

  Object.entries({
    mode: "over",
    ...requestModel,
    iDisplayStart: 0,
  iDisplayLength: 100000,
    DownloadType: downloadType,
     ...extraParams,
  }).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      queryParams.append(key, String(value));
    }
  });

const APIurl = `${API_BASE_URL}${endpoint}?${queryParams.toString()}`;

console.log("Download URL:", APIurl);

const response = await fetch(APIurl);

  if (!response.ok) {
    throw new Error(`Download failed (${response.status})`);
  }

  const blob = await response.blob();

  let fileName =
    downloadType === "Excel"
      ? "Report.xlsx"
      : "Report.pdf";

  const contentDisposition =
    response.headers.get("content-disposition");

  if (contentDisposition) {
    const match = contentDisposition.match(
      /filename="?([^"]+)"?/i
    );

    if (match?.[1]) {
      fileName = match[1];
    }
  }

  const url = window.URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;

  document.body.appendChild(link);
  link.click();

  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};