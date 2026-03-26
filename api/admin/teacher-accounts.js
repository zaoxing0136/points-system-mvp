import { handleTeacherAccountsRequest } from '../../server/teacher-accounts.mjs';

async function normalizeRequestBody(req) {
  if (!req || req.method !== 'POST') {
    return null;
  }

  if (req.body && typeof req.body === 'object') {
    return req.body;
  }

  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch (_error) {
      return null;
    }
  }

  if (typeof req.on !== 'function') {
    return null;
  }

  return new Promise(function (resolve, reject) {
    let raw = '';
    req.on('data', function (chunk) {
      raw += chunk;
    });
    req.on('end', function () {
      if (!raw) {
        resolve(null);
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  const body = await normalizeRequestBody(req);
  const result = await handleTeacherAccountsRequest({
    method: req.method,
    headers: req.headers,
    body,
    env: process.env
  });

  res.statusCode = result.status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(result.body));
}
