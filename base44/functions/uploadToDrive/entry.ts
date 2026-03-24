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

async function getOrCreateFolders(base44, authHeader) {
  const configs = await base44.asServiceRole.entities.DriveConfig.list();
  if (configs.length > 0) {
    const c = configs[0];
    if (c.root_folder_id && c.reparaciones_folder_id) return c;
  }

  // Create folder structure
  const rootId = await createFolder('carpeta sistema MILLAFOR', null, authHeader);
  const [repId, cotId, vtaId, opmId] = await Promise.all([
    createFolder('Reparaciones', rootId, authHeader),
    createFolder('Cotizaciones', rootId, authHeader),
    createFolder('Ventas', rootId, authHeader),
    createFolder('Informes de Puesta en Marcha', rootId, authHeader),
  ]);

  const config = {
    root_folder_id: rootId,
    reparaciones_folder_id: repId,
    cotizaciones_folder_id: cotId,
    ventas_folder_id: vtaId,
    puesta_en_marcha_folder_id: opmId,
  };

  if (configs.length > 0) {
    await base44.asServiceRole.entities.DriveConfig.update(configs[0].id, config);
  } else {
    await base44.asServiceRole.entities.DriveConfig.create(config);
  }

  return config;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { pdfBase64, filename, category } = await req.json();
    // category: 'reparaciones' | 'cotizaciones' | 'ventas' | 'puesta_en_marcha'

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googledrive');
    const authHeader = { Authorization: `Bearer ${accessToken}` };

    const folders = await getOrCreateFolders(base44, authHeader);

    const folderMap = {
      reparaciones: folders.reparaciones_folder_id,
      cotizaciones: folders.cotizaciones_folder_id,
      ventas: folders.ventas_folder_id,
      puesta_en_marcha: folders.puesta_en_marcha_folder_id,
    };

    const folderId = folderMap[category] || folders.root_folder_id;

    // Convert base64 to binary
    const base64Data = pdfBase64.includes(',') ? pdfBase64.split(',')[1] : pdfBase64;
    const binaryStr = atob(base64Data);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);

    // Multipart upload
    const boundary = '-------millafor_boundary';
    const meta = JSON.stringify({ name: filename, parents: [folderId] });
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

    return Response.json({ success: true, fileId: result.id, fileName: result.name });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});