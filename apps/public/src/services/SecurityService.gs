function requireAdmin_() {
  var effectiveEmail = '';
  try {
    effectiveEmail = normalizeEmail_(Session.getEffectiveUser().getEmail());
  } catch (error) {
    throwAppError_('ADMIN_AUTH_REQUIRED', 'Não foi possível validar a conta administrativa.');
  }
  if (!effectiveEmail) {
    throwAppError_('ADMIN_AUTH_REQUIRED', 'A conta Google do administrador não foi identificada.');
  }
  var configuredEmail = normalizeEmail_(getScriptProperty_('ADMIN_EMAIL', ''));
  if (configuredEmail && configuredEmail !== effectiveEmail) {
    throwAppError_('ADMIN_FORBIDDEN', 'Esta conta não possui acesso ao painel administrativo.');
  }
  return effectiveEmail;
}

function clientIdentityHash_(payload) {
  var data = parsePayload_(payload);
  return hashWithSecret_([
    normalizeEmail_(data.email),
    normalizePhone_(data.phone),
    trim_(data.clientId),
    trim_(data.browserToken)
  ].join('|'));
}

function identifierHash_(value) {
  return hashWithSecret_(normalizeEmail_(value));
}

function checkRateLimit_(identifier, action) {
  var settings = getSafeSettings_();
  var key = 'rl_' + hash_(String(action) + '|' + String(identifier)).slice(0, 40);
  var cache = CacheService.getScriptCache();
  var raw = cache.get(key);
  var state = raw ? JSON.parse(raw) : { windowStart: now_().getTime(), attempts: 0, blockedUntil: 0 };
  var timestamp = now_().getTime();
  var windowMs = settings.RATE_LIMIT_WINDOW_SECONDS * 1000;
  if (timestamp - state.windowStart >= windowMs) {
    state = { windowStart: timestamp, attempts: 0, blockedUntil: 0 };
  }
  if (state.blockedUntil && timestamp < state.blockedUntil) {
    throwAppError_('RATE_LIMITED', 'Muitas tentativas. Tente novamente mais tarde.');
  }
  state.attempts += 1;
  if (state.attempts > settings.RATE_LIMIT_MAX_ATTEMPTS) {
    state.blockedUntil = timestamp + settings.RATE_LIMIT_BLOCK_MINUTES * 60 * 1000;
    cache.put(key, JSON.stringify(state), Math.max(60, settings.RATE_LIMIT_BLOCK_MINUTES * 60));
    throwAppError_('RATE_LIMITED', 'Muitas tentativas. Tente novamente mais tarde.');
  }
  cache.put(key, JSON.stringify(state), Math.max(60, settings.RATE_LIMIT_WINDOW_SECONDS));
}

function verifyManagementToken_(appointment, token) {
  var normalizedToken = trim_(token);
  if (!appointment || !normalizedToken || appointment.managementTokenHash !== hashWithSecret_(normalizedToken)) {
    throwAppError_('INVALID_APPOINTMENT_TOKEN', 'O link do agendamento é inválido ou expirou.');
  }
}

function validateCustomerPayload_(payload) {
  var data = parsePayload_(payload);
  var name = requireText_(data.name, 'nome', 2, 120);
  var phone = normalizePhone_(data.phone);
  var email = normalizeEmail_(data.email);
  if (!isValidPhone_(phone)) throwAppError_('INVALID_PHONE', 'Informe um telefone válido.');
  if (!isValidEmail_(email)) throwAppError_('INVALID_EMAIL', 'Informe um e-mail válido.');
  if (!trim_(data.clientId) || !trim_(data.browserToken)) {
    throwAppError_('CLIENT_IDENTIFIER_REQUIRED', 'Não foi possível identificar este navegador.');
  }
  return {
    name: name,
    phone: phone,
    email: email,
    clientId: trim_(data.clientId),
    browserToken: trim_(data.browserToken)
  };
}

function createEmailOtp_(customer) {
  var identifier = customer.email + '|' + customer.phone + '|' + customer.clientId;
  checkRateLimit_(identifier, 'email_otp');
  var expirationMinutes = asInteger_(getSetting_('OTP_EXPIRATION_MINUTES', 10), 10);
  var code = String(Math.floor(100000 + Math.random() * 900000));
  var expiresAt = new Date(now_().getTime() + expirationMinutes * 60 * 1000);
  appendSheetRecord_(BARBER_BOOKING.sheets.OTP_CODES, {
    id: generateId_('OTP'),
    identifierHash: hashWithSecret_(identifier),
    codeHash: hashWithSecret_(code),
    purpose: 'EMAIL_VERIFICATION',
    expiresAt: expiresAt.toISOString(),
    usedAt: '',
    attempts: 0,
    verificationTokenHash: '',
    verificationTokenExpiresAt: '',
    appointmentId: '',
    createdAt: now_().toISOString()
  });
  return { code: code, expiresAt: expiresAt, identifier: identifier };
}
