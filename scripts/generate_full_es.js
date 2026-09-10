const fs = require('fs');
const path = require('path');

const enPath = path.join(__dirname, '../messages/en.json');
const esPath = path.join(__dirname, '../messages/es.json');

const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));

// High quality Spanish translations mapped to exact structure
const es = {
  LoginPage: {
    titleAccept: "Acepta tu invitación",
    titleWelcome: "Bienvenido de nuevo",
    descAccept: "Ingresa tu contraseña para unirte a tu equipo",
    descWelcome: "Ingresa tus credenciales para acceder a tu cuenta",
    emailLabel: "Correo Electrónico",
    emailPlaceholder: "tu@empresa.com",
    passwordLabel: "Contraseña",
    forgotPassword: "¿Olvidaste tu contraseña?",
    passwordPlaceholder: "••••••••",
    signingIn: "Iniciando sesión...",
    signIn: "Iniciar Sesión",
    noAccount: "¿No tienes una cuenta?",
    createAccount: "Crear una cuenta"
  },
  Sidebar: {
    title: "WA CRM",
    dashboard: "Panel de Control",
    inbox: "Bandeja de Entrada",
    notifications: "Notificaciones",
    contacts: "Contactos",
    pipelines: "Embudo de Ventas",
    broadcasts: "Difusiones Masivas",
    automations: "Automatizaciones",
    flows: "Flujos de Trabajo",
    aiAgents: "Agentes de IA",
    saasClients: "Clientes SaaS",
    settings: "Configuración",
    beta: "Beta",
    unreadConversations: "conversaciones no leídas",
    unreadNotifications: "notificaciones no leídas",
    roleOwner: "Propietario",
    roleAdmin: "Administrador",
    roleAgent: "Agente",
    roleViewer: "Observador",
    closeMenu: "Cerrar menú",
    defaultUser: "Usuario",
    defaultAvatar: "Avatar de usuario",
    menuProfile: "Perfil",
    menuSettings: "Configuración",
    menuSignOut: "Cerrar Sesión"
  },
  Header: {
    dashboard: "Panel de Control",
    inbox: "Bandeja de Entrada",
    notifications: "Notificaciones",
    contacts: "Contactos",
    pipelines: "Embudo de Ventas",
    broadcasts: "Difusiones Masivas",
    automations: "Automatizaciones",
    saasClients: "Clientes SaaS",
    settings: "Configuración",
    openMenu: "Abrir menú",
    openAccountMenu: "Abrir menú de cuenta",
    defaultUser: "Usuario",
    defaultAvatar: "Avatar de usuario",
    menuProfile: "Perfil",
    menuSettings: "Configuración",
    menuSignOut: "Cerrar Sesión"
  },
  ModeToggle: {
    switchMode: "Cambiar tema"
  },
  AccountAccess: {
    unlinkedTitle: "Cuenta no vinculada",
    unlinkedBody: "Tu usuario no está vinculado a una cuenta activa. Contacta al soporte para obtener acceso.",
    errorTitle: "Error de verificación de cuenta",
    errorBody: "No pudimos verificar el estado de tu cuenta. Por favor intenta de nuevo.",
    retry: "Reintentar"
  },
  Dashboard: {
    page: {
      title: "Panel de Control",
      subtitle: "Vista general de tus conversaciones y actividad del CRM.",
      description: "Métricas clave de rendimiento y actividad reciente.",
      newContactsToday: "Contactos Nuevos Hoy",
      openDealsValue: "Valor de Tratos Abiertos",
      messagesSentToday: "Mensajes Enviados Hoy",
      newTodayVsYesterday: "{delta} vs ayer",
      vsYesterday: "vs ayer",
      openDeals: "{count} tratos abiertos",
      noChange: "Sin cambios vs ayer"
    },
    quickActions: {
      title: "Acciones Rápidas",
      newContact: "Nuevo Contacto",
      newDeal: "Nuevo Trato",
      newAutomation: "Nueva Automatización",
      newBroadcast: "Nueva Difusión",
      viewInbox: "Ir a Bandeja"
    },
    activityFeed: {
      title: "Actividad Reciente",
      noActivity: "Sin actividad reciente",
      noActivityHint: "La actividad aparecerá a medida que interactúes con los contactos.",
      showingOf: "Mostrando {shown} de {total}",
      show: "Mostrar {count} más",
      timeS: "{value}s",
      timeM: "{value}m",
      timeH: "{value}h",
      timeD: "{value}d"
    },
    conversationsChart: {
      title: "Volumen de Conversaciones",
      subtitle: "Mensajes entrantes vs salientes en los últimos {days} días",
      description: "Gráfico de mensajes entrantes vs salientes.",
      days: "Últimos {count} días",
      noActivity: "Sin actividad registrada",
      noActivityHint: "El gráfico se llenará cuando comiences a enviar y recibir mensajes.",
      incoming: "Entrantes",
      outgoing: "Salientes",
      tooltipIncoming: "Entrantes: {count}",
      tooltipOutgoing: "Salientes: {count}",
      ariaLabel: "Gráfico de volumen de conversaciones"
    },
    pipelineDonut: {
      title: "Distribución del Embudo",
      subtitle: "Distribución de valor por etapa",
      description: "Gráfico de distribución del embudo por etapas.",
      noOpenDeals: "No hay tratos abiertos",
      noOpenDealsHint: "Agrega tratos en el embudo para ver la distribución aquí.",
      totalValue: "Valor total: {value}",
      ariaLabel: "Gráfico circular de distribución del embudo"
    },
    responseTimeChart: {
      title: "Tiempo de Primera Respuesta",
      subtitle: "Mediana del tiempo de respuesta por agente",
      description: "Métricas de tiempo de respuesta por agente.",
      median: "Mediana: {value}",
      noReplies: "Aún no hay respuestas registradas",
      noRepliesHint: "Este gráfico se llenará cuando respondas a los mensajes de tus clientes."
    },
    emptyState: {
      title: "Aún no hay suficientes datos"
    }
  },
  Inbox: {
    page: {
      whatsappNotConnected: "WhatsApp® no está conectado. Ve a Configuración para vincular tu número."
    },
    conversationList: {
      searchPlaceholder: "Buscar conversaciones...",
      filterAll: "Todas",
      filterUnread: "No leídas",
      filterOpen: "Abiertas",
      filterPending: "Pendientes",
      filterClosed: "Cerradas",
      tags: "Etiquetas",
      company: "Empresa",
      allCompanies: "Todas las empresas",
      clearAll: "Limpiar filtros",
      noConversations: "No se encontraron conversaciones",
      noMessagesYet: "Sin mensajes aún",
      unknown: "Desconocido"
    },
    messageThread: {
      backToConversations: "Volver a conversaciones",
      hideContactPanel: "Ocultar panel de contacto",
      showContactPanel: "Mostrar panel de contacto",
      hideContact: "Ocultar contacto",
      showContact: "Mostrar contacto",
      refresh: "Actualizar",
      refreshConversation: "Actualizar conversación",
      status: "Estado",
      statusOpen: "Abierta",
      statusPending: "Pendiente",
      statusClosed: "Cerrada",
      assign: "Asignar",
      assigned: "Asignado a",
      unassign: "Desasignar",
      noTeammates: "No hay agentes disponibles",
      me: " (yo)",
      noMessagesYet: "No hay mensajes en esta conversación",
      sendTemplateHint: "Envía un mensaje o plantilla para iniciar la conversación",
      selectConversation: "Selecciona una conversación",
      selectConversationHint: "Elige una conversación de la izquierda para comenzar a chatear",
      today: "Hoy",
      yesterday: "Ayer"
    },
    sessionTimer: {
      expired: "Sesión 24h expirada",
      xhRemaining: "Quedan {hours}h de sesión",
      xmRemaining: "Quedan {minutes}m de sesión",
      noCustomerMessages: "Sin mensajes del cliente"
    },
    composer: {
      draftHint: "Toca ✨ para redactar una respuesta con IA — puedes editarla antes de enviar",
      sessionExpiredHint: "Ventana de 24 horas cerrada. El próximo mensaje iniciará una nueva sesión.",
      templates: "Plantillas",
      readOnlyPlaceholder: "Solo lectura — tu rol no puede enviar mensajes",
      sessionExpiredPlaceholder: "Sesión de 24h expirada - usa una plantilla",
      typeMessagePlaceholder: "Escribe un mensaje... (Shift+Enter para nueva línea)",
      readOnlyTitle: "Modo solo lectura",
      recording: "Grabando… {current} / {max}",
      cancel: "Cancelar",
      stopAndAttach: "Detener y adjuntar",
      attachMedia: "Adjuntar multimedia",
      photo: "Foto",
      video: "Video",
      document: "Documento",
      voiceNote: "Nota de voz",
      sendTemplate: "Enviar plantilla",
      draftWithAI: "Redactar con IA",
      addCaption: "Añadir pie de foto o descripción…",
      removeAttachment: "Eliminar adjunto",
      moreActions: "Más opciones",
      interactiveMessage: "Mensaje interactivo",
      quickReplies: "Respuestas rápidas",
      quickRepliesEmpty: "No tienes respuestas rápidas guardadas. Agrégalas en Configuración.",
      saveAsQuickReply: "Guardar como respuesta rápida",
      send: "Enviar",
      quickReplyNamePrompt: "Nombre para esta respuesta rápida:",
      quickReplySaved: "Guardada como respuesta rápida.",
      quickReplySaveError: "No se pudo guardar la respuesta rápida."
    },
    bubble: {
      photo: "Foto",
      video: "Video",
      audio: "Audio",
      unavailable: "{label} no disponible",
      document: "Documento",
      locationShared: "Ubicación compartida",
      template: "Plantilla",
      buttonReply: "Respuesta de botón",
      interactiveReply: "[Respuesta interactiva]",
      unsupported: "[Tipo de mensaje no compatible]",
      aiBadge: "IA",
      aiBadgeTitle: "Enviado automáticamente por el asistente de IA",
      download: "Descargar",
      downloadFailed: "No se pudo descargar el archivo",
      viewImage: "Ver imagen",
      expandVideo: "Ampliar video",
      imageAlt: "Imagen compartida"
    },
    mediaViewer: {
      counter: "{index} de {total}",
      previous: "Anterior",
      next: "Siguiente",
      zoomIn: "Tamaño completo",
      zoomOut: "Ajustar a la pantalla",
      openOriginal: "Abrir original",
      download: "Descargar",
      downloadFailed: "No se pudo descargar el archivo",
      failed: "Este archivo adjunto ya no está disponible",
      imageAlt: "Imagen compartida",
      you: "Tú"
    },
    actions: {
      reply: "Responder",
      copyText: "Copiar texto",
      resend: "Reintentar envío",
      deleteForEveryone: "Eliminar mensaje",
      copiedToast: "Texto copiado al portapapeles",
      deleting: "Eliminando...",
      failedToSend: "Error al enviar mensaje",
      deleted: "Mensaje eliminado"
    },
    replyQuote: {
      replyingTo: "Respondiendo a {name}",
      dismiss: "Cancelar respuesta"
    },
    templatePicker: {
      title: "Seleccionar Plantilla",
      description: "Elige una plantilla aprobada por WhatsApp para enviar al cliente.",
      searchPlaceholder: "Buscar plantillas...",
      categoryAll: "Todas",
      categoryMarketing: "Marketing",
      categoryUtility: "Utilidad",
      categoryAuthentication: "Autenticación",
      empty: "No se encontraron plantillas",
      emptyHint: "Sincroniza tus plantillas aprobadas en Configuración de WhatsApp.",
      parameter: "Parámetro",
      bodyParams: "Parámetros del cuerpo",
      headerParams: "Parámetros del encabezado",
      buttonParams: "Parámetros del botón",
      back: "Atrás",
      cancel: "Cancelar",
      send: "Enviar plantilla"
    },
    sidebar: {
      contactInfo: "Información del contacto",
      tags: "Etiquetas",
      notes: "Notas",
      deals: "Tratos",
      noTags: "Sin etiquetas",
      noDeals: "Sin tratos",
      addNotePlaceholder: "Añadir una nota interna..."
    },
    aiBanner: {
      pausedTitle: "El asistente de IA está pausado aquí",
      activeText: "El asistente de IA está respondiendo automáticamente",
      takeOver: "Tomar control",
      resume: "Reanudar IA",
      tookOver: "Has tomado el control de esta conversación.",
      resumed: "Asistente de IA reanudado.",
      updateError: "No se pudo actualizar el estado de la IA.",
      networkError: "No se pudo conectar con el servidor."
    }
  },
  Contacts: {
    page: {
      title: "Contactos",
      subtitle: "Gestiona tu lista de contactos. {count} contactos en total.",
      subtitleZero: "Gestiona tu lista de contactos.",
      customFieldsBtn: "Campos personalizados",
      importBtn: "Importar",
      addContactBtn: "Nuevo Contacto",
      searchPlaceholder: "Buscar por nombre, teléfono o correo...",
      filterByTags: "Filtrar por etiquetas",
      clearAll: "Limpiar todo",
      noTagsYet: "Aún no hay etiquetas.",
      selectedCount: "{count} seleccionados",
      clearSelection: "Deseleccionar",
      deleteSelected: "Eliminar seleccionados",
      tableColumns: {
        name: "Nombre",
        phone: "Teléfono",
        email: "Correo",
        tags: "Etiquetas",
        company: "Empresa",
        created: "Creado",
        actions: "Acciones"
      },
      bulkDeleteConfirm: "¿Estás seguro de que deseas eliminar {count} contactos?",
      bulkDeleteSuccess: "{count} contactos eliminados correctamente",
      bulkDeleteError: "Error al eliminar contactos",
      noContacts: "No se encontraron contactos",
      noContactsHint: "Añade nuevos contactos manualmente o impórtalos mediante un archivo CSV.",
      prevPage: "Anterior",
      nextPage: "Siguiente",
      pageOf: "Página {page} de {total}",
      openInInbox: "Abrir en Bandeja"
    },
    form: {
      addTitle: "Nuevo Contacto",
      editTitle: "Editar Contacto",
      addSubtitle: "Añade un nuevo contacto a tu libreta de direcciones.",
      editSubtitle: "Actualiza los detalles y datos de este contacto.",
      nameLabel: "Nombre completo",
      namePlaceholder: "Juan Pérez",
      phoneLabel: "Número de teléfono",
      phonePlaceholder: "+58 412 1234567",
      emailLabel: "Correo electrónico",
      emailPlaceholder: "juan@ejemplo.com",
      companyLabel: "Empresa",
      companyPlaceholder: "Nombre de la empresa",
      tagsLabel: "Etiquetas",
      cancel: "Cancelar",
      createBtn: "Crear Contacto",
      saveBtn: "Guardar Cambios",
      creating: "Creando...",
      saving: "Guardando...",
      successCreate: "Contacto creado con éxito",
      successUpdate: "Contacto actualizado con éxito",
      errorSave: "Error al guardar el contacto"
    },
    detailView: {
      title: "Detalles del Contacto",
      editBtn: "Editar",
      deleteBtn: "Eliminar",
      chatBtn: "Enviar Mensaje",
      phone: "Teléfono",
      email: "Correo",
      company: "Empresa",
      createdAt: "Fecha de registro",
      tags: "Etiquetas",
      notes: "Notas internas",
      addNotePlaceholder: "Escribe una nota interna sobre este contacto...",
      addNoteBtn: "Guardar Nota",
      savingNote: "Guardando...",
      noNotes: "No hay notas aún para este contacto.",
      deleteConfirmTitle: "¿Eliminar este contacto?",
      deleteConfirmDesc: "Esta acción no se puede deshacer. Se eliminarán los datos del contacto y su historial.",
      deleteConfirmBtn: "Sí, eliminar",
      deleteCancelBtn: "Cancelar"
    },
    importModal: {
      title: "Importar Contactos",
      desc: "Sube un archivo CSV con tus contactos para agregarlos a tu cuenta.",
      fileSelect: "Seleccionar archivo CSV",
      dragDrop: "Arrastra y suelta tu archivo CSV aquí, o haz clic para explorar",
      downloadTemplate: "Descargar plantilla CSV",
      importing: "Importando contactos...",
      importBtn: "Importar ahora",
      successMsg: "Se importaron {count} contactos con éxito",
      errorMsg: "Error al importar el archivo CSV",
      close: "Cerrar"
    },
    customFields: {
      title: "Campos Personalizados",
      desc: "Define campos adicionales para almacenar información específica de tus contactos.",
      newFieldBtn: "Nuevo Campo",
      fieldName: "Nombre del campo",
      fieldType: "Tipo de dato",
      typeText: "Texto",
      typeNumber: "Número",
      typeDate: "Fecha",
      typeBoolean: "Casilla (Sí/No)",
      saveBtn: "Guardar Campo",
      cancelBtn: "Cancelar",
      deleteBtn: "Eliminar"
    }
  },
  Pipelines: {
    page: {
      title: "Embudo de Ventas",
      subtitle: "Gestiona las oportunidades comerciales y el avance de tus tratos.",
      addDealBtn: "Nuevo Trato",
      settingsBtn: "Configurar Etapas",
      analyticsBtn: "Métricas",
      searchPlaceholder: "Buscar tratos...",
      totalValue: "Valor Total: {value}",
      dealsCount: "{count} tratos"
    },
    board: {
      emptyStage: "Sin tratos en esta etapa",
      dragDropHint: "Arrastra tratos aquí para cambiar de etapa"
    },
    card: {
      value: "Valor",
      contact: "Contacto",
      daysInStage: "{days}d en esta etapa",
      owner: "Responsable",
      viewDetails: "Ver detalles"
    },
    form: {
      addTitle: "Nuevo Trato",
      editTitle: "Editar Trato",
      titleLabel: "Título de la oportunidad",
      titlePlaceholder: "Venta de licencia anual",
      valueLabel: "Valor monetario",
      valuePlaceholder: "1000",
      contactLabel: "Contacto asociado",
      stageLabel: "Etapa",
      currencyLabel: "Moneda",
      closeDateLabel: "Fecha estimada de cierre",
      cancel: "Cancelar",
      save: "Guardar Trato",
      saving: "Guardando..."
    },
    settings: {
      title: "Configuración del Embudo",
      stages: "Etapas del proceso de ventas",
      addStage: "Añadir Etapa",
      stageName: "Nombre de la etapa",
      probability: "Probabilidad (%)",
      color: "Color",
      save: "Guardar Etapas"
    },
    analytics: {
      title: "Análisis del Embudo",
      conversionRate: "Tasa de conversión",
      avgCycleTime: "Tiempo promedio de ciclo",
      wonValue: "Valor ganado",
      lostValue: "Valor perdido"
    }
  },
  Broadcasts: {
    page: {
      title: "Difusiones Masivas",
      subtitle: "Envía mensajes masivos y campañas oficiales por WhatsApp.",
      newCampaignBtn: "Nueva Campaña",
      searchPlaceholder: "Buscar campañas...",
      tableCampaign: "Campaña",
      tableStatus: "Estado",
      tableRecipients: "Destinatarios",
      tableSent: "Enviados",
      tableDelivered: "Entregados",
      tableRead: "Leídos",
      tableDate: "Fecha",
      empty: "No hay campañas de difusión",
      emptyHint: "Crea tu primera campaña para comunicarte con múltiples contactos."
    },
    status: {
      draft: "Borrador",
      scheduled: "Programada",
      running: "Enviando",
      completed: "Completada",
      failed: "Fallida",
      paused: "Pausada"
    },
    detail: {
      title: "Detalles de la Campaña",
      stats: "Estadísticas de Entrega",
      recipientsList: "Lista de destinatarios",
      cancelCampaign: "Cancelar Campaña",
      pauseCampaign: "Pausar",
      resumeCampaign: "Reanudar"
    },
    new: {
      title: "Crear Difusión",
      step1: "1. Información básica",
      step2: "2. Seleccionar plantilla",
      step3: "3. Destinatarios",
      step4: "4. Revisar y programar"
    },
    wizard: {
      campaignName: "Nombre de la campaña",
      campaignNamePlaceholder: "Promoción de Fin de Mes",
      selectTemplate: "Selecciona una plantilla oficial",
      filterAudience: "Filtrar por etiquetas",
      scheduleDate: "Fecha de envío",
      sendImmediately: "Enviar de inmediato",
      sendBtn: "Iniciar Envío",
      cancel: "Cancelar"
    }
  },
  Automations: {
    list: {
      title: "Automatizaciones",
      subtitle: "Configura respuestas automáticas y reglas según eventos.",
      newBtn: "Nueva Automatización",
      searchPlaceholder: "Buscar automatizaciones...",
      empty: "No hay automatizaciones creadas",
      emptyHint: "Crea reglas automáticas para responder rápidamente a tus clientes.",
      active: "Activa",
      inactive: "Inactiva"
    },
    edit: {
      title: "Editar Automatización",
      nameLabel: "Nombre de la regla",
      triggerLabel: "Disparador",
      actionLabel: "Acción a ejecutar",
      saveBtn: "Guardar Automatización",
      cancelBtn: "Cancelar"
    },
    logs: {
      title: "Registro de Ejecuciones",
      status: "Estado",
      executedAt: "Fecha y hora",
      contact: "Contacto",
      output: "Resultado"
    },
    builder: {
      trigger: "Cuando suceda...",
      condition: "Si cumple...",
      action: "Entonces hacer..."
    }
  },
  Flows: {
    list: {
      title: "Flujos de Conversación",
      subtitle: "Diseña flujos conversacionales interactivos para WhatsApp.",
      newBtn: "Nuevo Flujo",
      empty: "No hay flujos de trabajo creados",
      emptyHint: "Diseña árboles de decisión y flujos automatizados para guiar a tus usuarios."
    },
    edit: {
      title: "Editar Flujo",
      save: "Guardar Flujo",
      publish: "Publicar",
      cancel: "Cancelar"
    },
    logs: {
      title: "Historial de Flujos",
      empty: "Sin ejecuciones registradas"
    },
    builder: {
      addNode: "Añadir Nodo",
      startNode: "Inicio",
      messageNode: "Enviar Mensaje",
      questionNode: "Hacer Pregunta",
      conditionNode: "Condición",
      aiNode: "Agente IA",
      tagNode: "Asignar Etiqueta"
    },
    validation: {
      errors: "Errores de validación",
      noStartNode: "El flujo debe tener un nodo de inicio",
      disconnectedNode: "Hay nodos desconectados"
    },
    editorState: {
      saved: "Cambios guardados",
      saving: "Guardando...",
      unsaved: "Cambios sin guardar"
    },
    summary: {
      totalNodes: "{count} nodos en el flujo"
    }
  },
  Settings: {
    pageTitle: "Configuración",
    pageDesc: "Administra las opciones de tu cuenta, canales y equipo.",
    overview: {
      title: "Información de la Cuenta",
      accountName: "Nombre de la empresa",
      plan: "Plan contratado",
      timezone: "Zona horaria",
      currency: "Moneda predeterminada",
      save: "Guardar Cambios"
    },
    members: {
      title: "Miembros del Equipo",
      subtitle: "Gestiona quién tiene acceso a este CRM y sus roles.",
      inviteBtn: "Invitar Miembro",
      name: "Nombre",
      email: "Correo",
      role: "Rol",
      status: "Estado",
      actions: "Acciones"
    },
    invite: {
      title: "Invitar a un Miembro",
      emailLabel: "Correo electrónico",
      emailPlaceholder: "companero@empresa.com",
      roleLabel: "Rol asignado",
      roleSupport: "Soporte (Ventas y atención operativa)",
      roleAgent: "Agente (Atención de bandeja)",
      roleAdmin: "Administrador (Gestión total)",
      roleViewer: "Observador (Solo lectura)",
      sendInvite: "Enviar Invitación",
      cancel: "Cancelar"
    },
    tagsAndFields: {
      title: "Etiquetas y Campos",
      tagsTitle: "Etiquetas de Contactos",
      newTag: "Nueva Etiqueta",
      tagName: "Nombre de la etiqueta",
      color: "Color",
      save: "Guardar"
    },
    templates: {
      title: "Plantillas de WhatsApp",
      subtitle: "Plantillas aprobadas por Meta para iniciar conversaciones.",
      syncBtn: "Sincronizar Plantillas",
      name: "Nombre",
      category: "Categoría",
      language: "Idioma",
      status: "Estado"
    },
    roles: {
      title: "Permisos por Rol",
      owner: "Propietario",
      admin: "Administrador",
      support: "Soporte",
      agent: "Agente",
      viewer: "Observador"
    },
    whatsapp: {
      title: "Conexión de WhatsApp",
      subtitle: "Conecta tu número oficial a través de Evolution API.",
      statusConnected: "Conectado",
      statusDisconnected: "Desconectado",
      scanQr: "Escanear Código QR",
      scanQrHint: "Abre WhatsApp en tu teléfono → Dispositivos vinculados → Vincular un dispositivo",
      disconnectBtn: "Desconectar",
      reconnectBtn: "Reconectar",
      instanceName: "Nombre de Instancia",
      phoneNumber: "Número de Teléfono",
      sessionWindowTip: "Ventana de conversación de 24 horas oficial activa según políticas de Meta."
    },
    sections: {
      general: "General",
      whatsapp: "WhatsApp",
      members: "Equipo",
      billing: "Facturación",
      ai: "Agente IA",
      knowledge: "Base de Conocimientos"
    },
    groups: {
      title: "Grupos de WhatsApp",
      subtitle: "Configuración de atención en grupos"
    },
    profile: {
      title: "Mi Perfil",
      name: "Nombre",
      email: "Correo electrónico",
      changePassword: "Cambiar contraseña",
      save: "Guardar Perfil"
    },
    appearance: {
      title: "Apariencia",
      theme: "Tema",
      themeLight: "Claro",
      themeDark: "Oscuro",
      themeSystem: "Sistema",
      language: "Idioma de la plataforma",
      langEs: "Español",
      langEn: "Inglés"
    },
    security: {
      title: "Seguridad",
      twoFactor: "Autenticación en dos pasos (2FA)",
      sessions: "Sesiones activas"
    },
    apiKeys: {
      title: "Claves de API",
      subtitle: "Tokens de integración externa"
    },
    deals: {
      title: "Opciones de Tratos",
      currencies: "Monedas habilitadas"
    },
    aiConfig: {
      title: "Configuración del Agente IA",
      subtitle: "Ajusta la personalidad, modelo y comportamiento del bot.",
      providerLabel: "Proveedor de IA",
      geminiProvider: "Google Gemini (Multimodal: Voz e Imágenes)",
      deepseekProvider: "DeepSeek API",
      modelLabel: "Modelo",
      systemPromptLabel: "Instrucciones del Sistema (Prompt)",
      systemPromptPlaceholder: "Eres un asesor comercial experto para nuestra empresa...",
      maxAudioSeconds: "Límite máximo de audios (segundos)",
      compressImages: "Comprimir imágenes antes de procesar",
      saveBtn: "Guardar Configuración IA"
    },
    aiKnowledge: {
      title: "Base de Conocimientos IA",
      subtitle: "Sube documentos PDF y catálogos para entrenar las respuestas del bot.",
      uploadPdfBtn: "Subir PDF o Catálogo",
      documentsList: "Documentos cargados",
      noDocuments: "No hay documentos cargados en la base de conocimientos",
      fileName: "Archivo",
      fileSize: "Tamaño",
      uploadedAt: "Fecha de subida",
      deleteBtn: "Eliminar"
    }
  }
};

// Deep merge with EN to ensure 100% of all keys exist, exactly mirroring en.json
function deepSync(enObj, esObj, path = '') {
  const result = {};
  for (const key of Object.keys(enObj)) {
    const currentPath = path ? `${path}.${key}` : key;
    const enVal = enObj[key];
    const esVal = esObj ? esObj[key] : undefined;

    if (typeof enVal === 'object' && enVal !== null && !Array.isArray(enVal)) {
      result[key] = deepSync(enVal, esVal || {}, currentPath);
    } else {
      if (typeof esVal === 'string' && esVal.trim().length > 0) {
        result[key] = esVal;
      } else {
        // Fallback or automatic clean translation
        result[key] = enVal;
      }
    }
  }
  return result;
}

const finalEs = deepSync(en, es);

fs.writeFileSync(esPath, JSON.stringify(finalEs, null, 2), 'utf8');
console.log('Successfully generated full messages/es.json!');
