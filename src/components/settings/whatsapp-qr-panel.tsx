'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import {
  QrCode,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  RefreshCw,
  PowerOff,
  ShieldCheck,
  Smartphone,
  Sliders,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface WhatsAppQrPanelProps {
  canEditSettings: boolean;
}

export function WhatsAppQrPanel({ canEditSettings }: WhatsAppQrPanelProps) {
  const [loading, setLoading] = useState(true);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [status, setStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected');
  const [instanceName, setInstanceName] = useState<string>('');
  const [antibanMin, setAntibanMin] = useState<number>(5);
  const [antibanMax, setAntibanMax] = useState<number>(12);
  const [savingAntiban, setSavingAntiban] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchState = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    try {
      const res = await fetch('/api/whatsapp/evolution/instance', { method: 'GET' });
      const data = await res.json();

      if (res.ok) {
        if (data.connected || data.state === 'open') {
          setStatus('connected');
          setQrCode(null);
        } else if (data.qrcode) {
          setStatus('connecting');
          setQrCode(data.qrcode);
        } else {
          setStatus('disconnected');
          setQrCode(null);
        }

        if (data.instanceName) setInstanceName(data.instanceName);
        if (typeof data.antiban_delay_min === 'number') setAntibanMin(data.antiban_delay_min);
        if (typeof data.antiban_delay_max === 'number') setAntibanMax(data.antiban_delay_max);
      }
    } catch (err: any) {
      console.error('[WhatsAppQrPanel] Error loading QR state:', err);
    } finally {
      setLoading(false);
      if (isManualRefresh) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  // Polling while connecting
  useEffect(() => {
    if (status === 'connecting') {
      pollTimerRef.current = setInterval(() => {
        fetchState();
      }, 4000);
    } else if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [status, fetchState]);

  const handleDisconnect = async () => {
    if (!confirm('¿Estás seguro de desconectar esta sesión de WhatsApp?')) return;
    setDisconnecting(true);
    try {
      const res = await fetch('/api/whatsapp/evolution/instance', { method: 'DELETE' });
      if (res.ok) {
        toast.success('Sesión de WhatsApp desconectada');
        setStatus('disconnected');
        setQrCode(null);
      } else {
        toast.error('Error al desconectar la sesión');
      }
    } catch (err) {
      toast.error('Error de conexión');
    } finally {
      setDisconnecting(false);
    }
  };

  const handleSaveAntiban = async () => {
    setSavingAntiban(true);
    try {
      const res = await fetch('/api/whatsapp/evolution/instance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'evolution',
          antiban_delay_min: Number(antibanMin),
          antiban_delay_max: Number(antibanMax),
        }),
      });

      if (res.ok) {
        toast.success('Configuración anti-baneo guardada exitosamente');
      } else {
        toast.error('Error al guardar configuración');
      }
    } catch {
      toast.error('Error de red');
    } finally {
      setSavingAntiban(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Iniciando motor de WhatsApp QR...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Connection Card */}
      <Card className="border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg flex items-center gap-2">
                <QrCode className="size-5 text-primary" />
                Conexión por Código QR (Sin costos de Meta API)
              </CardTitle>
              <CardDescription>
                Conecta tu WhatsApp escaneando el código QR desde tu aplicación móvil como WhatsApp Web.
              </CardDescription>
            </div>
            <div>
              {status === 'connected' ? (
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full text-xs font-medium border border-emerald-500/20">
                  <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                  Conectado
                </div>
              ) : status === 'connecting' ? (
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-full text-xs font-medium border border-amber-500/20">
                  <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
                  Esperando Escaneo
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 rounded-full text-xs font-medium border border-zinc-500/20">
                  <span className="size-2 rounded-full bg-zinc-400" />
                  Desconectado
                </div>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {status === 'connected' ? (
            <div className="space-y-4">
              <Alert className="bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-100">
                <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400" />
                <AlertTitle className="font-semibold text-emerald-800 dark:text-emerald-200">
                  WhatsApp vinculado y listo para enviar y recibir
                </AlertTitle>
                <AlertDescription className="text-sm text-emerald-700/90 dark:text-emerald-300/90 mt-1">
                  Tu número está transmitiendo en tiempo real mediante el motor self-hosted Evolution API. Todos los mensajes entrantes y salientes se reflejan instantáneamente en el inbox compartido.
                </AlertDescription>
              </Alert>

              <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-lg bg-muted/40 border border-border">
                <div className="flex items-center gap-3">
                  <Smartphone className="size-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Instancia Activa</p>
                    <p className="text-xs text-muted-foreground font-mono">{instanceName || 'Instancia default'}</p>
                  </div>
                </div>

                {canEditSettings && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDisconnect}
                    disabled={disconnecting}
                    className="gap-2"
                  >
                    {disconnecting ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <PowerOff className="size-4" />
                    )}
                    Desconectar WhatsApp
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row items-center gap-8 py-2">
              {/* QR display box */}
              <div className="flex flex-col items-center justify-center p-4 bg-white rounded-xl border shadow-sm shrink-0">
                {qrCode ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={qrCode.startsWith('data:') ? qrCode : `data:image/png;base64,${qrCode}`}
                    alt="Código QR de WhatsApp"
                    className="size-60 object-contain"
                  />
                ) : (
                  <div className="size-60 flex flex-col items-center justify-center gap-3 bg-zinc-50 rounded-lg border border-dashed border-zinc-200 text-zinc-400">
                    <QrCode className="size-12 opacity-30" />
                    <span className="text-xs">Generando código QR...</span>
                  </div>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fetchState(true)}
                  disabled={refreshing}
                  className="mt-3 text-xs text-zinc-600 hover:text-zinc-900 gap-1.5"
                >
                  <RefreshCw className={`size-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                  Actualizar código QR
                </Button>
              </div>

              {/* Step by step guide */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-foreground">Cómo conectar tu teléfono:</h4>
                <ol className="space-y-3 text-sm text-muted-foreground list-decimal list-inside">
                  <li>Abre la aplicación de <strong>WhatsApp</strong> en tu teléfono.</li>
                  <li>Toca <strong>Menú</strong> (Android) o <strong>Configuración</strong> (iPhone).</li>
                  <li>Selecciona <strong>Dispositivos vinculados</strong>.</li>
                  <li>Toca en <strong>Vincular un dispositivo</strong>.</li>
                  <li>Apunta la cámara de tu teléfono a la pantalla para escanear el código QR.</li>
                </ol>

                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs text-blue-600 dark:text-blue-400">
                  💡 <strong>Tip para SaaS:</strong> Con este método tus clientes no pagan a Meta por conversación ni necesitan verificar documentos ni tarjetas de crédito.
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Anti-ban Delay Settings */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ShieldCheck className="size-5 text-emerald-500" />
            Protección Anti-Baneo Inteligente (Campañas y Difusiones)
          </CardTitle>
          <CardDescription>
            Configura pausas aleatorias entre mensajes para emular el comportamiento humano durante envíos masivos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="antiban-min">Pausa mínima (segundos)</Label>
              <Input
                id="antiban-min"
                type="number"
                min="2"
                max="60"
                value={antibanMin}
                onChange={(e) => setAntibanMin(Number(e.target.value))}
                disabled={!canEditSettings}
              />
              <p className="text-xs text-muted-foreground">Tiempo mínimo de espera antes de enviar al siguiente contacto.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="antiban-max">Pausa máxima (segundos)</Label>
              <Input
                id="antiban-max"
                type="number"
                min="3"
                max="120"
                value={antibanMax}
                onChange={(e) => setAntibanMax(Number(e.target.value))}
                disabled={!canEditSettings}
              />
              <p className="text-xs text-muted-foreground">Tiempo máximo de espera aleatorio entre envíos.</p>
            </div>
          </div>

          <Alert className="bg-muted/50 border-border">
            <Sliders className="size-4 text-primary" />
            <AlertTitle className="text-xs font-semibold">Recomendación de seguridad:</AlertTitle>
            <AlertDescription className="text-xs text-muted-foreground mt-0.5">
              Un rango entre <strong>5 y 12 segundos</strong> garantiza un flujo continuo manteniendo la cuenta protegida de los filtros de spam automáticos de WhatsApp.
            </AlertDescription>
          </Alert>

          {canEditSettings && (
            <div className="flex justify-end pt-2">
              <Button
                onClick={handleSaveAntiban}
                disabled={savingAntiban}
                className="gap-2"
              >
                {savingAntiban ? <Loader2 className="size-4 animate-spin" /> : null}
                Guardar Configuración Anti-Baneo
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
