import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';

describe('Security & Build Bundle Verification', () => {
  test('OpenRouter secret key does not appear in client source files', () => {
    const srcDir = path.resolve(process.cwd(), 'src');
    
    function scanFiles(dir) {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          scanFiles(fullPath);
        } else if (file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.ts') || file.endsWith('.tsx')) {
          const content = fs.readFileSync(fullPath, 'utf8');
          // Check for hardcoded OpenRouter secret key pattern
          assert.equal(
            /sk-or-v1-[a-f0-9]{64}/.test(content),
            false,
            `Found hardcoded OpenRouter secret key in client file: ${fullPath}`
          );
        }
      }
    }

    scanFiles(srcDir);
  });

  test('OpenRouter API key is NOT prefixed with VITE_ in .env', () => {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      assert.equal(
        /^VITE_OPENROUTER_API_KEY/m.test(content),
        false,
        'Found VITE_OPENROUTER_API_KEY in .env. It must be server-side OPENROUTER_API_KEY without VITE_ prefix to prevent bundle leakage.'
      );
    }
  });

  test('Dist build artifacts do not contain the OpenRouter secret key', () => {
    const distDir = path.resolve(process.cwd(), 'dist');
    if (!fs.existsSync(distDir)) {
      return; // If not built yet, skip
    }

    function scanDist(dir) {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          scanDist(fullPath);
        } else if (file.endsWith('.js')) {
          const content = fs.readFileSync(fullPath, 'utf8');
          assert.equal(
            /sk-or-v1-[a-f0-9]{64}/.test(content),
            false,
            `Found secret key in built distribution bundle: ${fullPath}`
          );
        }
      }
    }

    scanDist(distDir);
  });
});
