// Helpers that turn "ECONNREFUSED"-style failures into actionable messages, mainly for Supabase setups.

export function inspectDatabaseUrl(raw) {
  const info = { host: null, port: null, user: null, kind: 'unknown', isSupabase: false, problems: [] };
  const url = String(raw ?? '').trim();
  if (!url) { info.problems.push('DATABASE_URL is empty.'); return info; }

  if (/\[YOUR[-_ ]?PASSWORD\]/i.test(url) || /<password>/i.test(url)) {
    info.problems.push('The URL still contains the [YOUR-PASSWORD] placeholder - replace it with your real database password (no brackets).');
  }
  let u;
  try {
    u = new URL(url);
  } catch {
    info.problems.push('The URL could not be parsed. If the password has special characters (@ # / : ? %) URL-encode them, e.g. @ becomes %40.');
    return info;
  }
  if (!/^postgres(ql)?:$/.test(u.protocol)) info.problems.push('The URL must start with postgresql:// or postgres://');

  info.host = u.hostname;
  info.port = Number(u.port) || 5432;
  info.user = decodeURIComponent(u.username);
  info.isSupabase = /\.supabase\.(co|com)$/.test(u.hostname);

  if (/^db\.[a-z0-9]+\.supabase\.co$/.test(u.hostname)) {
    info.kind = 'direct';
    info.problems.push('This is the Supabase DIRECT connection, which is IPv6-only. Render/most free hosts are IPv4 and will fail. In Supabase click Connect and copy the "Session pooler" URI (host aws-…pooler.supabase.com) instead.');
  } else if (/\.pooler\.supabase\.com$/.test(u.hostname)) {
    info.kind = info.port === 6543 ? 'transaction-pooler' : 'session-pooler';
    if (!info.user.startsWith('postgres.')) {
      info.problems.push(`Pooler connections need the username "postgres.<project-ref>" (you have "${info.user}"). Copy the URI from Supabase's Connect dialog rather than editing it.`);
    }
  } else if (info.host) {
    info.kind = 'other';
  }
  if (!u.password) info.problems.push('The URL has no password.');
  return info;
}

// Wraps a driver error with a hint. Original message is always kept.
export function explainConnectionError(err, rawUrl) {
  const info = inspectDatabaseUrl(rawUrl);
  const hints = [...info.problems];
  const msg = String(err?.message ?? err);
  const code = err?.code;

  if (code === 'ENOTFOUND') hints.push(`Host "${info.host}" does not exist - re-copy the connection string from Supabase (Connect button).`);
  else if (code === 'ENETUNREACH' || code === 'EHOSTUNREACH') hints.push('The host is unreachable - typically IPv6-only direct connection from an IPv4 network. Use the Session pooler URI.');
  else if (code === 'ECONNREFUSED') hints.push(`Nothing is listening at ${info.host}:${info.port}. Check the host/port, and that the Supabase project is not paused (free projects pause after a week idle).`);
  else if (code === 'ETIMEDOUT') hints.push('Connection timed out - a firewall/VPN may be blocking outbound port ' + info.port + ', or the project is paused.');
  else if (code === '28P01' || /password authentication failed/i.test(msg)) hints.push('Wrong database password. In Supabase: Project Settings -> Database -> Reset database password, then rebuild the URI.');
  else if (/tenant or user not found/i.test(msg)) hints.push('Supabase pooler does not recognise the user/project. The username must be postgres.<project-ref>, and the pooler region host must match your project.');
  else if (/SSL|self.signed|certificate/i.test(msg)) hints.push('SSL problem - set DATABASE_SSL=true (it is automatic for supabase.co / supabase.com hosts).');
  else if (/too many (connections|clients)|remaining connection slots/i.test(msg)) hints.push('Too many connections - lower DATABASE_POOL_MAX (e.g. 5).');

  const e = new Error(`Database connection failed: ${msg}${hints.length ? '\n  -> ' + hints.join('\n  -> ') : ''}`);
  e.cause = err;
  return e;
}
