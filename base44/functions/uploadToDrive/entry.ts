import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';

async function createFolder(name, parentId, authHeader) {
  const meta = { name, mimeType: 'application/vnd.google-apps.folder', parents: parentId ? [parentId] : [] };
  const res = await fetch(`${DRIVE_API}/files`, {
    method: 'POST',
    headers: { ...authHeader, 'Content-Type': 'application/json' },
    body: JSON.stringify(meta),
  });
  const data = await res.json();
  return data.id;
}

// Returns the month key like "2026-03"
function getMonthKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

async function getOrCreateRootFolders(base44, authHeader) {
  const configs = await base44.asServiceRole.entities.DriveConfig.list();
  const existing = configs.length > 0 ? configs[0] : null;

  if (
    existing?.root_folder_id &&
    existing?.reparaciones_folder_id &&
    existing?.cotizaciones_folder_id &&
    existing?.ventas_folder_id &&
    existing?.puesta_en_marcha_folder_id &&
    existing?.garantia_folder_id &&
    existing?.credito_folder_id
  ) {
    return existing;
  }

  // Create root if missing
  const rootId = existing?.root_folder_id || await createFolder('Sistema Gestión — Documentos', null, authHeader);

  const [repId, cotId, vtaId, opmId, garId, credId] = await Promise.all([
    existing?.reparaciones_folder_id    || createFolder('Reparaciones', rootId, authHeader),
    existing?.cotizaciones_folder_id    || createFolder('Cotizaciones', rootId, authHeader),
    existing?.ventas_folder_id          || createFolder('Ventas', rootId, authHeader),
    existing?.puesta_en_marcha_folder_id|| createFolder('Puesta en Marcha', rootId, authHeader),
    existing?.garantia_folder_id        || createFolder('Garantía', rootId, authHeader),
    existing?.credito_folder_id         || createFolder('Crédito', rootId, authHeader),
  ]);

  const config = {
    root_folder_id: rootId,
    reparaciones_folder_id: repId,
    cotizaciones_folder_id: cotId,
    ventas_folder_id: vtaId,
    puesta_en_marcha_folder_id: opmId,
    garantia_folder_id: garId,
    credito_folder_id: credId,
    month_folders: existing?.month_folders || {},
  };

  if (existing) {
    await base44.asServiceRole.entities.DriveConfig.update(existing.id, config);
    return { ...existing, ...config };
  } else {
    const created = await base44.asServiceRole.entities.DriveConfig.create(config);
    return created;
  }
}

// Get or create a YYYY-MM subfolder inside a category folder
async function getOrCreateMonthFolder(base44, authHeader, categoryFolderId, configRecord) {
  const monthKey = getMonthKey();
  const cacheKey = `${categoryFolderId}__${monthKey}`;
  const monthFolders = configRecord.month_folders || {};

  if (monthFolders[cacheKey]) return monthFolders[cacheKey];

  const newFolderId = await createFolder(monthKey, categoryFolderId, authHeader);
  monthFolders[cacheKey] = newFolderId;

  // Persist updated month_folders map
  await base44.asServiceRole.entities.DriveConfig.update(configRecord.id, { month_folders: monthFolders });
  configRecord.month_folders = monthFolders;

  return newFolderId;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { pdfBase64, filename, category } = await req.json();
    // category: 'reparaciones' | 'cotizaciones' | 'ventas' | 'puesta_en_marcha' | 'garantia' | 'credito'

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googledrive');
    const authHeader = { Authorization: `Bearer ${accessToken}` };

    const config = await getOrCreateRootFolders(base44, authHeader);

    const categoryFolderMap = {
      reparaciones:    config.reparaciones_folder_id,
      cotizaciones:    config.cotizaciones_folder_id,
      ventas:          config.ventas_folder_id,
      puesta_en_marcha: config.puesta_en_marcha_folder_id,
      garantia:        config.garantia_folder_id,
      credito:         config.credito_folder_id,
    };

    const categoryFolderId = categoryFolderMap[category] || config.root_folder_id;

    // Get/create month subfolder
    const monthFolderId = await getOrCreateMonthFolder(base44, authHeader, categoryFolderId, config);

    // Convert base64 to binary
    const base64Data = pdfBase64.includes(',') ? pdfBase64.split(',')[1] : pdfBase64;
    const binaryStr = atob(base64Data);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);

    // Multipart upload
    const boundary = '-------fml_boundary';
    const meta = JSON.stringify({ name: filename, parents: [monthFolderId] });
    const bodyParts = [
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n`,
      `--${boundary}\r\nContent-Type: application/pdf\r\n\r\n`,
    ];
    const textEncoder = new TextEncoder();
    const part1 = textEncoder.encode(bodyParts[0]);
    const part2 = textEncoder.encode(bodyParts[1]);
    const part3 = textEncoder.encode(`\r\n--${boundary}--`);
    const body = new Uint8Array(part1.length + part2.length + bytes.length + part3.length);
    body.set(part1, 0);
    body.set(part2, part1.length);
    body.set(bytes, part1.length + part2.length);
    body.set(part3, part1.length + part2.length + bytes.length);

    const uploadRes = await fetch(`${UPLOAD_API}/files?uploadType=multipart`, {
      method: 'POST',
      headers: { ...authHeader, 'Content-Type': `multipart/related; boundary=${boundary}` },
      body,
    });

    const result = await uploadRes.json();
    if (!uploadRes.ok) return Response.json({ error: result.error?.message || 'Upload failed' }, { status: 500 });

    const monthKey = getMonthKey();
    return Response.json({ success: true, fileId: result.id, fileName: result.name, month: monthKey });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});