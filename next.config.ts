import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    serverExternalPackages: ['@copilotkit/runtime', 'hono'],
    typescript: {
        // HttpAgent type mismatch with CopilotRuntime — pending upstream fix in @copilotkit/runtime
        ignoreBuildErrors: true,
    },
    allowedDevOrigins: ['127.0.0.1'],
};

export default nextConfig;
