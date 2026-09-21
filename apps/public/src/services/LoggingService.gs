function logAudit_(action, entity, entityId, metadata) {
  try {
    appendSheetRecord_(BARBER_BOOKING.sheets.AUDIT_LOG, {
      id: generateId_('LOG'),
      action: action,
      entity: entity,
      entityId: entityId || '',
      metadata: typeof metadata === 'string' ? metadata : json_(metadata || {}),
      createdAt: now_().toISOString()
    });
  } catch (error) {
    console.error('AUDIT_LOG_FAILED: ' + error.message);
  }
}

function logTechnicalError_(action, error, metadata) {
  try {
    logAudit_(action, 'SYSTEM', '', {
      message: error && error.message ? error.message : String(error),
      metadata: metadata || {}
    });
  } catch (ignored) {
    console.error(action + ': ' + error);
  }
}
