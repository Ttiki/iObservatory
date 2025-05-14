export default ({ env }) => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  app: {
    keys: env.array('APP_KEYS'),
  },
  emitErrors: false,
  url: env('PUBLIC_URL', 'https://localhost/strapi/'),
  proxy: env.bool('IS_PROXIED', true),
});