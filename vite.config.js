import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig(({ mode }) => {
  // Load environment variables for server-side Node.js execution
  const env = loadEnv(mode, process.cwd(), '');
  if (env.OPENROUTER_API_KEY) {
    process.env.OPENROUTER_API_KEY = env.OPENROUTER_API_KEY;
  } else if (env.VITE_OPENROUTER_API_KEY) {
    process.env.OPENROUTER_API_KEY = env.VITE_OPENROUTER_API_KEY;
  }

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'ats-server-dev-middleware',
        configureServer(server) {
          server.middlewares.use('/api/ats/ai', async (req, res, next) => {
            if (req.method === 'POST') {
              let rawBody = '';
              req.on('data', (chunk) => {
                rawBody += chunk;
              });
              req.on('end', async () => {
                try {
                  const { systemPrompt, userPrompt, userId } = JSON.parse(rawBody || '{}');
                  const { callOpenRouterServer, checkRateLimit } = await import('./api/ats/openrouter-client.js');

                  const rateCheck = checkRateLimit(userId || 'dev-local');
                  if (!rateCheck.allowed) {
                    res.statusCode = 429;
                    res.setHeader('Content-Type', 'application/json');
                    return res.end(JSON.stringify({ error: 'Daily rate limit reached.', rateLimited: true }));
                  }

                  const data = await callOpenRouterServer(systemPrompt, userPrompt);
                  res.statusCode = data ? 200 : 503;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ success: Boolean(data), data }));
                } catch (err) {
                  res.statusCode = 500;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: err.message, data: null }));
                }
              });
            } else {
              next();
            }
          });
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  };
})