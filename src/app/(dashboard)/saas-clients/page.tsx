'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  Users,
  DollarSign,
  MessageSquare,
  Mic,
  FileSearch,
  Plus,
  Search,
  ShieldCheck,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  MoreVertical,
  RefreshCw,
  Zap,
  ArrowUpRight,
  Clock,
  KeyRound,
  Eye,
  EyeOff,
  Sliders,
  Check,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';

interface ClientAccount {
  id: string;
  name: string;
  created_at: string;
  plan_tier: 'basic' | 'standard' | 'pro';
  is_active: boolean;
  payment_status: 'paid' | 'pending' | 'overdue' | 'cancelled';
  payment_notes: string | null;
  max_agents: number;
  monthly_message_limit: number;
  monthly_audio_limit: number;
  monthly_ocr_limit: number;
  messages_count: number;
  audios_count: number;
  ocr_count: number;
  extra_messages_balance: number;
  cycle_reset_at: string;
  owner_user_id: string;
  owner_name: string;
  owner_email: string;
  members_count: number;
}

interface PlatformMetrics {
  total_accounts: number;
  total_active: number;
  total_suspended: number;
  estimated_mrr: number;
  total_messages_month: number;
  total_audios_month: number;
  total_ocr_month: number;
}

const PLAN_META: Record<
  'basic' | 'standard' | 'pro',
  { name: string; price: number; color: string; badgeClass: string }
> = {
  basic: {
    name: 'Plan Emprendedor',
    price: 25,
    color: '#3b82f6',
    badgeClass: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  },
  standard: {
    name: 'Plan Comercio',
    price: 45,
    color: '#8b5cf6',
    badgeClass: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  },
  pro: {
    name: 'Plan Empresa',
    price: 85,
    color: '#f59e0b',
    badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  },
};

export default function SaasClientsPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<ClientAccount[]>([]);
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // New Client Form
  const [newCompany, setNewCompany] = useState('');
  const [newOwnerName, setNewOwnerName] = useState('');
  const [newOwnerEmail, setNewOwnerEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPlanTier, setNewPlanTier] = useState<'basic' | 'standard' | 'pro'>('basic');
  const [newCycleDays, setNewCycleDays] = useState('30');
  const [newPaymentNotes, setNewPaymentNotes] = useState('');

  // Edit / Action Dialogs
  const [activeClient, setActiveClient] = useState<ClientAccount | null>(null);
  const [isChangePlanOpen, setIsChangePlanOpen] = useState(false);
  const [targetPlan, setTargetPlan] = useState<'basic' | 'standard' | 'pro'>('basic');
  const [actionLoading, setActionLoading] = useState(false);

  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [editNotes, setEditNotes] = useState('');

  // Fetch data
  const fetchClients = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/clients');
      if (!res.ok) {
        if (res.status === 403) {
          toast.error('Acceso denegado: se requieren permisos de Super Admin.');
        } else {
          toast.error('Error al cargar la lista de clientes.');
        }
        return;
      }
      const data = await res.json();
      setClients(data.clients || []);
      setMetrics(data.metrics || null);
    } catch (err) {
      console.error(err);
      toast.error('Error de conexión al cargar clientes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  // Handle Client Creation
  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompany.trim() || !newOwnerEmail.trim() || !newPassword.trim()) {
      toast.error('Por favor completa los campos obligatorios.');
      return;
    }

    try {
      setCreateLoading(true);
      const res = await fetch('/api/admin/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: newCompany,
          ownerName: newOwnerName,
          ownerEmail: newOwnerEmail,
          password: newPassword,
          planTier: newPlanTier,
          cycleDays: Number(newCycleDays) || 30,
          paymentNotes: newPaymentNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al crear cliente');
      }

      toast.success(`¡Cliente ${newCompany} creado con éxito!`);
      setIsCreateOpen(false);
      // Reset form
      setNewCompany('');
      setNewOwnerName('');
      setNewOwnerEmail('');
      setNewPassword('');
      setNewPlanTier('basic');
      setNewPaymentNotes('');
      fetchClients();
    } catch (err: any) {
      toast.error(err.message || 'Error al crear cliente');
    } finally {
      setCreateLoading(false);
    }
  };

  // Handle Quick Actions (Patch)
  const patchClient = async (
    clientId: string,
    updates: Record<string, any>,
    successMsg: string
  ) => {
    try {
      setActionLoading(true);
      const res = await fetch(`/api/admin/clients/${clientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al actualizar');
      }

      toast.success(successMsg);
      fetchClients();
    } catch (err: any) {
      toast.error(err.message || 'Error al actualizar cliente');
    } finally {
      setActionLoading(false);
    }
  };

  // Toggle Suspend / Reactivate
  const toggleSuspend = (client: ClientAccount) => {
    const nextState = !client.is_active;
    const msg = nextState
      ? `Cuenta de "${client.name}" reactivada.`
      : `Cuenta de "${client.name}" suspendida.`;
    patchClient(client.id, { is_active: nextState }, msg);
  };

  // Extend 30 Days
  const handleExtend30Days = (client: ClientAccount) => {
    patchClient(
      client.id,
      { extend_days: 30 },
      `Suscripción de "${client.name}" extendida por 30 días.`
    );
  };

  // Add 500 Messages Add-on
  const handleAddMessages = (client: ClientAccount) => {
    patchClient(
      client.id,
      { add_extra_messages: 500 },
      `+500 mensajes añadidos a "${client.name}".`
    );
  };

  // Reset Usage Counters
  const handleResetUsage = (client: ClientAccount) => {
    if (confirm(`¿Reiniciar contadores de consumo para "${client.name}"?`)) {
      patchClient(
        client.id,
        { reset_usage: true },
        `Contadores de "${client.name}" reiniciados a 0.`
      );
    }
  };

  // Change Plan
  const handleChangePlan = () => {
    if (!activeClient) return;
    patchClient(
      activeClient.id,
      { plan_tier: targetPlan },
      `Plan de "${activeClient.name}" cambiado a ${PLAN_META[targetPlan].name}.`
    );
    setIsChangePlanOpen(false);
  };

  // Save Notes
  const handleSaveNotes = () => {
    if (!activeClient) return;
    patchClient(
      activeClient.id,
      { payment_notes: editNotes },
      `Notas guardadas para "${activeClient.name}".`
    );
    setIsNotesOpen(false);
  };

  // Filtered clients
  const filteredClients = useMemo(() => {
    return clients.filter((c) => {
      const matchSearch =
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.owner_email.toLowerCase().includes(search.toLowerCase()) ||
        c.owner_name.toLowerCase().includes(search.toLowerCase());

      const matchPlan = planFilter === 'all' || c.plan_tier === planFilter;

      let matchStatus = true;
      if (statusFilter === 'active') matchStatus = c.is_active;
      else if (statusFilter === 'suspended') matchStatus = !c.is_active;
      else if (statusFilter === 'expiring') {
        const daysLeft = Math.ceil(
          (new Date(c.cycle_reset_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );
        matchStatus = daysLeft >= 0 && daysLeft <= 7;
      }

      return matchSearch && matchPlan && matchStatus;
    });
  }, [clients, search, planFilter, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <Building2 className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Panel de Clientes SaaS
            </h1>
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
              Super Admin
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Administra las empresas clientes de tu plataforma, planes, vencimientos y consumos de IA en tiempo real.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchClients}
            disabled={loading}
            className="gap-1.5"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>

          <Button
            onClick={() => setIsCreateOpen(true)}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Plus className="h-4 w-4" />
            Nuevo Cliente SaaS
          </Button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Empresas Activas
            </CardTitle>
            <Building2 className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {metrics?.total_active || 0}{' '}
              <span className="text-xs font-normal text-muted-foreground">
                / {metrics?.total_accounts || 0} totales
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics?.total_suspended || 0} suspendidas
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              MRR Estimado
            </CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              ${metrics?.estimated_mrr || 0}{' '}
              <span className="text-xs font-normal text-muted-foreground">USD/mes</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Suscripciones activas recurrentes
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Mensajes Globales Mes
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {(metrics?.total_messages_month || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Procesados en todas las empresas
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Audios & OCR Mes
            </CardTitle>
            <Mic className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {(metrics?.total_audios_month || 0).toLocaleString()}{' '}
              <span className="text-xs font-normal text-muted-foreground">audios</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              + {(metrics?.total_ocr_month || 0).toLocaleString()} captures Pago Móvil
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por empresa, dueño o correo electrónico..."
            className="pl-9"
          />
        </div>

        <div className="flex gap-2">
          <Select value={planFilter} onValueChange={(v) => setPlanFilter(v ?? 'all')}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Plan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los Planes</SelectItem>
              <SelectItem value="basic">Emprendedor ($25)</SelectItem>
              <SelectItem value="standard">Comercio ($45)</SelectItem>
              <SelectItem value="pro">Empresa ($85)</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? 'all')}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los Estados</SelectItem>
              <SelectItem value="active">Activos</SelectItem>
              <SelectItem value="suspended">Suspendidos</SelectItem>
              <SelectItem value="expiring">Vencen en 7 días</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Clients Table */}
      <Card className="border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Empresa / Dueño</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Vencimiento del Ciclo</th>
                <th className="px-4 py-3">Consumo Mensual</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading && clients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
                    <p className="mt-2 text-sm">Cargando empresas clientes...</p>
                  </td>
                </tr>
              ) : filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    No se encontraron clientes con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => {
                  const plan = PLAN_META[client.plan_tier] || PLAN_META.basic;
                  const daysLeft = Math.ceil(
                    (new Date(client.cycle_reset_at).getTime() - Date.now()) /
                      (1000 * 60 * 60 * 24)
                  );
                  const isExpired = daysLeft <= 0;
                  const isExpiringSoon = daysLeft > 0 && daysLeft <= 5;

                  const msgPct = Math.min(
                    100,
                    Math.round((client.messages_count / client.monthly_message_limit) * 100)
                  );
                  const audioPct = Math.min(
                    100,
                    Math.round((client.audios_count / client.monthly_audio_limit) * 100)
                  );

                  return (
                    <tr
                      key={client.id}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      {/* Empresa & Dueño */}
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-foreground flex items-center gap-1.5">
                          {client.name}
                          {client.payment_notes && (
                            <span
                              title={`Notas: ${client.payment_notes}`}
                              className="inline-block h-2 w-2 rounded-full bg-amber-400"
                            />
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {client.owner_name} •{' '}
                          <span className="text-foreground/80">{client.owner_email}</span>
                        </div>
                        <div className="text-[11px] text-muted-foreground/70 mt-0.5">
                          {client.members_count} agente(s) en equipo (máx {client.max_agents})
                        </div>
                      </td>

                      {/* Plan */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${plan.badgeClass}`}
                        >
                          {plan.name} (${plan.price}/m)
                        </span>
                      </td>

                      {/* Estado */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {!client.is_active ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/30">
                            <XCircle className="h-3 w-3" /> Suspendido
                          </span>
                        ) : isExpired ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                            <AlertTriangle className="h-3 w-3" /> Ciclo Vencido
                          </span>
                        ) : isExpiringSoon ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-yellow-500/10 text-yellow-300 border border-yellow-500/30">
                            <Clock className="h-3 w-3" /> Vence en {daysLeft}d
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            <CheckCircle2 className="h-3 w-3" /> Activo
                          </span>
                        )}
                      </td>

                      {/* Vencimiento */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="text-xs font-medium text-foreground">
                          {new Date(client.cycle_reset_at).toLocaleDateString('es-ES', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          {isExpired ? 'Expiró' : `Quedan ${daysLeft} días`}
                        </div>
                      </td>

                      {/* Consumo */}
                      <td className="px-4 py-3.5 min-w-[200px]">
                        {/* Mensajes */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>
                              💬 {client.messages_count.toLocaleString()} /{' '}
                              {client.monthly_message_limit.toLocaleString()} msgs
                            </span>
                            {client.extra_messages_balance > 0 && (
                              <span className="text-emerald-400 font-medium">
                                +{client.extra_messages_balance} extra
                              </span>
                            )}
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                msgPct > 90
                                  ? 'bg-red-500'
                                  : msgPct > 70
                                  ? 'bg-amber-500'
                                  : 'bg-primary'
                              }`}
                              style={{ width: `${msgPct}%` }}
                            />
                          </div>
                        </div>

                        {/* Audios & OCR */}
                        <div className="mt-1.5 flex gap-3 text-[11px] text-muted-foreground">
                          <span>
                            🎙️ {client.audios_count}/{client.monthly_audio_limit} audios
                          </span>
                          <span>
                            🧾 {client.ocr_count}/{client.monthly_ocr_limit} OCR
                          </span>
                        </div>
                      </td>

                      {/* Acciones */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            aria-label="Opciones"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground data-[popup-open]:bg-muted"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52">
                            <DropdownMenuItem
                              onClick={() => {
                                setActiveClient(client);
                                setTargetPlan(client.plan_tier);
                                setIsChangePlanOpen(true);
                              }}
                              className="gap-2"
                            >
                              <Zap className="h-4 w-4 text-purple-400" />
                              Cambiar de Plan
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => handleAddMessages(client)}
                              className="gap-2"
                            >
                              <Plus className="h-4 w-4 text-blue-400" />
                              Recargar +500 Msgs ($5)
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => handleExtend30Days(client)}
                              className="gap-2"
                            >
                              <Calendar className="h-4 w-4 text-emerald-400" />
                              Renovar +30 Días
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => handleResetUsage(client)}
                              className="gap-2"
                            >
                              <RefreshCw className="h-4 w-4 text-muted-foreground" />
                              Reiniciar Contadores Mes
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => {
                                setActiveClient(client);
                                setEditNotes(client.payment_notes || '');
                                setIsNotesOpen(true);
                              }}
                              className="gap-2"
                            >
                              <FileSearch className="h-4 w-4 text-amber-400" />
                              Notas de Cobro/Pago
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            <DropdownMenuItem
                              onClick={() => toggleSuspend(client)}
                              className={
                                client.is_active
                                  ? 'text-red-400 focus:text-red-400'
                                  : 'text-emerald-400 focus:text-emerald-400'
                              }
                            >
                              {client.is_active ? (
                                <>
                                  <XCircle className="mr-2 h-4 w-4" />
                                  Suspender Cuenta
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="mr-2 h-4 w-4" />
                                  Reactivar Cuenta
                                </>
                              )}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal: Crear Nuevo Cliente SaaS */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-emerald-400" />
              Dar de Alta Nuevo Cliente SaaS
            </DialogTitle>
            <DialogDescription>
              Crea la cuenta de la empresa y los accesos para el dueño del negocio.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateClient} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="company-name">
                Nombre de la Empresa / Negocio <span className="text-red-400">*</span>
              </Label>
              <Input
                id="company-name"
                value={newCompany}
                onChange={(e) => setNewCompany(e.target.value)}
                placeholder="Ej: Auto Repuestos La Castellana C.A."
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="owner-name">Nombre del Contacto</Label>
                <Input
                  id="owner-name"
                  value={newOwnerName}
                  onChange={(e) => setNewOwnerName(e.target.value)}
                  placeholder="Ej: Carlos Gómez"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="owner-email">
                  Correo Electrónico <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="owner-email"
                  type="email"
                  value={newOwnerEmail}
                  onChange={(e) => setNewOwnerEmail(e.target.value)}
                  placeholder="carlos@autorepuestos.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="initial-password">
                Contraseña Inicial de Acceso <span className="text-red-400">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="initial-password"
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Plan a Asignar</Label>
                <Select
                  value={newPlanTier}
                  onValueChange={(v) => setNewPlanTier(v as any)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">
                      Plan Emprendedor ($25 / mes)
                    </SelectItem>
                    <SelectItem value="standard">
                      Plan Comercio ($45 / mes)
                    </SelectItem>
                    <SelectItem value="pro">
                      Plan Empresa Pro ($85 / mes)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cycle-days">Días de Ciclo Inicial</Label>
                <Input
                  id="cycle-days"
                  type="number"
                  value={newCycleDays}
                  onChange={(e) => setNewCycleDays(e.target.value)}
                  placeholder="30"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment-notes">Notas de Pago / Registro (Opcional)</Label>
              <Input
                id="payment-notes"
                value={newPaymentNotes}
                onChange={(e) => setNewPaymentNotes(e.target.value)}
                placeholder="Ej: Pago Móvil Banesco ref 984512 - Cobrado mes 1"
              />
            </div>

            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
                disabled={createLoading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createLoading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {createLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Check className="mr-2 h-4 w-4" />
                )}
                Crear Cliente SaaS
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Cambiar Plan */}
      <Dialog open={isChangePlanOpen} onOpenChange={setIsChangePlanOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cambiar Plan de {activeClient?.name}</DialogTitle>
            <DialogDescription>
              Al cambiar el plan se sincronizarán automáticamente los nuevos límites de mensajes, audios, OCR y agentes permitidos.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-2">
              <Label>Seleccionar Nuevo Plan</Label>
              <Select
                value={targetPlan}
                onValueChange={(v) => setTargetPlan(v as any)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">
                    Plan Emprendedor ($25/m) • 1.500 msgs • 200 audios • 1 agente
                  </SelectItem>
                  <SelectItem value="standard">
                    Plan Comercio ($45/m) • 4.500 msgs • 800 audios • 3 agentes
                  </SelectItem>
                  <SelectItem value="pro">
                    Plan Empresa ($85/m) • 12.000 msgs • 2.500 audios • 10 agentes
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsChangePlanOpen(false)}
              disabled={actionLoading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleChangePlan}
              disabled={actionLoading}
              className="bg-primary text-primary-foreground"
            >
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar Cambio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Editar Notas */}
      <Dialog open={isNotesOpen} onOpenChange={setIsNotesOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Notas de {activeClient?.name}</DialogTitle>
            <DialogDescription>
              Registra referencias bancarias, teléfono directo del cliente o acuerdos especiales.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-3">
            <Label htmlFor="notes-area">Notas</Label>
            <Input
              id="notes-area"
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              placeholder="Ej: Pago recibido vía Zelle el 15/09. Teléfono WhatsApp: +58 414..."
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsNotesOpen(false)}
              disabled={actionLoading}
            >
              Cancelar
            </Button>
            <Button onClick={handleSaveNotes} disabled={actionLoading}>
              {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar Notas
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
