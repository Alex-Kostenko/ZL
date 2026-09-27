import next from '@ml/eslint-config/next';

const config = [...next, { settings: { next: { rootDir: import.meta.dirname } } }];

export default config;
