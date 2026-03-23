import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { UserPlus, Shield, User, Mail, FileText, Loader2 } from 'lucide-react';
import PdfPreviewModal from '../components/PdfPreviewModal';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import PageHeader from '../components/PageHeader';
import { toast } from "sonner";
import { useAuth } from '@/lib/AuthContext';

export default function Users() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'user' });
  const [inviting, setInviting] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [pdfPreview, setPdfPreview] = useState({ open: false, url: null });
  const [selectedUserEmail, setSelectedUserEmail] = useState('');

  const isAdmin = currentUser?.role === 'admin';

  async function load() {
    try {
      const u = await base44.entities.User.list();
      setUsers(u);
    } catch (e) {
      if (currentUser) setUsers([currentUser]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const handleInvite = async () => {
    if (!inviteForm.email) { toast.error('Ingresa un email'); return; }
    setInviting(true);
    try {
      await base44.users.inviteUser(inviteForm.email, inviteForm.role);
      toast.success(`Invitación enviada a ${inviteForm.email}`);
      setInviteForm({ email: '', role: 'user' });
      setInviteOpen(false);
      load();
    } catch (e) {
      toast.error('Error al enviar invitación: ' + e.message);
    } finally {
      setInviting(false);
    }
  };

  const handleGenerateReport = async () => {
    setGeneratingReport(true);
    try {
      const { jsPDF } = await import('jspdf');
      const [allUsers, sales, repairs, settingsList] = await Promise.all([
        base44.entities.User.list().catch(() => []),
        base44.entities.SaleOrder.list(),
        base44.entities.RepairOrder.list(),
        base44.entities.CompanySettings.list(),
      ]);
      const company = settingsList[0] || {};

      const hexToRgb = (hex) => [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)];
      const ACCENT = company.accent_color ? hexToRgb(company.accent_color) : [214,90,30];
      const DARK=[30,30,30], GRAY=[110,110,110], WHITE=[255,255,255], LGRAY=[245,245,245];

      const doc = new jsPDF({ unit:'mm', format:'a4' });
      const pw = doc.internal.pageSize.getWidth();
      const ph = doc.internal.pageSize.getHeight();
      const ml=14, mr=pw-14;

      // Build transactions list
      const transactions = [
        ...sales.map(s => ({
          type: 'Venta',
          date: s.date||'-',
          user: s.created_by||'-',
          attended_by: s.attended_by||'',
          items: (s.items||[]).map(i=>({ product_name: i.product_name, quantity: i.quantity, unit_price: i.unit_price })),
          laborCost: 0,
          total: s.total||0,
          orderNum: s.order_number||s.id?.substring(0,6)||'-'
        })),
        ...repairs.map(r => ({
          type: 'Reparación',
          date: r.date||'-',
          user: r.created_by||'-',
          attended_by: r.attended_by||'',
          items: (r.parts_used||[]).map(p=>({ product_name: p.product_name, quantity: p.quantity, unit_price: p.unit_price })),
          laborCost: r.labor_cost||0,
          total: r.total||0,
          orderNum: r.order_number||r.id?.substring(0,6)||'-'
        })),
      ];

      // Group by user, then filter by selected
      const byUser = {};
      const userEmail = currentUser?.email;
      transactions
        .filter(t => isAdmin || t.user === userEmail)
        .forEach(t => {
          if (!byUser[t.user]) byUser[t.user] = [];
          byUser[t.user].push(t);
        });

      // Filter to selected user if provided
      const filteredByUser = selectedUserEmail ? { [selectedUserEmail]: byUser[selectedUserEmail] || [] } : byUser;

      // ── PAGE HEADER ──────────────────────────────────────
      const drawPageHeader = async (isFirst) => {
        doc.setFillColor(...ACCENT); doc.rect(0,0,pw,3,'F');

        if (isFirst) {
          let headerBottom = 14;
          if (company.logo_url) {
            try {
              const img = await new Promise((res,rej)=>{ const i=new Image(); i.crossOrigin='anonymous'; i.onload=()=>res(i); i.onerror=rej; i.src=company.logo_url; });
              const c=document.createElement('canvas'); c.width=img.width; c.height=img.height;
              c.getContext('2d').drawImage(img,0,0);
              doc.addImage(c.toDataURL('image/png'),'PNG',ml,6,24,24);
              headerBottom=32;
            } catch {}
          }
          const nameX = company.logo_url ? ml+27 : ml;
          doc.setFont('helvetica','bold'); doc.setFontSize(15); doc.setTextColor(...DARK);
          doc.text((company.company_name||'EMPRESA').toUpperCase(), nameX, 16);
          doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setTextColor(...GRAY);
          if (company.address) doc.text(company.address, nameX, 21);
          if (company.phone)   doc.text(company.phone,   nameX, 26);
          if (company.email)   doc.text(company.email,   nameX, 31);

          // Title box
          doc.setFillColor(...LGRAY); doc.roundedRect(pw-70,5,58,28,2,2,'F');
          doc.setFont('helvetica','bold'); doc.setFontSize(11); doc.setTextColor(...DARK);
          doc.text('REPORTE DE', pw-41, 14, {align:'center'});
          doc.text('TRANSACCIONES', pw-41, 20, {align:'center'});
          doc.setFont('helvetica','normal'); doc.setFontSize(7.5); doc.setTextColor(...GRAY);
          doc.text(`Generado: ${new Date().toLocaleDateString('es-CL')}`, pw-41, 27, {align:'center'});

          return Math.max(headerBottom, 38);
        }
        return 14;
      };

      let y = await drawPageHeader(true);
      doc.setDrawColor(...ACCENT); doc.setLineWidth(0.8); doc.line(ml,y,mr,y); y+=7;

      let grandTotal = 0;

      const userEntries = Object.entries(filteredByUser);
      for (let ui=0; ui < userEntries.length; ui++) {
        const [userEmail, txs] = userEntries[ui];
        const u = allUsers.find(u => u.email === userEmail);
        const userName = u?.full_name || userEmail;
        const userTotal = txs.reduce((s,t)=>s+t.total,0);
        grandTotal += userTotal;

        if (y > ph - 50) {
          doc.addPage();
          y = await drawPageHeader(false);
          doc.setDrawColor(...ACCENT); doc.setLineWidth(0.4); doc.line(ml,y,mr,y); y+=5;
        }

        // User header band
        doc.setFillColor(...ACCENT); doc.rect(ml,y,mr-ml,9,'F');
        doc.setFont('helvetica','bold'); doc.setFontSize(9.5); doc.setTextColor(...WHITE);
        doc.text(userName.toUpperCase(), ml+3, y+6);
        doc.setFont('helvetica','normal'); doc.setFontSize(8); 
        doc.text(userEmail, mr-3, y+6, {align:'right'});
        y+=10;

        // Column headers
        doc.setFillColor(220,220,220); doc.rect(ml,y,mr-ml,6,'F');
        doc.setFont('helvetica','bold'); doc.setFontSize(7.5); doc.setTextColor(...DARK);
        doc.text('N° / Tipo',   ml+2,   y+4.5);
        doc.text('Fecha',       ml+36,  y+4.5);
        doc.text('Producto / Detalle', ml+58, y+4.5);
        doc.text('Cant',        ml+123, y+4.5);
        doc.text('P.Unit',      ml+134, y+4.5);
        doc.text('Total',       mr-2,   y+4.5, {align:'right'});
        y+=7;

        txs.sort((a,b)=>a.date.localeCompare(b.date)).forEach((tx, ti) => {
          const displayItems = tx.items.length > 0 ? tx.items : [];
          if (tx.laborCost > 0) {
            displayItems.push({ product_name:'Mano de obra', quantity:1, unit_price: tx.laborCost });
          }
          if (displayItems.length === 0) {
            displayItems.push({ product_name:'-', quantity:1, unit_price: tx.total });
          }
          const rowHeight = Math.max(8, displayItems.length * 5 + 4);

          if (y + rowHeight > ph - 30) {
            doc.addPage();
            y = 14;
            doc.setFillColor(220,220,220); doc.rect(ml,y,mr-ml,6,'F');
            doc.setFont('helvetica','bold'); doc.setFontSize(7.5); doc.setTextColor(...DARK);
            doc.text('N° / Tipo', ml+2, y+4.5); doc.text('Fecha', ml+36, y+4.5);
            doc.text('Producto / Detalle', ml+58, y+4.5); doc.text('Cant', ml+123, y+4.5);
            doc.text('P.Unit', ml+134, y+4.5); doc.text('Total', mr-2, y+4.5, {align:'right'});
            y+=7;
          }

          if (ti%2===0) { doc.setFillColor(...LGRAY); doc.rect(ml,y,mr-ml,rowHeight,'F'); }

          doc.setFont('helvetica','bold'); doc.setFontSize(7.5); doc.setTextColor(...DARK);
          doc.text(`#${tx.orderNum}`, ml+2, y+5);
          doc.setFont('helvetica','normal'); doc.setFontSize(7); doc.setTextColor(...GRAY);
          doc.text(tx.type, ml+2, y+9);
          if (tx.attended_by) doc.text(`Atendido: ${tx.attended_by}`, ml+2, y+13);
          doc.setFont('helvetica','normal'); doc.setFontSize(7.5); doc.setTextColor(...DARK);
          doc.text(tx.date, ml+36, y+5);

          displayItems.forEach((item, ii) => {
            const iy = y + 5 + ii*4.8;
            doc.setFont('helvetica','normal'); doc.setFontSize(7.5); doc.setTextColor(...DARK);
            const pname = doc.splitTextToSize(item.product_name||'-', 62);
            doc.text(pname[0], ml+58, iy);
            doc.text(String(item.quantity||0), ml+123, iy);
            doc.text(`$${(item.unit_price||0).toLocaleString('es-CL')}`, ml+134, iy);
          });

          doc.setFont('helvetica','bold'); doc.setFontSize(8.5); doc.setTextColor(...ACCENT);
          doc.text(`$${tx.total.toLocaleString('es-CL')}`, mr-2, y+5, {align:'right'});

          y += rowHeight;
        });

        // Subtotal row
        doc.setDrawColor(...ACCENT); doc.setLineWidth(0.4); doc.line(ml,y,mr,y);
        doc.setFillColor(235,235,235); doc.rect(ml,y,mr-ml,8,'F');
        doc.setFont('helvetica','bold'); doc.setFontSize(8.5); doc.setTextColor(...DARK);
        doc.text(`Subtotal — ${userName}:`, ml+3, y+5.5);
        doc.setTextColor(...ACCENT);
        doc.text(`$${userTotal.toLocaleString('es-CL')}`, mr-3, y+5.5, {align:'right'});
        y+=12;
      }

      // Grand total
      if (y > ph - 24) { doc.addPage(); y=14; }
      y+=2;
      doc.setFillColor(...ACCENT); doc.rect(ml,y,mr-ml,11,'F');
      doc.setFont('helvetica','bold'); doc.setFontSize(12); doc.setTextColor(...WHITE);
      doc.text('TOTAL GENERAL:', ml+4, y+8);
      doc.text(`$${grandTotal.toLocaleString('es-CL')}`, mr-4, y+8, {align:'right'});

      // Footer bar
      doc.setFillColor(...ACCENT); doc.rect(0, ph-4, pw, 4, 'F');
      doc.setFont('helvetica','normal'); doc.setFontSize(7); doc.setTextColor(...GRAY);
      doc.text(company.company_name||'', pw/2, ph-7, {align:'center'});

      const { getPdfBlobUrl } = await import('../lib/pdfUtils');
      setPdfPreview({ open: true, url: getPdfBlobUrl(doc) });
    } finally {
      setGeneratingReport(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <>
    <div className="space-y-4">
      <PageHeader title="Usuarios" description="Gestión de acceso a la aplicación">
        {(isAdmin || true) && (
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Select value={selectedUserEmail} onValueChange={setSelectedUserEmail}>
                <SelectTrigger className="w-48 bg-secondary border-border"><SelectValue placeholder="Todos los usuarios" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Todos los usuarios</SelectItem>
                  {users.map(u => <SelectItem key={u.id} value={u.email}>{u.full_name} ({u.email})</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <Button onClick={handleGenerateReport} disabled={generatingReport} variant="outline" className="gap-2">
              {generatingReport ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              {generatingReport ? 'Generando...' : 'Reporte PDF'}
            </Button>
            <Button onClick={() => setInviteOpen(true)} className="gap-2">
              <UserPlus className="h-4 w-4" /> Invitar Usuario
            </Button>
          </div>
        )}
      </PageHeader>

      {!isAdmin && (
        <div className="bg-warning/10 border border-warning/30 rounded-xl p-4 text-sm text-warning">
          Solo el administrador puede invitar nuevos usuarios.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.map(u => (
          <div key={u.id} className="bg-card border border-border rounded-xl p-5 flex items-start gap-4">
            <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-base flex-shrink-0">
              {u.full_name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-foreground truncate">{u.full_name || '—'}</p>
                {u.id === currentUser?.id && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">Tú</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                <Mail className="h-3 w-3" /> {u.email}
              </p>
              <div className="flex items-center gap-1 mt-2">
                {u.role === 'admin' ? (
                  <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-accent/10 text-accent font-semibold">
                    <Shield className="h-3 w-3" /> Administrador
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground font-semibold">
                    <User className="h-3 w-3" /> Usuario
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {isAdmin && (
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogContent className="bg-card border-border max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-primary" /> Invitar Usuario
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <p className="text-xs text-muted-foreground">
                Se enviará un email con las instrucciones de acceso al correo indicado.
              </p>
              <div>
                <Label>Correo electrónico *</Label>
                <Input
                  type="email"
                  value={inviteForm.email}
                  onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))}
                  className="bg-secondary border-border"
                  placeholder="ejemplo@correo.com"
                />
              </div>
              <div>
                <Label>Rol</Label>
                <Select value={inviteForm.role} onValueChange={v => setInviteForm(f => ({ ...f, role: v }))}>
                  <SelectTrigger className="bg-secondary border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Usuario (acceso normal)</SelectItem>
                    <SelectItem value="admin">Administrador (acceso completo)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancelar</Button>
                <Button onClick={handleInvite} disabled={inviting} className="gap-2">
                  <UserPlus className="h-4 w-4" />
                  {inviting ? 'Enviando...' : 'Enviar Invitación'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>

    <PdfPreviewModal
      open={pdfPreview.open}
      onOpenChange={open => setPdfPreview(p => ({ ...p, open }))}
      blobUrl={pdfPreview.url}
      filename={`reporte-transacciones-${new Date().toISOString().split('T')[0]}.pdf`}
    />
    </>
  );
}