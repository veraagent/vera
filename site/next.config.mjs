/** Pages are prerendered; the Vera API runs as Node route handlers under /v1, /health and /.well-known. */
export default {
  images: { unoptimized: true },
  serverExternalPackages: ['@solana/web3.js'],
  async rewrites() {
    return [{ source: '/.well-known/vera.json', destination: '/well-known/vera.json' }];
  },
  async headers() {
    const cors = [
      { key: 'Access-Control-Allow-Origin', value: '*' },
      { key: 'Access-Control-Allow-Methods', value: 'GET,POST,OPTIONS' },
      { key: 'Access-Control-Allow-Headers', value: 'content-type,x-api-key' },
    ];
    return [{ source: '/v1/:path*', headers: cors }, { source: '/.well-known/:path*', headers: cors }];
  },
};
