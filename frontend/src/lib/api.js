const API_BASE = "/api";

async function request(url, options = {}) {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(error.detail || `Request failed: ${response.status}`);
  }

  return response.json();
}

export async function uploadDiagram(file, description = "") {
  const formData = new FormData();
  formData.append("file", file);
  if (description) {
    formData.append("description", description);
  }

  const response = await fetch(`${API_BASE}/upload`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(error.detail || "Upload failed");
  }

  return response.json();
}

export async function createStudy(name, description, processType) {
  return request("/studies", {
    method: "POST",
    body: JSON.stringify({ name, description, process_type: processType }),
  });
}

export async function getStudies() {
  return request("/studies");
}

export async function getStudy(studyId) {
  return request(`/studies/${studyId}`);
}

export async function getNodes(studyId) {
  return request(`/studies/${studyId}/nodes`);
}

export async function getDeviations(studyId, nodeId) {
  return request(`/studies/${studyId}/nodes/${nodeId}/deviations`);
}

export async function updateDeviation(deviationId, data) {
  return request(`/deviations/${deviationId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function startAnalysis(studyId, onMessage, onError, onComplete, options = {}) {
  const response = await fetch(`${API_BASE}/studies/${studyId}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      diagram_path: options.diagram_path || null,
      process_description: options.process_description || null,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(error.detail || "Analysis failed");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop();

    for (const line of lines) {
      if (line.startsWith("data:")) {
        const dataStr = line.slice(5).trim();
        if (!dataStr) continue;
        try {
          const data = JSON.parse(dataStr);
          if (data.phase === "complete" || data.status === "finished") {
            onComplete?.(data);
          } else {
            onMessage?.(data);
          }
        } catch {
          // skip non-JSON lines
        }
      }
    }
  }
  // Process any remaining buffer
  if (buffer.startsWith("data:")) {
    const dataStr = buffer.slice(5).trim();
    if (dataStr) {
      try {
        const data = JSON.parse(dataStr);
        if (data.phase === "complete" || data.status === "finished") {
          onComplete?.(data);
        } else {
          onMessage?.(data);
        }
      } catch { /* skip */ }
    }
  }
}

export async function sendAgentMessage(studyId, message) {
  return request(`/agent/chat`, {
    method: "POST",
    body: JSON.stringify({ study_id: studyId, message }),
  });
}

export async function exportExcel(studyId) {
  const response = await fetch(`${API_BASE}/studies/${studyId}/export/excel`, {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error("Excel export failed");
  }
  return response.blob();
}

export async function exportPdf(studyId) {
  const response = await fetch(`${API_BASE}/studies/${studyId}/export/pdf`, {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error("PDF export failed");
  }
  return response.blob();
}
