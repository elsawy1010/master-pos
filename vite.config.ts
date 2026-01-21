import { defineConfig } from 'vite'
import { spawn } from 'child_process'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'
import netlify from '@netlify/vite-plugin-tanstack-start'

const config = defineConfig({
  plugins: [
    // devtools(),
    netlify(),
    // this is the plugin that enables path aliases
    viteTsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
    {
      name: 'socket-server-plugin',
      configureServer(_server) {
        console.log('[Socket.IO] Starting socket server on port 3001...')
        const proc = spawn('npx', ['tsx', 'watch', 'src/server/socket.ts'], {
          stdio: 'inherit',
          shell: true,
        })

        proc.on('error', (err) => {
          console.error('[Socket.IO] Failed to start server:', err)
        })

        process.on('SIGTERM', () => proc.kill())
        process.on('exit', () => proc.kill())
      },
    },
  ],
})

export default config
