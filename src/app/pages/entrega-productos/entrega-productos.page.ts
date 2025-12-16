// ./src/app/pages/entrega-productos/entrega-productos.page.ts
import { AfterViewInit, Component, ElementRef, HostListener, OnInit, ViewChild, inject } from '@angular/core';
import { ToastController } from '@ionic/angular';
import { EvidenciasService, EvidenciaTipo } from 'src/app/services/evidencias.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-entrega-productos',
  templateUrl: './entrega-productos.page.html',
  styleUrls: ['./entrega-productos.page.scss'],
  standalone: false,
})
export class EntregaProductosPage implements OnInit, AfterViewInit {
  private readonly toastController = inject(ToastController);
  private readonly evidenciasService = inject(EvidenciasService);
  private readonly submittedFingerprintsStorageKey = 'rids.entregaProductos.submittedFingerprints.v1';
  private readonly maxUploadImageBytes = 220_000;
  private readonly maxUploadImageDimension = 1280;

  @ViewChild('fileInput', { static: false })
  fileInput?: ElementRef<HTMLInputElement>;

  @ViewChild('signatureCanvas', { static: false })
  signatureCanvas?: ElementRef<HTMLCanvasElement>;

  selectedImage: { file: File; dataUrl: string } | null = null;
  hasSignature = false;
  signatureDataUrl: string | null = null;
  mostrarModalEstado = false;
  estadoEntregaMensaje = '';

  receptorNombre = '';
  empresaNombre = '';
  fechaEntrega: Date = new Date();
  fechaEntregaTexto = '';
  isRegistering = false;
  private readonly submittedFingerprints = new Set<string>();

  private isDrawingSignature = false;
  private lastSignaturePoint: { x: number; y: number } | null = null;
  private tecnicoNombre: string | null = null;

  get isDuplicateSubmission(): boolean {
    const fingerprint = this.computeCurrentFingerprint();
    return Boolean(fingerprint && this.submittedFingerprints.has(fingerprint));
  }

  get canRegistrarEntrega(): boolean {
    return Boolean(
      this.selectedImage &&
        this.hasSignature &&
        this.receptorNombre.trim() &&
        this.empresaNombre.trim() &&
        !this.isDuplicateSubmission
    );
  }

  ngOnInit() {
    this.tecnicoNombre = this.getTecnicoNombre();
    this.loadSubmittedFingerprints();
    this.setFechaEntrega(new Date());
  }

  ngAfterViewInit() {
    requestAnimationFrame(() => {
      this.resizeSignatureCanvas();
    });
  }

  @HostListener('window:resize')
  onResize() {
    this.resizeSignatureCanvas();
  }

  private getTecnicoNombre(): string | null {
    try {
      const raw = localStorage.getItem('tecnico');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      const nombre = parsed?.nombre;
      return typeof nombre === 'string' && nombre.trim() ? nombre.trim() : null;
    } catch {
      return null;
    }
  }

  openFilePicker() {
    this.fileInput?.nativeElement.click();
  }

  clearImage() {
    this.selectedImage = null;
    if (this.fileInput) this.fileInput.nativeElement.value = '';
  }

  async onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) return;

    if (!file.type?.startsWith('image/')) {
      await this.showToast('Selecciona un archivo de imagen (JPG/PNG).');
      if (input) input.value = '';
      return;
    }

    const maxBytes = 5 * 1024 * 1024; // 5MB
    if (file.size > maxBytes) {
      await this.showToast('La imagen es muy pesada (máx 5MB).');
      if (input) input.value = '';
      return;
    }

    const originalDataUrl = await this.fileToDataUrl(file);
    const compressedDataUrl = await this.compressPhotoDataUrl(originalDataUrl, {
      maxBytes: this.maxUploadImageBytes,
      maxDimension: this.maxUploadImageDimension,
      quality: 0.75,
    });
    this.selectedImage = { file, dataUrl: compressedDataUrl };
  }

  clearSignature() {
    this.hasSignature = false;
    this.signatureDataUrl = null;
    this.clearSignatureCanvas();
  }

  onSignaturePointerDown(event: PointerEvent) {
    const canvas = this.signatureCanvas?.nativeElement;
    if (!canvas) return;
    event.preventDefault();

    const ctx = this.getSignatureContext(canvas);
    if (!ctx) return;

    canvas.setPointerCapture(event.pointerId);
    this.isDrawingSignature = true;
    this.lastSignaturePoint = this.getCanvasPoint(canvas, event);
    this.hasSignature = true;
    this.signatureDataUrl = null;

    ctx.beginPath();
    ctx.moveTo(this.lastSignaturePoint.x, this.lastSignaturePoint.y);
    ctx.lineTo(this.lastSignaturePoint.x + 0.01, this.lastSignaturePoint.y + 0.01);
    ctx.stroke();
  }

  onSignaturePointerMove(event: PointerEvent) {
    if (!this.isDrawingSignature) return;
    const canvas = this.signatureCanvas?.nativeElement;
    if (!canvas) return;
    event.preventDefault();

    const ctx = this.getSignatureContext(canvas);
    if (!ctx || !this.lastSignaturePoint) return;

    const point = this.getCanvasPoint(canvas, event);
    ctx.beginPath();
    ctx.moveTo(this.lastSignaturePoint.x, this.lastSignaturePoint.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();

    this.lastSignaturePoint = point;
  }

  onSignaturePointerUp(event: PointerEvent) {
    if (!this.isDrawingSignature) return;
    const canvas = this.signatureCanvas?.nativeElement;
    if (!canvas) return;
    event.preventDefault();

    this.isDrawingSignature = false;
    this.lastSignaturePoint = null;
    try {
      canvas.releasePointerCapture(event.pointerId);
    } catch {
      // ignore
    }

    if (this.hasSignature) {
      this.signatureDataUrl = canvas.toDataURL('image/png');
    }
  }

  async registrarEntrega() {
    if (this.isRegistering) return;
    this.isRegistering = true;
    try {
      if (!this.selectedImage) {
        await this.showToast('Primero sube una imagen.');
        return;
      }
      if (!this.hasSignature) {
        await this.showToast('Falta la firma.');
        return;
      }
      if (!this.receptorNombre.trim()) {
        await this.showToast('Ingresa el nombre de quien recibe.');
        return;
      }
      if (!this.empresaNombre.trim()) {
        await this.showToast('Ingresa la empresa.');
        return;
      }
      this.empresaNombre = this.empresaNombre.trim();

      const signatureDataUrl = this.signatureCanvas?.nativeElement?.toDataURL('image/png') || null;
      if (!signatureDataUrl) {
        await this.showToast('No se pudo capturar la firma.');
        return;
      }

      this.signatureDataUrl = signatureDataUrl;
      const fingerprint = this.computeCurrentFingerprint(signatureDataUrl);
      if (fingerprint && this.submittedFingerprints.has(fingerprint)) {
        await this.showToast('Esta entrega ya fue registrada.');
        return;
      }

      this.setFechaEntrega(new Date());

      const imagenEntregaDataUrl = await this.compressPhotoDataUrl(this.selectedImage.dataUrl, {
        maxBytes: this.maxUploadImageBytes,
        maxDimension: this.maxUploadImageDimension,
        quality: 0.75,
      });

      const entregaResp = await firstValueFrom(
        this.evidenciasService.crearEntrega({
          empresaNombre: this.empresaNombre,
          receptorNombre: this.receptorNombre.trim(),
          fecha: this.fechaEntrega.toISOString(),
        })
      );

      const entregaId =
        entregaResp?.entrega?.id_entrega ?? entregaResp?.entrega?.id ?? entregaResp?.id_entrega ?? null;

      if (!entregaId) {
        throw new Error('No se pudo crear la entrega en el backend.');
      }

      await this.subirEvidencia(entregaId, 'foto', imagenEntregaDataUrl);
      await this.subirEvidencia(entregaId, 'firma', signatureDataUrl);

      console.log('Entrega guardada en backend:', entregaResp);
      if (fingerprint) {
        this.submittedFingerprints.add(fingerprint);
        this.persistSubmittedFingerprints();
      }
      this.estadoEntregaMensaje = 'La entrega se genero correctamente.';
      this.mostrarModalEstado = true;
    } catch (err) {
      console.error('Error registrando entrega:', err);
      const message =
        (err as any)?.error?.error ||
        (err as any)?.error?.message ||
        (err as any)?.message ||
        'No se pudo registrar la entrega.';
      await this.showToast(message);
    } finally {
      this.isRegistering = false;
    }
  }

  confirmarModalEntrega() {
    this.mostrarModalEstado = false;
    this.resetFormulario();
  }

  private resetFormulario() {
    this.receptorNombre = '';
    this.empresaNombre = '';
    this.selectedImage = null;
    this.hasSignature = false;
    this.signatureDataUrl = null;
    if (this.fileInput) this.fileInput.nativeElement.value = '';
    this.clearSignatureCanvas();
    this.setFechaEntrega(new Date());
    requestAnimationFrame(() => this.resizeSignatureCanvas());
  }

  private clearSignatureCanvas() {
    const canvas = this.signatureCanvas?.nativeElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
  }

  private resizeSignatureCanvas() {
    const canvas = this.signatureCanvas?.nativeElement;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.floor(rect.width * ratio);
    canvas.height = Math.floor(rect.height * ratio);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1976d2';

    ctx.clearRect(0, 0, rect.width, rect.height);

    if (this.signatureDataUrl) {
      void this.redrawSignatureFromDataUrl(this.signatureDataUrl);
    }
  }

  private async redrawSignatureFromDataUrl(dataUrl: string) {
    const canvas = this.signatureCanvas?.nativeElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    try {
      const img = await this.loadImage(dataUrl);
      ctx.clearRect(0, 0, rect.width, rect.height);
      ctx.drawImage(img, 0, 0, rect.width, rect.height);
    } catch {
      // ignore
    }
  }

  private getSignatureContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D | null {
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    if (!canvas.width || !canvas.height) this.resizeSignatureCanvas();
    return ctx;
  }

  private getCanvasPoint(canvas: HTMLCanvasElement, event: PointerEvent) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  private async mergePhotoAndSignature(photoDataUrl: string, signatureDataUrl: string): Promise<string> {
    const [photo, signature] = await Promise.all([this.loadImage(photoDataUrl), this.loadImage(signatureDataUrl)]);

    const canvas = document.createElement('canvas');
    canvas.width = photo.naturalWidth || photo.width;
    canvas.height = photo.naturalHeight || photo.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return photoDataUrl;

    ctx.drawImage(photo, 0, 0, canvas.width, canvas.height);

    const padding = Math.round(canvas.width * 0.03);
    const fontSize = Math.max(18, Math.round(canvas.width * 0.03));
    const lineHeight = fontSize + 6;

    const now = this.fechaEntrega ? this.fechaEntrega.toLocaleString('es-CL') : new Date().toLocaleString('es-CL');
    const lines: string[] = [];
    if (this.tecnicoNombre) lines.push(`Entregado por: ${this.tecnicoNombre}`);
    if (this.receptorNombre.trim()) lines.push(`Recibe: ${this.receptorNombre.trim()}`);

    const empresa = this.resolveEmpresaNombre();
    if (String(empresa).trim()) lines.push(`Empresa: ${String(empresa).trim()}`);
    lines.push(`Fecha: ${now}`);

    const minHeightForText = padding + lines.length * lineHeight + padding;
    const boxHeight = Math.min(
      canvas.height,
      Math.max(140, Math.round(canvas.height * 0.22), minHeightForText)
    );
    const overlayY = Math.max(0, canvas.height - boxHeight);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(0, overlayY, canvas.width, boxHeight);

    const sigMaxWidth = Math.round(canvas.width * 0.45);
    const sigMaxHeight = Math.round(boxHeight * 0.55);
    const sigScale = Math.min(
      sigMaxWidth / (signature.naturalWidth || signature.width || 1),
      sigMaxHeight / (signature.naturalHeight || signature.height || 1)
    );
    const sigW = Math.round((signature.naturalWidth || signature.width) * sigScale);
    const sigH = Math.round((signature.naturalHeight || signature.height) * sigScale);
    const sigX = canvas.width - padding - sigW;
    const sigY = canvas.height - padding - sigH;
    ctx.drawImage(signature, sigX, sigY, sigW, sigH);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.font = `${fontSize}px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif`;
    ctx.textBaseline = 'top';

    const maxTextWidth = Math.max(0, sigX - padding * 2);
    lines.forEach((line, idx) => {
      const y = overlayY + padding + idx * lineHeight;
      ctx.fillText(this.fitText(ctx, line, maxTextWidth), padding, y);
    });

    return canvas.toDataURL('image/jpeg', 0.92);
  }

  private fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
    if (!maxWidth || ctx.measureText(text).width <= maxWidth) return text;
    const ellipsis = '…';
    let t = text;
    while (t.length > 0 && ctx.measureText(t + ellipsis).width > maxWidth) {
      t = t.slice(0, -1);
    }
    return t.length ? t + ellipsis : ellipsis;
  }

  private resolveEmpresaNombre(): string {
    return this.empresaNombre.trim();
  }

  private loadImage(dataUrl: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('No se pudo cargar la imagen'));
      img.src = dataUrl;
    });
  }

  private estimateDataUrlBytes(dataUrl: string): number {
    const commaIndex = dataUrl.indexOf(',');
    if (commaIndex === -1) return dataUrl.length;
    const base64 = dataUrl.slice(commaIndex + 1);
    const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
    return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
  }

  private async compressPhotoDataUrl(
    dataUrl: string,
    opts: { maxBytes: number; maxDimension: number; quality: number }
  ): Promise<string> {
    try {
      if (this.estimateDataUrlBytes(dataUrl) <= opts.maxBytes) return dataUrl;

      const img = await this.loadImage(dataUrl);
      const naturalW = img.naturalWidth || img.width;
      const naturalH = img.naturalHeight || img.height;
      if (!naturalW || !naturalH) return dataUrl;

      let scale = Math.min(1, opts.maxDimension / Math.max(naturalW, naturalH));
      let targetW = Math.max(1, Math.round(naturalW * scale));
      let targetH = Math.max(1, Math.round(naturalH * scale));

      const canvas = document.createElement('canvas');
      let ctx = canvas.getContext('2d');
      if (!ctx) return dataUrl;

      let quality = opts.quality;
      const minQuality = 0.45;
      let attempt = 0;
      let output = dataUrl;

      while (attempt < 10) {
        attempt += 1;

        canvas.width = targetW;
        canvas.height = targetH;
        ctx = canvas.getContext('2d');
        if (!ctx) return dataUrl;
        ctx.drawImage(img, 0, 0, targetW, targetH);

        output = canvas.toDataURL('image/jpeg', quality);
        const bytes = this.estimateDataUrlBytes(output);
        if (bytes <= opts.maxBytes) return output;

        if (quality > minQuality + 0.05) {
          quality = Math.max(minQuality, quality - 0.08);
          continue;
        }

        targetW = Math.max(1, Math.round(targetW * 0.85));
        targetH = Math.max(1, Math.round(targetH * 0.85));
        quality = opts.quality;
      }

      return output;
    } catch {
      return dataUrl;
    }
  }

  private async subirEvidencia(entregaId: number, tipo: EvidenciaTipo, dataUrl: string) {
    // Fotos: flujo Cloudinary. Firmas: se envía directo al backend como vector.
    const info = this.parseDataUrl(dataUrl, tipo === 'foto' ? 'jpeg' : 'png');

    const signature = await firstValueFrom(
      this.evidenciasService.solicitarFirmaSubida(entregaId, {
        tipo,
        formato: info.formato,
        bytes: info.bytes,
      })
    );

    // Si es firma y el backend indica que no se sube (o no da cloudName), enviamos vector directamente.
    if (tipo === 'firma' && (signature.requiresUpload === false || !signature.cloudName)) {
      await firstValueFrom(
        this.evidenciasService.confirmarEvidencia(entregaId, {
          tipo: 'firma',
          vector: dataUrl, // guardamos el dataURL como vector (string)
        })
      );
      return;
    }

    // Para fotos, validamos y subimos a Cloudinary
    if (!signature.cloudName) {
      throw new Error('cloudName no recibido para la foto.');
    }

    const allowed = (signature.allowedFormats || []).map((f) => this.normalizeFormat(f));
    if (allowed.length && !allowed.includes(info.formato)) {
      throw new Error('El formato de la evidencia no es admitido por el servidor.');
    }

    if (signature.maxBytes && info.bytes > signature.maxBytes) {
      throw new Error('La evidencia supera el tamano permitido para la subida.');
    }

    const uploadResp = await this.evidenciasService.uploadToCloudinary(
      signature,
      info.blob,
      `${tipo}-${entregaId}.${this.formatExtension(info.formato)}`
    );

    const url = uploadResp?.secure_url || uploadResp?.url;
    const publicId = uploadResp?.public_id || uploadResp?.publicId || uploadResp?.public_id;
    const bytes = Number(uploadResp?.bytes) || info.bytes;

    if (!url || !publicId) {
      throw new Error('No se pudo confirmar la evidencia (respuesta incompleta de subida).');
    }

    await firstValueFrom(
      this.evidenciasService.confirmarEvidencia(entregaId, {
        tipo,
        formato: info.formato,
        bytes,
        url,
        publicId,
      })
    );
  }

  private parseDataUrl(dataUrl: string, fallbackExt: string) {
    const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
    if (!match) {
      throw new Error('No se pudo leer la imagen seleccionada.');
    }
    const mime = match[1] || `image/${fallbackExt}`;
    const base64 = match[2];
    const binary = atob(base64);
    const len = binary.length;
    const arr = new Uint8Array(len);
    for (let i = 0; i < len; i += 1) {
      arr[i] = binary.charCodeAt(i);
    }
    const blob = new Blob([arr], { type: mime });
    const formatoRaw = (mime.split('/').pop() || fallbackExt).toLowerCase();
    const formato = this.normalizeFormat(formatoRaw) || fallbackExt.toLowerCase();
    return { blob, formato, bytes: blob.size || len };
  }

  private normalizeFormat(format: string) {
    const val = (format || '').toLowerCase();
    if (val === 'jpg') return 'jpeg';
    return val;
  }

  private formatExtension(format: string) {
    return format === 'jpeg' ? 'jpg' : format;
  }

  private fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  private computeCurrentFingerprint(signatureDataUrl: string | null = this.signatureDataUrl): string | null {
    if (!this.selectedImage) return null;
    if (!this.receptorNombre.trim()) return null;
    if (!this.empresaNombre.trim()) return null;
    if (!signatureDataUrl) return null;

    const file = this.selectedImage.file;
    const base = JSON.stringify({
      receptor: this.receptorNombre.trim().toLowerCase(),
      empresa: this.empresaNombre.trim().toLowerCase(),
      file: {
        name: file.name,
        size: file.size,
        lastModified: file.lastModified,
        type: file.type,
      },
      signatureHash: this.hashStringFNV1a(signatureDataUrl),
    });

    return this.hashStringFNV1a(base);
  }

  private hashStringFNV1a(input: string): string {
    let hash = 0x811c9dc5;
    for (let i = 0; i < input.length; i++) {
      hash ^= input.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
  }

  private loadSubmittedFingerprints() {
    try {
      const raw = localStorage.getItem(this.submittedFingerprintsStorageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      parsed.forEach((value: unknown) => {
        if (typeof value === 'string' && value.trim()) {
          this.submittedFingerprints.add(value.trim());
        }
      });
    } catch {
      // ignore
    }
  }

  private persistSubmittedFingerprints() {
    try {
      const max = 50;
      const all = Array.from(this.submittedFingerprints);
      const trimmed = all.slice(Math.max(0, all.length - max));
      if (trimmed.length !== all.length) {
        this.submittedFingerprints.clear();
        trimmed.forEach((f) => this.submittedFingerprints.add(f));
      }
      localStorage.setItem(this.submittedFingerprintsStorageKey, JSON.stringify(trimmed));
    } catch {
      // ignore
    }
  }

  private async showToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2200,
      position: 'bottom',
    });
    await toast.present();
  }

  private setFechaEntrega(date: Date) {
    this.fechaEntrega = date;
    this.fechaEntregaTexto = date.toLocaleString('es-CL');
  }
}
