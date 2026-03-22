import { handleTeacherAccountsRequest } from '../../server/teacher-accounts.mjs';

export default async function handler(req, res) {
  const result = await handleTeacherAccountsRequest({
    method: req.method,
    headers: req.headers,
    body: req.body,
    env: process.env
  });

  res.statusCode = result.status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(result.body));
}
