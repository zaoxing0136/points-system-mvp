import { defineConfig, loadEnv } from 'vite';
import { resolve } from 'node:path';
import { handleTeacherAccountsRequest } from './server/teacher-accounts.mjs';

function readRequestBody(req) {
  return new Promise(function (resolveBody, rejectBody) {
    let raw = '';
    req.on('data', function (chunk) {
      raw += chunk;
    });
    req.on('end', function () {
      if (!raw) {
        resolveBody(null);
        return;
      }
      try {
        resolveBody(JSON.parse(raw));
      } catch (error) {
        rejectBody(error);
      }
    });
    req.on('error', rejectBody);
  });
}

function teacherAccountsApiPlugin(env) {
  return {
    name: 'teacher-accounts-api',
    configureServer(server) {
      server.middlewares.use('/api/admin/teacher-accounts', async function (req, res, next) {
        try {
          const body = req.method === 'POST' ? await readRequestBody(req) : null;
          const result = await handleTeacherAccountsRequest({
            method: req.method,
            headers: req.headers,
            body,
            env
          });
          res.statusCode = result.status;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify(result.body));
        } catch (error) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ error: error.message || 'Teacher account API failed.' }));
        }
      });
    }
  };
}

export default defineConfig(function ({ mode }) {
  const env = loadEnv(mode, __dirname, '');

  return {
    envPrefix: 'VITE_',
    define: {
      __PUBLIC_SUPABASE_URL__: JSON.stringify(env.VITE_SUPABASE_URL || env.SUPABASE_URL || ''),
      __PUBLIC_SUPABASE_ANON_KEY__: JSON.stringify(env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || '')
    },
    plugins: [teacherAccountsApiPlugin(env)],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'index.html'),
          login: resolve(__dirname, 'login.html'),
          teacher: resolve(__dirname, 'teacher.html'),
          display: resolve(__dirname, 'display.html'),
          admin: resolve(__dirname, 'admin.html'),
          students: resolve(__dirname, 'students.html'),
          classes: resolve(__dirname, 'classes.html')
        }
      }
    }
  };
});
