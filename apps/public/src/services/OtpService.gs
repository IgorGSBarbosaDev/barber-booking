function requestEmailVerification_(payload) {
  var customer = validateCustomerPayload_(payload);
  var client = findOrCreateClient_(customer);
  if (asBoolean_(client.emailVerified)) {
    return { required: false, alreadyVerified: true, clientId: client.id };
  }
  var otp = createEmailOtp_(customer);
  try {
    sendOtpEmail_(customer, otp);
  } catch (error) {
    logTechnicalError_('OTP_EMAIL_FAILED', error, { email: customer.email });
    throwAppError_('EMAIL_SEND_FAILED', 'Não foi possível enviar o código de confirmação.');
  }
  return {
    required: true,
    alreadyVerified: false,
    maskedEmail: customer.email.replace(/^(.{2}).+(@.*)$/, '$1••••$2'),
    expiresAt: otp.expiresAt.toISOString(),
    clientId: client.id
  };
}

function verifyEmailVerification_(payload) {
  var data = parsePayload_(payload);
  var customer = validateCustomerPayload_(data);
  var code = trim_(data.code);
  if (!/^\d{6}$/.test(code)) throwAppError_('INVALID_OTP', 'Informe um código de 6 dígitos.');
  checkRateLimit_(customer.email + '|' + customer.phone, 'otp_verify');
  var identifier = customer.email + '|' + customer.phone + '|' + customer.clientId;
  var identifierHash = hashWithSecret_(identifier);
  var records = getSheetRecords_(BARBER_BOOKING.sheets.OTP_CODES).filter(function(record) {
    return record.identifierHash === identifierHash
      && record.purpose === 'EMAIL_VERIFICATION'
      && !record.usedAt;
  }).sort(function(a, b) { return Number(a._rowNumber) - Number(b._rowNumber); });
  var otpRecord = records[records.length - 1];
  if (!otpRecord) throwAppError_('OTP_NOT_FOUND', 'Código inválido ou expirado.');
  if (new Date(otpRecord.expiresAt).getTime() < now_().getTime()) {
    throwAppError_('OTP_EXPIRED', 'Código expirado.');
  }
  if (asInteger_(otpRecord.attempts, 0) >= 5) {
    throwAppError_('OTP_LOCKED', 'Limite de tentativas atingido.');
  }
  otpRecord.attempts = asInteger_(otpRecord.attempts, 0) + 1;
  if (otpRecord.codeHash !== hashWithSecret_(code)) {
    updateSheetRecord_(BARBER_BOOKING.sheets.OTP_CODES, otpRecord);
    throwAppError_('INVALID_OTP', 'Código inválido.');
  }
  otpRecord.usedAt = now_().toISOString();
  var verificationToken = generateToken_();
  otpRecord.verificationTokenHash = hashWithSecret_(verificationToken);
  otpRecord.verificationTokenExpiresAt = new Date(now_().getTime() + 15 * 60 * 1000).toISOString();
  updateSheetRecord_(BARBER_BOOKING.sheets.OTP_CODES, otpRecord);
  var client = findOrCreateClient_(customer);
  client.emailVerified = true;
  client.updatedAt = now_().toISOString();
  updateSheetRecord_(BARBER_BOOKING.sheets.CLIENTS, client);
  logAudit_('CLIENT_EMAIL_VERIFIED', 'CLIENT', client.id, { email: customer.email });
  return { verified: true, clientId: client.id, verificationToken: verificationToken };
}

function appointmentLookupIdentifier_(value) {
  var raw = requireText_(value, 'contato', 4, 254);
  if (raw.indexOf('@') >= 0) {
    var email = normalizeEmail_(raw);
    if (!isValidEmail_(email)) throwAppError_('INVALID_LOOKUP_IDENTIFIER', 'Informe um e-mail válido ou um telefone cadastrado.');
    return { type: 'email', value: email };
  }
  var phone = normalizePhone_(raw);
  if (!isValidPhone_(phone)) throwAppError_('INVALID_LOOKUP_IDENTIFIER', 'Informe um e-mail válido ou um telefone cadastrado.');
  return { type: 'phone', value: phone };
}

function appointmentLookupIdentifierHash_(identifier) {
  return hashWithSecret_('APPOINTMENT_LOOKUP|' + identifier.type + '|' + identifier.value);
}

function appointmentLookupClients_(identifier) {
  return getSheetRecords_(BARBER_BOOKING.sheets.CLIENTS).filter(function(client) {
    return identifier.type === 'email'
      ? normalizeEmail_(client.email) === identifier.value
      : normalizePhone_(client.phone) === identifier.value;
  });
}

function appointmentLookupDeliveryEmail_(identifier, clients) {
  if (!clients.length) return '';
  if (identifier.type === 'email') return identifier.value;
  var emails = [];
  clients.forEach(function(client) {
    var email = normalizeEmail_(client.email);
    if (isValidEmail_(email) && emails.indexOf(email) < 0) emails.push(email);
  });
  return emails.length === 1 ? emails[0] : '';
}

function createAppointmentLookupOtp_(identifier) {
  var identifierHash = appointmentLookupIdentifierHash_(identifier);
  getSheetRecords_(BARBER_BOOKING.sheets.OTP_CODES).forEach(function(record) {
    if (record.purpose !== 'APPOINTMENT_LOOKUP' || record.identifierHash !== identifierHash || !record.verificationTokenHash) return;
    record.verificationTokenHash = '';
    record.verificationTokenExpiresAt = '';
    updateSheetRecord_(BARBER_BOOKING.sheets.OTP_CODES, record);
  });
  var expirationMinutes = asInteger_(getSetting_('OTP_EXPIRATION_MINUTES', 10), 10);
  var code = String(Math.floor(100000 + Math.random() * 900000));
  var expiresAt = new Date(now_().getTime() + expirationMinutes * 60 * 1000);
  appendSheetRecord_(BARBER_BOOKING.sheets.OTP_CODES, {
    id: generateId_('OTP'),
    identifierHash: identifierHash,
    codeHash: hashWithSecret_(code),
    purpose: 'APPOINTMENT_LOOKUP',
    expiresAt: expiresAt.toISOString(),
    usedAt: '',
    attempts: 0,
    verificationTokenHash: '',
    verificationTokenExpiresAt: '',
    appointmentId: '',
    createdAt: now_().toISOString()
  });
  return { code: code };
}

function requestAppointmentLookupOtp_(value) {
  var identifier = appointmentLookupIdentifier_(value);
  checkRateLimit_(identifier.type + '|' + identifier.value, 'appointment_lookup_request');
  var lock = LockService.getScriptLock();
  var email = '';
  var otp = null;
  lock.waitLock(30000);
  try {
    var clients = appointmentLookupClients_(identifier);
    email = appointmentLookupDeliveryEmail_(identifier, clients);
    if (email) otp = createAppointmentLookupOtp_(identifier);
  } finally {
    lock.releaseLock();
  }
  if (otp) {
    try {
      sendAppointmentLookupOtpEmail_(email, otp);
    } catch (error) {
      logTechnicalError_('APPOINTMENT_LOOKUP_OTP_FAILED', error);
    }
  }
  return {
    requested: true,
    message: 'Se os dados corresponderem a um cadastro, enviaremos um código ao e-mail associado.'
  };
}

function verifyAppointmentLookupCode_(payload) {
  var data = parsePayload_(payload);
  var identifier = appointmentLookupIdentifier_(data.identifier);
  var code = trim_(data.code);
  if (!/^\d{6}$/.test(code)) throwAppError_('INVALID_OTP', 'O código é inválido ou expirou.');
  checkRateLimit_(identifier.type + '|' + identifier.value, 'appointment_lookup_verify');
  var identifierHash = appointmentLookupIdentifierHash_(identifier);
  var records = getSheetRecords_(BARBER_BOOKING.sheets.OTP_CODES).filter(function(record) {
    return record.identifierHash === identifierHash && record.purpose === 'APPOINTMENT_LOOKUP';
  }).sort(function(a, b) { return Number(a._rowNumber) - Number(b._rowNumber); });
  var otpRecord = records[records.length - 1];
  if (!otpRecord || otpRecord.usedAt || new Date(otpRecord.expiresAt).getTime() <= now_().getTime()) {
    throwAppError_('INVALID_OTP', 'O código é inválido ou expirou.');
  }
  if (asInteger_(otpRecord.attempts, 0) >= 5) throwAppError_('INVALID_OTP', 'O código é inválido ou expirou.');
  otpRecord.attempts = asInteger_(otpRecord.attempts, 0) + 1;
  if (otpRecord.codeHash !== hashWithSecret_(code)) {
    updateSheetRecord_(BARBER_BOOKING.sheets.OTP_CODES, otpRecord);
    throwAppError_('INVALID_OTP', 'O código é inválido ou expirou.');
  }
  var clients = appointmentLookupClients_(identifier);
  if (!appointmentLookupDeliveryEmail_(identifier, clients)) {
    otpRecord.usedAt = now_().toISOString();
    updateSheetRecord_(BARBER_BOOKING.sheets.OTP_CODES, otpRecord);
    throwAppError_('INVALID_OTP', 'O código é inválido ou expirou.');
  }
  otpRecord.usedAt = now_().toISOString();
  var sessionToken = generateToken_();
  otpRecord.verificationTokenHash = hashWithSecret_(sessionToken);
  otpRecord.verificationTokenExpiresAt = new Date(now_().getTime() + 15 * 60 * 1000).toISOString();
  updateSheetRecord_(BARBER_BOOKING.sheets.OTP_CODES, otpRecord);
  return { identifier: identifier, sessionToken: sessionToken, clients: clients };
}

function appointmentLookupClientsForSession_(value, sessionToken) {
  var identifier = appointmentLookupIdentifier_(value);
  var normalizedToken = trim_(sessionToken);
  var tokenHash = normalizedToken ? hashWithSecret_(normalizedToken) : '';
  var identifierHash = appointmentLookupIdentifierHash_(identifier);
  var isValid = getSheetRecords_(BARBER_BOOKING.sheets.OTP_CODES).some(function(record) {
    return record.identifierHash === identifierHash
      && record.purpose === 'APPOINTMENT_LOOKUP'
      && Boolean(record.usedAt)
      && record.verificationTokenHash === tokenHash
      && new Date(record.verificationTokenExpiresAt).getTime() > now_().getTime();
  });
  var clients = appointmentLookupClients_(identifier);
  if (!isValid || !appointmentLookupDeliveryEmail_(identifier, clients)) {
    throwAppError_('INVALID_LOOKUP_SESSION', 'Sua validação expirou. Solicite um novo código.');
  }
  return clients;
}
