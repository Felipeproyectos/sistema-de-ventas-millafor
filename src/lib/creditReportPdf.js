import { getPdfBlobUrl } from './pdfUtils';

export async function generateCreditIndividualPdf(credit, settings) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const ml = 14, mr = pw - 14;
  const W = mr - ml;
  const DARK = [8, 18, 40], BLUE = [30, 70, 140], GRAY = [100, 115, 145];

  // ── HEADER ──
  doc.setFillColor(...DARK); doc.rect(0, 0, pw, 42, 'F');
  doc.setFillColor(...BLUE); doc.rect(0, 37, pw, 5, 'F');
  doc.setFont('helvetica','bold'); doc.setFontSize(13); doc.setTextColor(255,255,255);
  doc.text((settings?.company_name || 'EMPRESA').toUpperCase(), ml, 12);
  doc.setFont('helvetica','normal'); doc.setFontSize(7); doc.setTextColor(160,190,240);
  let hY = 18;
  if (settings?.legal_rep) { doc.text(`Rep. Legal: ${settings.legal_rep}`, ml, hY); hY += 4; }
  if (settings?.tax_id)    { doc.text(`RUT: ${settings.tax_id}`, ml, hY); hY += 4; }
  if (settings?.phone)     { doc.text(`Tel: ${settings.phone}`, ml, hY); hY += 4; }
  if (settings?.email)     { doc.text(settings.email, ml, hY); }

  const logoSize = 26, logoX = mr - logoSize;
  if (settings?.logo_url) {
    try {
      const img = await new Promise((res,rej) => { const i = new Image(); i.crossOrigin='anonymous'; i.onload=()=>res(i); i.onerror=rej; i.src=settings.logo_url; });
      const c = document.createElement('canvas'); c.width=img.width; c.height=img.height; c.getContext('2d').drawImage(img,0,0);
      doc.setFillColor(255,255,255); doc.roundedRect(logoX-3,5,logoSize+6,logoSize+4,2,2,'F');
      doc.addImage(c.toDataURL('image/png'),'PNG',logoX,7,logoSize,logoSize-2);
    } catch {}
  }

  // ── TITLE BAR ──
  let y = 48;
  doc.setFillColor(235,240,252); doc.rect(ml,y,W,12,'F');
  doc.setFillColor(...BLUE); doc.rect(ml,y,4,12,'F');
  doc.setFont('helvetica','bold'); doc.setFontSize(11); doc.setTextColor(...DARK);
  doc.text('COMPROBANTE DE CRÉDITO', ml+8, y+8.5);
  const now = new Date();
  doc.setFont('helvetica','normal'); doc.setFontSize(7.5); doc.setTextColor(...GRAY);
  doc.text(`Generado: ${now.toLocaleDateString('es-CL')} ${now.toLocaleTimeString('es-CL',{hour:'2-digit',minute:'2-digit'})}`, mr, y+8.5, { align:'right' });
  y += 17;

  // ── CLIENT INFO ──
  doc.setFont('helvetica','bold'); doc.setFontSize(10); doc.setTextColor(...DARK);
  doc.text((credit.client_name || '-').toUpperCase(), ml, y); y += 5;
  doc.setFont('helvetica','normal'); doc.setFontSize(8.5); doc.setTextColor(...GRAY);
  if (credit.client_rut)   { doc.text(`RUT: ${credit.client_rut}`, ml, y); y += 4.5; }
  if (credit.client_phone) { doc.text(`Teléfono: ${credit.client_phone}`, ml, y); y += 4.5; }
  if (credit.client_email) { doc.text(`Email: ${credit.client_email}`, ml, y); y += 4.5; }
  y += 3;

  // ── DETAILS BOX ──
  const details = [
    ['Descripción / Producto', credit.description || '-'],
    ['Fecha del servicio', credit.service_date || '-'],
    ['Fecha de vencimiento', credit.due_date || '-'],
    ['Estado', credit.status === 'pagado' ? 'PAGADO' : credit.status === 'vencido' ? 'VENCIDO' : 'PENDIENTE'],
    ['Notas', credit.notes || '-'],
  ];
  details.forEach(([label, val]) => {
    doc.setFont('helvetica','bold'); doc.setFontSize(8); doc.setTextColor(...DARK);
    doc.text(label + ':', ml, y);
    doc.setFont('helvetica','normal'); doc.setTextColor(...GRAY);
    doc.text(String(val), ml + 52, y);
    y += 5.5;
  });
  y += 4;

  // ── AMOUNTS ──
  const remaining = Math.max(0, (credit.total_amount || 0) - (credit.amount_paid || 0));
  const amountRows = [
    ['Monto Total', `$${(credit.total_amount||0).toLocaleString('es-CL')}`, DARK],
    ['Total Abonado', `$${(credit.amount_paid||0).toLocaleString('es-CL')}`, BLUE],
    ['Saldo Pendiente', `$${remaining.toLocaleString('es-CL')}`, remaining > 0 ? [180,30,30] : [34,140,80]],
  ];
  amountRows.forEach(([label, val, color]) => {
    doc.setFillColor(245,247,252); doc.rect(ml, y, W, 8, 'F');
    doc.setFont('helvetica','normal'); doc.setFontSize(8.5); doc.setTextColor(...GRAY);
    doc.text(label, ml+3, y+5.5);
    doc.setFont('helvetica','bold'); doc.setTextColor(...color);
    doc.text(val, mr-3, y+5.5, { align:'right' });
    y += 9;
  });
  y += 6;

  // ── PAYMENTS HISTORY ──
  if (credit.payments && credit.payments.length > 0) {
    doc.setFont('helvetica','bold'); doc.setFontSize(9); doc.setTextColor(...DARK);
    doc.text('HISTORIAL DE ABONOS', ml, y); y += 5;
    doc.setFillColor(...DARK); doc.rect(ml, y, W, 7, 'F');
    doc.setFont('helvetica','bold'); doc.setFontSize(7); doc.setTextColor(160,195,255);
    doc.text('FECHA', ml+3, y+5); doc.text('MONTO', ml+50, y+5); doc.text('NOTA', ml+85, y+5);
    y += 7;
    credit.payments.forEach((p, i) => {
      const bg = i % 2 === 0 ? [248,250,255] : [255,255,255];
      doc.setFillColor(...bg); doc.rect(ml, y, W, 7, 'F');
      doc.setFont('helvetica','normal'); doc.setFontSize(7.5); doc.setTextColor(...DARK);
      doc.text(p.date || '-', ml+3, y+5);
      doc.text(`$${(p.amount||0).toLocaleString('es-CL')}`, ml+50, y+5);
      doc.setTextColor(...GRAY); doc.text(p.note || '', ml+85, y+5);
      y += 7;
    });
  }

  // ── FOOTER ──
  const footerY = ph - 18;
  doc.setFillColor(...DARK); doc.rect(0, footerY, pw, 18, 'F');
  doc.setFillColor(...BLUE); doc.rect(0, footerY, pw, 1.5, 'F');
  doc.setFont('helvetica','bold'); doc.setFontSize(8); doc.setTextColor(200,215,245);
  doc.text((settings?.company_name || '').toUpperCase(), pw/2, footerY+7, { align:'center' });
  doc.setFont('helvetica','normal'); doc.setFontSize(6.5); doc.setTextColor(100,135,195);
  doc.text('Documento generado digitalmente por SOLUCIONES TECNOLOGICAS FML', pw/2, footerY+13, { align:'center' });

  return { url: getPdfBlobUrl(doc), doc };
}

export async function generateCreditReportPdf(credits, settings) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const ml = 14, mr = pw - 14;
  const W = mr - ml;

  // ── HEADER ──
  doc.setFillColor(8, 18, 40);
  doc.rect(0, 0, pw, 42, 'F');
  doc.setFillColor(30, 70, 140);
  doc.rect(0, 37, pw, 5, 'F');

  // Company info
  doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(255, 255, 255);
  doc.text((settings?.company_name || 'EMPRESA').toUpperCase(), ml, 12);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(160, 190, 240);
  let hY = 18;
  if (settings?.legal_rep) { doc.text(`Rep. Legal: ${settings.legal_rep}`, ml, hY); hY += 4; }
  if (settings?.tax_id)    { doc.text(`RUT: ${settings.tax_id}`, ml, hY); hY += 4; }
  if (settings?.phone)     { doc.text(`Tel: ${settings.phone}`, ml, hY); hY += 4; }
  if (settings?.email)     { doc.text(settings.email, ml, hY); }

  // Logo
  const logoSize = 26;
  const logoX = mr - logoSize;
  if (settings?.logo_url) {
    try {
      const img = await new Promise((res, rej) => {
        const i = new Image(); i.crossOrigin = 'anonymous';
        i.onload = () => res(i); i.onerror = rej; i.src = settings.logo_url;
      });
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
      c.getContext('2d').drawImage(img, 0, 0);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(logoX - 3, 5, logoSize + 6, logoSize + 4, 2, 2, 'F');
      doc.addImage(c.toDataURL('image/png'), 'PNG', logoX, 7, logoSize, logoSize - 2);
    } catch {}
  }

  // ── TITLE BAR ──
  let y = 48;
  doc.setFillColor(235, 240, 252);
  doc.rect(ml, y, W, 12, 'F');
  doc.setFillColor(30, 70, 140);
  doc.rect(ml, y, 4, 12, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(8, 18, 40);
  doc.text('INFORME DE CRÉDITOS — CLIENTES DEUDORES', ml + 8, y + 8.5);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(80, 100, 140);
  const now = new Date();
  doc.text(`Generado: ${now.toLocaleDateString('es-CL')} ${now.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}`, mr, y + 8.5, { align: 'right' });
  y += 17;

  // ── SUMMARY STATS ──
  const pending = credits.filter(c => c.status !== 'pagado');
  const totalDebt = pending.reduce((s, c) => s + Math.max(0, (c.total_amount || 0) - (c.amount_paid || 0)), 0);
  const overdue = pending.filter(c => new Date(c.due_date) < now);
  const totalOverdue = overdue.reduce((s, c) => s + Math.max(0, (c.total_amount || 0) - (c.amount_paid || 0)), 0);

  const stats = [
    { label: 'Total Créditos', value: credits.length.toString(), color: [8, 18, 40] },
    { label: 'Pendientes', value: pending.length.toString(), color: [30, 70, 140] },
    { label: 'Vencidos', value: overdue.length.toString(), color: [180, 30, 30] },
    { label: 'Deuda Total', value: `$${totalDebt.toLocaleString('es-CL')}`, color: [8, 18, 40] },
  ];

  const boxW = (W - 9) / 4;
  stats.forEach((s, i) => {
    const bx = ml + i * (boxW + 3);
    doc.setFillColor(245, 247, 252); doc.setDrawColor(200, 212, 235); doc.setLineWidth(0.3);
    doc.roundedRect(bx, y, boxW, 16, 2, 2, 'FD');
    doc.setFillColor(...s.color); doc.rect(bx, y, 3, 16, 'F');
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(100, 115, 145);
    doc.text(s.label, bx + 6, y + 6);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...s.color);
    doc.text(s.value, bx + 6, y + 13);
  });
  y += 22;

  // ── TABLE HEADER ──
  const cols = [
    { label: 'CLIENTE', x: ml + 2, w: 38 },
    { label: 'DESCRIPCIÓN', x: ml + 41, w: 45 },
    { label: 'F. INGRESO', x: ml + 87, w: 22 },
    { label: 'F. VENCIMIENTO', x: ml + 110, w: 26 },
    { label: 'TOTAL', x: ml + 137, w: 22 },
    { label: 'PAGADO', x: ml + 160, w: 22 },
    { label: 'SALDO', x: ml + 183, w: 0 },
  ];

  doc.setFillColor(8, 18, 40);
  doc.rect(ml, y, W, 8, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(160, 195, 255);
  cols.forEach(col => doc.text(col.label, col.x, y + 5.5));
  y += 8;

  // ── TABLE ROWS ──
  const statusLabel = { pendiente: 'Pendiente', pagado: 'Pagado', vencido: 'Vencido' };

  credits.forEach((credit, i) => {
    if (y > ph - 30) {
      doc.addPage();
      y = 20;
      // Re-draw header on new page
      doc.setFillColor(8, 18, 40);
      doc.rect(ml, y, W, 8, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(160, 195, 255);
      cols.forEach(col => doc.text(col.label, col.x, y + 5.5));
      y += 8;
    }

    const remaining = Math.max(0, (credit.total_amount || 0) - (credit.amount_paid || 0));
    const isOverdue = credit.status !== 'pagado' && credit.due_date && new Date(credit.due_date) < now;
    const isPaid = credit.status === 'pagado';

    const rowH = 9;
    const bg = i % 2 === 0 ? [248, 250, 255] : [255, 255, 255];
    doc.setFillColor(...bg);
    doc.rect(ml, y, W, rowH, 'F');
    doc.setDrawColor(220, 228, 245); doc.setLineWidth(0.1);
    doc.line(ml, y + rowH, mr, y + rowH);

    // Status color indicator
    if (isPaid) doc.setFillColor(34, 160, 100);
    else if (isOverdue) doc.setFillColor(200, 40, 40);
    else doc.setFillColor(200, 150, 30);
    doc.rect(ml, y, 2.5, rowH, 'F');

    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(15, 25, 55);
    doc.text((credit.client_name || '').substring(0, 20), cols[0].x, y + 6);

    const desc = (credit.description || '').substring(0, 30);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(60, 75, 100);
    doc.text(desc, cols[1].x, y + 6);

    doc.setTextColor(80, 95, 125);
    doc.text(credit.service_date || credit.created_date?.split('T')[0] || '—', cols[2].x, y + 6);
    
    doc.setTextColor(isOverdue ? 180 : 80, isOverdue ? 30 : 95, isOverdue ? 30 : 125);
    doc.text(credit.due_date || '—', cols[3].x, y + 6);

    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(15, 25, 55);
    doc.text(`$${(credit.total_amount || 0).toLocaleString('es-CL')}`, cols[4].x, y + 6);
    doc.text(`$${(credit.amount_paid || 0).toLocaleString('es-CL')}`, cols[5].x, y + 6);

    if (isPaid) {
      doc.setTextColor(34, 140, 80);
    } else if (isOverdue) {
      doc.setTextColor(180, 30, 30);
    } else {
      doc.setTextColor(180, 120, 15);
    }
    doc.setFont('helvetica', 'bold');
    doc.text(`$${remaining.toLocaleString('es-CL')}`, cols[6].x, y + 6);

    y += rowH;
  });

  // ── TOTALS ROW ──
  y += 3;
  doc.setFillColor(8, 18, 40);
  doc.rect(ml, y, W, 10, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(200, 215, 255);
  doc.text('TOTALES', ml + 4, y + 7);
  doc.text(`$${credits.reduce((s,c) => s + (c.total_amount||0), 0).toLocaleString('es-CL')}`, cols[4].x, y + 7);
  doc.text(`$${credits.reduce((s,c) => s + (c.amount_paid||0), 0).toLocaleString('es-CL')}`, cols[5].x, y + 7);
  doc.setTextColor(130, 195, 255);
  doc.text(`$${totalDebt.toLocaleString('es-CL')}`, cols[6].x, y + 7);
  y += 15;

  // ── OVERDUE DETAIL ──
  if (overdue.length > 0) {
    doc.setFillColor(255, 235, 235); doc.setDrawColor(200, 50, 50); doc.setLineWidth(0.3);
    doc.rect(ml, y, W, 8, 'FD');
    doc.setFillColor(200, 40, 40); doc.rect(ml, y, 4, 8, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(160, 20, 20);
    doc.text(`DEUDA VENCIDA: $${totalOverdue.toLocaleString('es-CL')} en ${overdue.length} crédito(s)`, ml + 8, y + 5.5);
  }

  // ── FOOTER ──
  const footerY = ph - 18;
  doc.setFillColor(8, 18, 40); doc.rect(0, footerY, pw, 18, 'F');
  doc.setFillColor(30, 70, 140); doc.rect(0, footerY, pw, 1.5, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(200, 215, 245);
  doc.text((settings?.company_name || '').toUpperCase(), pw / 2, footerY + 7, { align: 'center' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(100, 135, 195);
  doc.text('Informe generado digitalmente por SOLUCIONES TECNOLOGICAS FML', pw / 2, footerY + 13, { align: 'center' });

  return { url: getPdfBlobUrl(doc), doc };
}